import { Inject, Injectable, OnApplicationShutdown } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';

import {
  ListUsersQuery,
  Paginated,
  PublicUser,
  RevealedEmail,
  USERS_PATTERNS,
  USERS_SERVICE,
} from '@app/contracts';

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Thin translator between HTTP and the internal message transport. It holds no
 * business rules on purpose - filtering and masking belong to the microservice,
 * so this layer has nothing worth leaking.
 */
@Injectable()
export class UsersProxyService implements OnApplicationShutdown {
  constructor(@Inject(USERS_SERVICE) private readonly client: ClientProxy) {}

  list(query: ListUsersQuery): Promise<Paginated<PublicUser>> {
    return this.send<Paginated<PublicUser>>(USERS_PATTERNS.LIST, query);
  }

  findOne(id: number): Promise<PublicUser> {
    return this.send<PublicUser>(USERS_PATTERNS.FIND_ONE, { id });
  }

  revealEmail(id: number): Promise<RevealedEmail> {
    return this.send<RevealedEmail>(USERS_PATTERNS.REVEAL_EMAIL, { id });
  }

  private send<T>(pattern: string, payload: unknown): Promise<T> {
    return firstValueFrom(
      this.client.send<T>(pattern, payload).pipe(timeout(REQUEST_TIMEOUT_MS)),
    );
  }

  async onApplicationShutdown(): Promise<void> {
    await this.client.close();
  }
}
