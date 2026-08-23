/**
 * Message patterns spoken over the TCP transport between the API gateway and
 * the users microservice. Kept in a shared library so a rename can never leave
 * one side of the wire talking to itself.
 */
export const USERS_PATTERNS = {
  LIST: 'users.list',
  FIND_ONE: 'users.findOne',
  REVEAL_EMAIL: 'users.revealEmail',
  HEALTH: 'users.health',
} as const;

export const USERS_SERVICE = 'USERS_SERVICE';
