/**
 * Query accepted by the `users.list` message pattern.
 *
 * `filtered` is deliberately a server-side concern: the browser asks for "the
 * list", it never gets to describe the business rule that produces it.
 */
export interface ListUsersQuery {
  page?: number;
  perPage?: number;
  filtered?: boolean;
}
