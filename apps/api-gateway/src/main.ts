import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { RpcHttpExceptionFilter } from './common/filters/rpc-exception.filter';
import { setupSwagger } from './swagger';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const port = Number(process.env.PORT ?? 4000);

  app.use(helmet());
  app.enableShutdownHooks();

  // Only the Next.js server is expected to call this API, and it calls from the
  // server side, so CORS stays closed unless an origin is explicitly allowed.
  const allowedOrigins = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (allowedOrigins.length > 0) {
    app.enableCors({ origin: allowedOrigins, credentials: true });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );
  app.useGlobalFilters(new RpcHttpExceptionFilter());

  setupSwagger(app);

  await app.listen(port);
  Logger.log(`API gateway listening on http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();
