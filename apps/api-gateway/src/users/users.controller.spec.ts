import { Test } from '@nestjs/testing';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersProxyService } from './users-proxy.service';
import { UsersController } from './users.controller';

describe('UsersController', () => {
  const proxy = {
    list: jest.fn(),
    findOne: jest.fn(),
    revealEmail: jest.fn(),
  };

  let controller: UsersController;

  beforeEach(async () => {
    jest.clearAllMocks();

    const moduleRef = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersProxyService, useValue: proxy }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = moduleRef.get(UsersController);
  });

  it('is protected by the JWT guard', () => {
    const guards = Reflect.getMetadata('__guards__', UsersController) ?? [];
    expect(guards).toContain(JwtAuthGuard);
  });

  it('forwards the query to the microservice untouched', async () => {
    proxy.list.mockResolvedValue({ data: [], meta: {} });

    await controller.list({ page: 2, perPage: 5 });

    expect(proxy.list).toHaveBeenCalledWith({ page: 2, perPage: 5 });
  });

  it('forwards a single-user lookup', async () => {
    proxy.findOne.mockResolvedValue({ id: 1 });

    await expect(controller.findOne(1)).resolves.toEqual({ id: 1 });
    expect(proxy.findOne).toHaveBeenCalledWith(1);
  });

  it('forwards an email reveal', async () => {
    proxy.revealEmail.mockResolvedValue({ id: 1, email: 'a@b.c' });

    await expect(controller.revealEmail(1)).resolves.toEqual({ id: 1, email: 'a@b.c' });
    expect(proxy.revealEmail).toHaveBeenCalledWith(1);
  });
});
