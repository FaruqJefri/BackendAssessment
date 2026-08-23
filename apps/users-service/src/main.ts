import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { DomainRpcExceptionFilter } from './common/filters/domain-exception.filter';
import { UsersServiceModule } from './users-service.module';

/**
 * Bootstraps a pure microservice: no HTTP listener, no public surface. It binds
 * to 127.0.0.1 by default so the only thing that can reach it is the gateway
 * running alongside it.
 */
async function bootstrap(): Promise<void> {
  const host = process.env.USERS_SERVICE_HOST ?? '127.0.0.1';
  const port = Number(process.env.USERS_SERVICE_PORT ?? 4001);

  const app = await NestFactory.createMicroservice<MicroserviceOptions>(UsersServiceModule, {
    transport: Transport.TCP,
    options: { host, port },
  });

  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.useGlobalFilters(new DomainRpcExceptionFilter());

  await app.listen();
  Logger.log(`Users microservice listening on tcp://${host}:${port}`, 'Bootstrap');
}

void bootstrap();
