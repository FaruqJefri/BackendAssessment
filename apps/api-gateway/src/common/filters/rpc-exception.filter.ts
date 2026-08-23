import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

/**
 * An exception thrown inside the microservice arrives here as a plain object,
 * not as an HttpException. This filter restores the intended status code so a
 * missing user is a 404 at the edge rather than a blanket 500, while making
 * sure no internal stack detail is echoed back to the caller.
 */
@Catch()
export class RpcHttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(RpcHttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, message } = this.describe(exception);

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    response.status(status).json({ statusCode: status, message });
  }

  private describe(exception: unknown): { status: number; message: string } {
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ?? exception.message);

      return {
        status: exception.getStatus(),
        message: Array.isArray(message) ? message.join(', ') : message,
      };
    }

    // Shape produced by Nest when an HttpException crosses the RPC boundary.
    const candidate = exception as { status?: number; statusCode?: number; message?: string };
    const status = Number(candidate?.status ?? candidate?.statusCode);

    if (Number.isInteger(status) && status >= 400 && status <= 599) {
      return { status, message: candidate.message ?? 'Request failed' };
    }

    return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
  }
}
