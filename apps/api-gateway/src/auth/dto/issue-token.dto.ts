import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Body of POST /auth/token. The caller is a trusted server (the Next.js BFF),
 * not a browser, so it presents a shared service key in the x-api-key header
 * and describes the end user it is acting for. That identity is stamped into
 * the JWT purely so downstream logs can attribute a request.
 */
export class IssueTokenDto {
  @ApiProperty({
    example: 'ada@example.com',
    description: 'The end user this token acts for.',
  })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiPropertyOptional({ example: 'Ada Lovelace' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;
}
