import { RawUser } from '@app/contracts';

export const USERS_SOURCE = 'USERS_SOURCE';

/**
 * Where raw user records come from. The service layer depends on this
 * interface only, so swapping reqres.in for a real database (or for the
 * bundled dataset used in tests / offline runs) touches nothing else.
 */
export interface UsersSource {
  /** Every record from every upstream page, already traversed and flattened. */
  fetchAll(): Promise<RawUser[]>;
}
