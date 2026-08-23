import { ArgumentsHost, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';

import { RpcHttpExceptionFilter } from './rpc-exception.filter';

describe('RpcHttpExceptionFilter', () => {
  const json = jest.fn();
  const status = jest.fn(() => ({ json }));
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;

  const filter = new RpcHttpExceptionFilter();

  beforeEach(() => jest.clearAllMocks());

  it('preserves the status of a real HttpException', () => {
    filter.catch(new NotFoundException('User 4 not found'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(json).toHaveBeenCalledWith({ statusCode: 404, message: 'User 4 not found' });
  });

  it('restores the status of an exception serialised across the RPC boundary', () => {
    filter.catch({ status: 404, message: 'User 4 not found' }, host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({ statusCode: 404, message: 'User 4 not found' });
  });

  it('joins validation messages into a single line', () => {
    filter.catch(
      new HttpException({ message: ['page must be an integer', 'page must not be 0'] }, 400),
      host,
    );

    expect(json).toHaveBeenCalledWith({
      statusCode: 400,
      message: 'page must be an integer, page must not be 0',
    });
  });

  it('does not leak details of an unrecognised failure', () => {
    filter.catch(new Error('connect ECONNREFUSED 127.0.0.1:4001'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Internal server error',
    });
  });

  it('ignores an out-of-range status supplied by the payload', () => {
    filter.catch({ status: 999, message: 'nope' }, host);
    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
  });
});
