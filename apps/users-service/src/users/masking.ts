/**
 * Mask a mailbox so it is recognisable but not usable.
 *
 *   george.bluth@reqres.in -> ge**********@reqres.in
 *   ab@x.io                -> a*@x.io
 *   a@x.io                 -> *@x.io
 *
 * The masked string keeps the original local-part length so the UI does not
 * imply every address is the same size, and the domain is preserved because it
 * carries no personal information on its own.
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';

  const at = email.lastIndexOf('@');
  if (at <= 0) {
    // Not an address we recognise - mask the whole thing rather than leak it.
    return '*'.repeat(email.length);
  }

  const local = email.slice(0, at);
  const domain = email.slice(at);
  const visible = local.length > 2 ? 2 : local.length - 1;

  return local.slice(0, visible) + '*'.repeat(local.length - visible) + domain;
}
