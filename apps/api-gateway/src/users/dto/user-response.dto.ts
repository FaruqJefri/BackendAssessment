import { ApiProperty } from '@nestjs/swagger';

/** Documentation-only mirrors of the contracts the microservice returns. */
export class PublicUserDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'George' })
  firstName!: string;

  @ApiProperty({ example: 'Bluth' })
  lastName!: string;

  @ApiProperty({ example: 'George Bluth' })
  fullName!: string;

  @ApiProperty({
    example: 'ge**********@reqres.in',
    description:
      'The address with its local part obscured. The real address is never present in a list response.',
  })
  maskedEmail!: string;

  @ApiProperty({ example: 'https://reqres.in/img/faces/1-image.jpg' })
  avatar!: string;
}

export class PageMetaDto {
  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  perPage!: number;

  @ApiProperty({ example: 4, description: 'Total users matching the business filter.' })
  total!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}

export class PaginatedUsersDto {
  @ApiProperty({ type: [PublicUserDto] })
  data!: PublicUserDto[];

  @ApiProperty({ type: PageMetaDto })
  meta!: PageMetaDto;
}

export class RevealedEmailDto {
  @ApiProperty({ example: 2 })
  id!: number;

  @ApiProperty({ example: 'janet.weaver@reqres.in' })
  email!: string;
}

export class ErrorResponseDto {
  @ApiProperty({ example: 404 })
  statusCode!: number;

  @ApiProperty({ example: 'User 4 not found' })
  message!: string;
}
