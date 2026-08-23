import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { ListUsersQuery, Paginated, PublicUser, RawUser, RevealedEmail } from '@app/contracts';
import { maskEmail } from './masking';
import { USERS_SOURCE, UsersSource } from './sources/users-source.interface';

const DEFAULT_PAGE = 1;
const DEFAULT_PER_PAGE = 10;
const MAX_PER_PAGE = 100;

/**
 * Every rule the assignment cares about lives here, inside the microservice:
 * which users qualify, how an address is masked, and how a page is cut. None of
 * it is reachable from a browser - the gateway only forwards a request and the
 * Next.js layer only renders what comes back.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@Inject(USERS_SOURCE) private readonly source: UsersSource) {}

  /**
   * The assignment rule: keep users whose **first** name starts with "G" or
   * whose **last** name starts with "W". Case-insensitive, and tolerant of the
   * leading whitespace that creeps into upstream data.
   */
  matchesBusinessFilter(user: RawUser): boolean {
    const first = (user.first_name ?? '').trim().toUpperCase();
    const last = (user.last_name ?? '').trim().toUpperCase();
    return first.startsWith('G') || last.startsWith('W');
  }

  async list(query: ListUsersQuery = {}): Promise<Paginated<PublicUser>> {
    const filtered = query.filtered ?? true;
    const page = this.normalisePage(query.page);
    const perPage = this.normalisePerPage(query.perPage);

    const all = await this.source.fetchAll();
    const matching = filtered ? all.filter((user) => this.matchesBusinessFilter(user)) : all;

    const total = matching.length;
    const totalPages = total === 0 ? 0 : Math.ceil(total / perPage);
    const start = (page - 1) * perPage;
    const slice = matching.slice(start, start + perPage);

    this.logger.log(
      `list page=${page} perPage=${perPage} filtered=${filtered} matched=${total}/${all.length}`,
    );

    return {
      data: slice.map((user) => this.toPublicUser(user)),
      meta: { page, perPage, total, totalPages },
    };
  }

  async findOne(id: number): Promise<PublicUser> {
    return this.toPublicUser(await this.requireUser(id));
  }

  /**
   * Releases one full address, for one user, on an explicit request. Separating
   * this from `list` means the complete set of addresses is never sitting in a
   * response payload waiting to be scraped.
   */
  async revealEmail(id: number): Promise<RevealedEmail> {
    const user = await this.requireUser(id);
    this.logger.log(`Email reveal requested for user ${id}`);
    return { id: user.id, email: user.email };
  }

  private async requireUser(id: number): Promise<RawUser> {
    const all = await this.source.fetchAll();
    const user = all.find((candidate) => candidate.id === Number(id));

    if (!user || !this.matchesBusinessFilter(user)) {
      // A user outside the filtered set is treated as non-existent so the
      // endpoint cannot be walked to enumerate the whole directory.
      throw new NotFoundException(`User ${id} not found`);
    }

    return user;
  }

  private toPublicUser(user: RawUser): PublicUser {
    const firstName = (user.first_name ?? '').trim();
    const lastName = (user.last_name ?? '').trim();

    return {
      id: user.id,
      firstName,
      lastName,
      fullName: [firstName, lastName].filter(Boolean).join(' '),
      maskedEmail: maskEmail(user.email),
      avatar: user.avatar,
    };
  }

  private normalisePage(value?: number): number {
    const page = Number(value);
    return Number.isFinite(page) && page >= 1 ? Math.floor(page) : DEFAULT_PAGE;
  }

  private normalisePerPage(value?: number): number {
    const perPage = Number(value);
    if (!Number.isFinite(perPage) || perPage < 1) return DEFAULT_PER_PAGE;
    return Math.min(Math.floor(perPage), MAX_PER_PAGE);
  }
}
