import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';

import {
  ListUsersQuery,
  Paginated,
  PublicUser,
  RevealedEmail,
  USERS_PATTERNS,
} from '@app/contracts';
import { UsersService } from './users.service';

/**
 * Transport-level entry point. It speaks message patterns rather than HTTP
 * routes - this process is not reachable from the internet, only from the
 * gateway over the internal TCP transport.
 */
@Controller()
export class UsersMessageController {
  constructor(private readonly users: UsersService) {}

  @MessagePattern(USERS_PATTERNS.LIST)
  list(@Payload() query: ListUsersQuery): Promise<Paginated<PublicUser>> {
    return this.users.list(query ?? {});
  }

  @MessagePattern(USERS_PATTERNS.FIND_ONE)
  findOne(@Payload() payload: { id: number }): Promise<PublicUser> {
    return this.users.findOne(payload.id);
  }

  @MessagePattern(USERS_PATTERNS.REVEAL_EMAIL)
  revealEmail(@Payload() payload: { id: number }): Promise<RevealedEmail> {
    return this.users.revealEmail(payload.id);
  }

  @MessagePattern(USERS_PATTERNS.HEALTH)
  health(): { status: string } {
    return { status: 'ok' };
  }
}
