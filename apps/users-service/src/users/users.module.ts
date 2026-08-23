import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { LocalUsersSource } from './sources/local.source';
import { ReqresUsersSource } from './sources/reqres.source';
import { USERS_SOURCE } from './sources/users-source.interface';
import { UsersMessageController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [HttpModule],
  controllers: [UsersMessageController],
  providers: [
    UsersService,
    ReqresUsersSource,
    LocalUsersSource,
    {
      // USERS_SOURCE=reqres talks to the live API and needs REQRES_API_KEY.
      // USERS_SOURCE=local serves the identical dataset from memory.
      provide: USERS_SOURCE,
      inject: [ConfigService, ReqresUsersSource, LocalUsersSource],
      useFactory: (
        config: ConfigService,
        reqres: ReqresUsersSource,
        local: LocalUsersSource,
      ) => (config.get<string>('USERS_SOURCE', 'local') === 'reqres' ? reqres : local),
    },
  ],
  exports: [UsersService],
})
export class UsersModule {}
