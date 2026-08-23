/** A user exactly as the upstream source returns it. Never leaves the microservice. */
export interface RawUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  avatar: string;
}

/**
 * The public shape of a user. `email` is masked; the full address is only ever
 * released through the dedicated reveal endpoint.
 */
export interface PublicUser {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  maskedEmail: string;
  avatar: string;
}

export interface RevealedEmail {
  id: number;
  email: string;
}
