import { Body, Controller, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiOperation,
  ApiOkResponse,
  ApiSecurity,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { AuthService, IssuedToken } from './auth.service';
import { IssuedTokenDto } from './dto/issued-token.dto';
import { IssueTokenDto } from './dto/issue-token.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /**
   * Server-to-server token exchange. A browser cannot call this usefully: it
   * would need the service key, which never leaves the Next.js server process.
   */
  @Post('token')
  @HttpCode(HttpStatus.OK)
  @ApiSecurity('service-key')
  @ApiOperation({
    summary: 'Exchange a service key for a short-lived access token',
    description:
      'Server-to-server only. The caller presents `x-api-key`, which is compared in constant time, and names the end user it is acting for so downstream logs can attribute the request.',
  })
  @ApiOkResponse({ type: IssuedTokenDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid service key.' })
  issueToken(@Headers('x-api-key') apiKey: string, @Body() body: IssueTokenDto): IssuedToken {
    this.auth.assertServiceKey(apiKey);
    return this.auth.issueToken(body);
  }
}
