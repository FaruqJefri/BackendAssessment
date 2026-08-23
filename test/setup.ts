import { Logger } from '@nestjs/common';

/**
 * Several suites deliberately drive failure paths. Their log output is expected,
 * so it is silenced here to keep a passing run readable - a real failure then
 * stands out instead of being buried.
 */
beforeAll(() => {
  jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
});
