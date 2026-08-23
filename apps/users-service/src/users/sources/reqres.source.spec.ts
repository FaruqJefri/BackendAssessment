import { HttpService } from '@nestjs/axios';
import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { of, throwError } from 'rxjs';

import { ReqresUsersSource } from './reqres.source';

const page = (n: number, totalPages: number, ids: number[]) => ({
  data: {
    page: n,
    per_page: 6,
    total: totalPages * 6,
    total_pages: totalPages,
    data: ids.map((id) => ({
      id,
      email: `user${id}@reqres.in`,
      first_name: `First${id}`,
      last_name: `Last${id}`,
      avatar: `https://reqres.in/img/faces/${id}-image.jpg`,
    })),
  },
});

const CONFIG: Record<string, unknown> = {
  REQRES_BASE_URL: 'https://reqres.in/api',
  REQRES_API_KEY: 'test-key',
  REQRES_PER_PAGE: 6,
  REQRES_MAX_PAGES: 50,
};

async function build(get: jest.Mock, overrides: Record<string, unknown> = {}) {
  const config = {
    get: (key: string, fallback?: unknown) => {
      const merged = { ...CONFIG, ...overrides };
      return key in merged ? merged[key] : fallback;
    },
  };

  const moduleRef = await Test.createTestingModule({
    providers: [
      ReqresUsersSource,
      { provide: HttpService, useValue: { get } },
      { provide: ConfigService, useValue: config },
    ],
  }).compile();

  return moduleRef.get(ReqresUsersSource);
}

describe('ReqresUsersSource', () => {
  it('traverses every page reported by the upstream envelope', async () => {
    const get = jest
      .fn()
      .mockReturnValueOnce(of(page(1, 3, [1, 2])))
      .mockReturnValueOnce(of(page(2, 3, [3, 4])))
      .mockReturnValueOnce(of(page(3, 3, [5, 6])));

    const source = await build(get);
    const users = await source.fetchAll();

    expect(get).toHaveBeenCalledTimes(3);
    expect(users.map((u) => u.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('requests page one first and learns the page count from the response', async () => {
    const get = jest.fn().mockReturnValue(of(page(1, 1, [1])));
    const source = await build(get);

    await source.fetchAll();

    expect(get).toHaveBeenCalledTimes(1);
    expect(get.mock.calls[0][1].params).toEqual({ page: 1, per_page: 6 });
  });

  it('sends the upstream api key header', async () => {
    const get = jest.fn().mockReturnValue(of(page(1, 1, [1])));
    const source = await build(get);

    await source.fetchAll();

    expect(get.mock.calls[0][1].headers).toEqual({ 'x-api-key': 'test-key' });
  });

  it('omits the header entirely when no key is configured', async () => {
    const get = jest.fn().mockReturnValue(of(page(1, 1, [1])));
    const source = await build(get, { REQRES_API_KEY: undefined });

    await source.fetchAll();

    expect(get.mock.calls[0][1].headers).toBeUndefined();
  });

  it('refuses to fan out beyond the configured page ceiling', async () => {
    const get = jest.fn().mockReturnValue(of(page(1, 9999, [1])));
    const source = await build(get, { REQRES_MAX_PAGES: 4 });

    await source.fetchAll();

    expect(get).toHaveBeenCalledTimes(4);
  });

  it('translates an upstream failure into a service-unavailable error', async () => {
    const get = jest.fn().mockReturnValue(throwError(() => new Error('ECONNREFUSED')));
    const source = await build(get);

    await expect(source.fetchAll()).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('tolerates a page with no data array', async () => {
    const get = jest.fn().mockReturnValue(of({ data: { total_pages: 1 } }));
    const source = await build(get);

    await expect(source.fetchAll()).resolves.toEqual([]);
  });
});
