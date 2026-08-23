import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { RawUser } from '@app/contracts';
import { USERS_SOURCE, UsersSource } from './sources/users-source.interface';
import { UsersService } from './users.service';

const user = (id: number, first: string, last: string): RawUser => ({
  id,
  email: `${first.toLowerCase()}.${last.toLowerCase()}@reqres.in`,
  first_name: first,
  last_name: last,
  avatar: `https://reqres.in/img/faces/${id}-image.jpg`,
});

const DATASET: RawUser[] = [
  user(1, 'George', 'Bluth'), // first name G
  user(2, 'Janet', 'Weaver'), // last name W
  user(3, 'Emma', 'Wong'), // last name W
  user(4, 'Eve', 'Holt'), // no match
  user(5, 'Charles', 'Morris'), // no match
  user(11, 'George', 'Edwards'), // first name G
  user(12, 'Rachel', 'Howell'), // no match - H, not W
];

class StubSource implements UsersSource {
  constructor(private readonly users: RawUser[] = DATASET) {}
  fetchAll = jest.fn(async () => this.users.map((u) => ({ ...u })));
}

async function buildService(source: UsersSource): Promise<UsersService> {
  const moduleRef = await Test.createTestingModule({
    providers: [UsersService, { provide: USERS_SOURCE, useValue: source }],
  }).compile();

  return moduleRef.get(UsersService);
}

describe('UsersService', () => {
  let service: UsersService;

  beforeEach(async () => {
    service = await buildService(new StubSource());
  });

  describe('matchesBusinessFilter', () => {
    it.each([
      ['George', 'Bluth', true],
      ['Janet', 'Weaver', true],
      ['gordon', 'smith', true],
      ['Emma', 'wong', true],
      ['Eve', 'Holt', false],
      ['Rachel', 'Howell', false],
    ])('%s %s -> %s', (first, last, expected) => {
      expect(service.matchesBusinessFilter(user(99, first, last))).toBe(expected);
    });

    it('ignores leading whitespace from the upstream payload', () => {
      expect(
        service.matchesBusinessFilter({ ...user(99, 'x', 'y'), first_name: '  Grace' }),
      ).toBe(true);
    });

    it('does not match a G or W that is not the leading character', () => {
      expect(service.matchesBusinessFilter(user(99, 'Angus', 'Brown'))).toBe(false);
    });
  });

  describe('list', () => {
    it('returns only users whose first name starts with G or last name starts with W', async () => {
      const result = await service.list();

      expect(result.data.map((u) => u.id)).toEqual([1, 2, 3, 11]);
      expect(result.meta.total).toBe(4);
    });

    it('masks every email it returns', async () => {
      const result = await service.list();

      expect(result.data.map((u) => u.maskedEmail)).toEqual([
        'ge**********@reqres.in',
        'ja**********@reqres.in',
        'em*******@reqres.in',
        'ge************@reqres.in',
      ]);
      result.data.forEach((u) => expect(u).not.toHaveProperty('email'));
    });

    it('returns the unfiltered set when filtering is explicitly disabled', async () => {
      const result = await service.list({ filtered: false });
      expect(result.meta.total).toBe(DATASET.length);
    });

    it('paginates the filtered set', async () => {
      const page1 = await service.list({ page: 1, perPage: 3 });
      const page2 = await service.list({ page: 2, perPage: 3 });

      expect(page1.data.map((u) => u.id)).toEqual([1, 2, 3]);
      expect(page2.data.map((u) => u.id)).toEqual([11]);
      expect(page2.meta).toEqual({ page: 2, perPage: 3, total: 4, totalPages: 2 });
    });

    it('returns an empty page rather than throwing when the page is past the end', async () => {
      const result = await service.list({ page: 99, perPage: 10 });
      expect(result.data).toEqual([]);
      expect(result.meta.totalPages).toBe(1);
    });

    it.each([
      [{ page: 0 }, 1],
      [{ page: -5 }, 1],
      [{ page: undefined }, 1],
    ])('clamps an invalid page %p to %i', async (query, expected) => {
      const result = await service.list(query);
      expect(result.meta.page).toBe(expected);
    });

    it('caps perPage so a caller cannot demand an unbounded page', async () => {
      const result = await service.list({ perPage: 5000 });
      expect(result.meta.perPage).toBe(100);
    });

    it('reports zero total pages for an empty result set', async () => {
      const empty = await buildService(new StubSource([user(4, 'Eve', 'Holt')]));
      const result = await empty.list();

      expect(result.data).toEqual([]);
      expect(result.meta.totalPages).toBe(0);
    });

    it('builds a full name from the trimmed parts', async () => {
      const result = await service.list();
      expect(result.data[0].fullName).toBe('George Bluth');
    });
  });

  describe('findOne', () => {
    it('returns a masked user that is inside the filtered set', async () => {
      const result = await service.findOne(2);
      expect(result.maskedEmail).toBe('ja**********@reqres.in');
    });

    it('rejects a user outside the filtered set so the directory cannot be enumerated', async () => {
      await expect(service.findOne(4)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('rejects an unknown id', async () => {
      await expect(service.findOne(999)).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('revealEmail', () => {
    it('returns the full address for a permitted user', async () => {
      await expect(service.revealEmail(1)).resolves.toEqual({
        id: 1,
        email: 'george.bluth@reqres.in',
      });
    });

    it('refuses to reveal an address outside the filtered set', async () => {
      await expect(service.revealEmail(5)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('accepts a numeric string id from the transport layer', async () => {
      await expect(service.revealEmail('1' as unknown as number)).resolves.toEqual({
        id: 1,
        email: 'george.bluth@reqres.in',
      });
    });
  });
});
