import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

import { USERS_SERVICE } from '@app/contracts';
import { UsersProxyService } from './users-proxy.service';
import { UsersController } from './users.controller';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: USERS_SERVICE,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService) => ({
          transport: Transport.TCP,
          options: {
            host: config.get<string>('USERS_SERVICE_HOST', '127.0.0.1'),
            port: Number(config.get('USERS_SERVICE_PORT', 4001)),
          },
        }),
      },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersProxyService],
})
export class UsersModule {}
