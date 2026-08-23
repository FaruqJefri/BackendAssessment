import { ArgumentsHost, Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { BaseRpcExceptionFilter, RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

export interface SerialisedDomainError {
  statusCode: number;
  message: string;
}

/**
 * Gives errors a defined shape on the wire.
 *
 * Nest flattens an unhandled exception when it crosses the TCP transport, which
 * turns a deliberate 404 into an opaque 500 at the edge. Serialising it here
 * means the gateway can restore the intended status without guessing - and that
 * anything we did not classify degrades to a bare 500 with no internal detail
 * attached.
 */
@Catch()
export class DomainRpcExceptionFilter extends BaseRpcExceptionFilter {
  private readonly logger = new Logger(DomainRpcExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): Observable<never> {
    return throwError(() => this.serialise(exception, host));
  }

  private serialise(exception: unknown, host: ArgumentsHost): SerialisedDomainError {
    if (exception instanceof HttpException) {
      const body = exception.getResponse();
      const message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ?? exception.message);

      return {
        statusCode: exception.getStatus(),
        message: Array.isArray(message) ? message.join(', ') : message,
      };
    }

    if (exception instanceof RpcException) {
      const error = exception.getError();
      if (typeof error === 'object' && error !== null && 'statusCode' in error) {
        return error as SerialisedDomainError;
      }
      return { statusCode: HttpStatus.BAD_REQUEST, message: String(error) };
    }

    this.logger.error(
      `Unhandled failure on pattern ${JSON.stringify(host.getArgByIndex(1) ?? {})}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    return { statusCode: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Internal server error' };
  }
}
