import { INestApplication, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/**
 * Publishes the OpenAPI document at /docs.
 *
 * It is **off unless SWAGGER_ENABLED=true**, and the default for a production
 * NODE_ENV is off. An API description is a map of the attack surface: useful to
 * a developer, equally useful to anyone probing the service, so exposing it is
 * an explicit decision rather than a default.
 */
export function setupSwagger(app: INestApplication): void {
  const config = app.get(ConfigService);
  const enabled = config.get<string>('SWAGGER_ENABLED', 'true') === 'true';

  if (!enabled) {
    Logger.log('OpenAPI documentation is disabled', 'Swagger');
    return;
  }

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Zurich Portal — Core API')
      .setDescription(
        [
          'The core API gateway for the Zurich customer portal.',
          '',
          'Every `/users` route requires a bearer token obtained from `POST /auth/token`,',
          'which is itself a **server-to-server** exchange guarded by a service key. A',
          'browser cannot complete this flow, and is not meant to: the portal calls this',
          'API through the BFF, never directly.',
          '',
          'Emails are masked in every list response. The full address is released only by',
          '`GET /users/{id}/email`, one user at a time.',
        ].join('\n'),
      )
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'access-token')
      .addApiKey({ type: 'apiKey', name: 'x-api-key', in: 'header' }, 'service-key')
      .addTag('auth', 'Server-to-server token exchange')
      .addTag('users', 'Filtered directory with masked addresses')
      .addTag('health', 'Liveness')
      .build(),
  );

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'Zurich Portal — Core API',
  });

  Logger.log('OpenAPI documentation available at /docs', 'Swagger');
}
