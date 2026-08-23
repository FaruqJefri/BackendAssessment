import { maskEmail } from './masking';

describe('maskEmail', () => {
  it('keeps the first two characters and the domain', () => {
    expect(maskEmail('george.bluth@reqres.in')).toBe('ge**********@reqres.in');
  });

  it('preserves the local-part length so address sizes are not implied to be equal', () => {
    const masked = maskEmail('janet.weaver@reqres.in');
    expect(masked.split('@')[0]).toHaveLength('janet.weaver'.length);
  });

  it('never emits the original local part', () => {
    expect(maskEmail('emma.wong@reqres.in')).not.toContain('wong');
  });

  it('reveals only one character for a two-character mailbox', () => {
    expect(maskEmail('ab@x.io')).toBe('a*@x.io');
  });

  it('reveals nothing for a single-character mailbox', () => {
    expect(maskEmail('a@x.io')).toBe('*@x.io');
  });

  it('masks the whole value when there is no at-sign to anchor on', () => {
    expect(maskEmail('not-an-email')).toBe('************');
  });

  it('masks against the last at-sign', () => {
    expect(maskEmail('weird@name@reqres.in')).toBe('we********@reqres.in');
  });

  it.each([
    ['', ''],
    [null, ''],
    [undefined, ''],
  ])('returns an empty string for %p', (input, expected) => {
    expect(maskEmail(input as unknown as string)).toBe(expected);
  });
});
