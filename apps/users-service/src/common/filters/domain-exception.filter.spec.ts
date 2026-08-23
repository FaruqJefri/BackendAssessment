import { ArgumentsHost, HttpException, NotFoundException } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';

import { DomainRpcExceptionFilter } from './domain-exception.filter';

const host = {
  getArgByIndex: () => ({ id: 4 }),
} as unknown as ArgumentsHost;

async function thrownValue(exception: unknown): Promise<unknown> {
  const filter = new DomainRpcExceptionFilter();
  return firstValueFrom(filter.catch(exception, host)).catch((error) => error);
}

describe('DomainRpcExceptionFilter', () => {
  it('carries an HttpException status across the wire', async () => {
    await expect(thrownValue(new NotFoundException('User 4 not found'))).resolves.toEqual({
      statusCode: 404,
      message: 'User 4 not found',
    });
  });

  it('flattens an array of validation messages', async () => {
    const exception = new HttpException({ message: ['bad page', 'bad perPage'] }, 400);

    await expect(thrownValue(exception)).resolves.toEqual({
      statusCode: 400,
      message: 'bad page, bad perPage',
    });
  });

  it('passes through an already-serialised RpcException payload', async () => {
    const exception = new RpcException({ statusCode: 409, message: 'Conflict' });

    await expect(thrownValue(exception)).resolves.toEqual({
      statusCode: 409,
      message: 'Conflict',
    });
  });

  it('treats a bare RpcException string as a bad request', async () => {
    await expect(thrownValue(new RpcException('nope'))).resolves.toEqual({
      statusCode: 400,
      message: 'nope',
    });
  });

  it('never leaks the detail of an unexpected failure', async () => {
    await expect(thrownValue(new Error('ECONNREFUSED 10.0.0.5:5432'))).resolves.toEqual({
      statusCode: 500,
      message: 'Internal server error',
    });
  });
});
