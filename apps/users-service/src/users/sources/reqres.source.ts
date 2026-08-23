import { HttpService } from '@nestjs/axios';
import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosRequestConfig } from 'axios';
import { firstValueFrom } from 'rxjs';

import { RawUser } from '@app/contracts';
import { UsersSource } from './users-source.interface';

interface ReqresPage {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  data: RawUser[];
}

/**
 * Reads users from the reqres.in REST API.
 *
 * The upstream response is paginated, so `fetchAll` walks every page: it reads
 * page 1, learns `total_pages` from the envelope, then requests the remainder
 * concurrently and flattens the result. Pages are never assumed to be a fixed
 * count.
 */
@Injectable()
export class ReqresUsersSource implements UsersSource {
  private readonly logger = new Logger(ReqresUsersSource.name);
  private readonly baseUrl: string;
  private readonly apiKey?: string;
  private readonly perPage: number;
  private readonly maxPages: number;

  constructor(
    private readonly http: HttpService,
    config: ConfigService,
  ) {
    this.baseUrl = config.get<string>('REQRES_BASE_URL', 'https://reqres.in/api');
    this.apiKey = config.get<string>('REQRES_API_KEY');
    this.perPage = Number(config.get('REQRES_PER_PAGE', 6));
    // Guard rail: an upstream that reports a nonsense total_pages must not be
    // able to turn one inbound request into thousands of outbound ones.
    this.maxPages = Number(config.get('REQRES_MAX_PAGES', 50));
  }

  async fetchAll(): Promise<RawUser[]> {
    const first = await this.fetchPage(1);
    const totalPages = Math.min(first.total_pages || 1, this.maxPages);

    if (totalPages > 1) {
      const rest = await Promise.all(
        Array.from({ length: totalPages - 1 }, (_, i) => this.fetchPage(i + 2)),
      );
      return [first, ...rest].flatMap((page) => page.data ?? []);
    }

    return first.data ?? [];
  }

  private async fetchPage(page: number): Promise<ReqresPage> {
    const options: AxiosRequestConfig = {
      params: { page, per_page: this.perPage },
      timeout: 10_000,
      headers: this.apiKey ? { 'x-api-key': this.apiKey } : undefined,
    };

    try {
      const response = await firstValueFrom(
        this.http.get<ReqresPage>(`${this.baseUrl}/users`, options),
      );
      return response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Upstream page ${page} failed: ${message}`);
      throw new ServiceUnavailableException('Upstream user directory is unavailable');
    }
  }
}
