import { ApiProperty } from '@nestjs/swagger';

export class IssuedTokenDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({ example: 900, description: 'Lifetime in seconds.' })
  expiresIn!: number;
}
