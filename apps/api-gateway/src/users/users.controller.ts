import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiNotFoundResponse,
} from '@nestjs/swagger';

import { Paginated, PublicUser, RevealedEmail } from '@app/contracts';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ListUsersDto } from './dto/list-users.dto';
import {
  ErrorResponseDto,
  PaginatedUsersDto,
  PublicUserDto,
  RevealedEmailDto,
} from './dto/user-response.dto';
import { UsersProxyService } from './users-proxy.service';

/**
 * Public HTTP surface. Every route is behind the JWT guard, so an unauthorised
 * caller gets 401 before any business rule is even consulted.
 */
@ApiTags('users')
@ApiBearerAuth('access-token')
@ApiUnauthorizedResponse({
  description: 'Missing or expired bearer token.',
  type: ErrorResponseDto,
})
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly users: UsersProxyService) {}

  @Get()
  @ApiOperation({
    summary: 'List users with masked emails',
    description:
      'Returns users whose first name starts with "G" or last name starts with "W". The rule is applied inside the microservice; this endpoint only forwards the request.',
  })
  @ApiOkResponse({ type: PaginatedUsersDto })
  list(@Query() query: ListUsersDto): Promise<Paginated<PublicUser>> {
    return this.users.list(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Fetch one user, masked' })
  @ApiOkResponse({ type: PublicUserDto })
  @ApiNotFoundResponse({
    description: 'No such user, **or** the user falls outside the filtered set.',
    type: ErrorResponseDto,
  })
  findOne(@Param('id', ParseIntPipe) id: number): Promise<PublicUser> {
    return this.users.findOne(id);
  }

  /** Releases the full address for a single user, on demand. */
  @Get(':id/email')
  @ApiOperation({
    summary: 'Reveal one full email address',
    description:
      'The only route that returns a real address, and it returns exactly one. Callers cannot obtain the full set in a single request.',
  })
  @ApiOkResponse({ type: RevealedEmailDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  revealEmail(@Param('id', ParseIntPipe) id: number): Promise<RevealedEmail> {
    return this.users.revealEmail(id);
  }
}
