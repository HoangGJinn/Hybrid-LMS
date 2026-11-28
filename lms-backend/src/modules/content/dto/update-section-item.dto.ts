import { Transform } from 'class-transformer'
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

/** Partial update of one item: only the sent fields change. */
export class UpdateSectionItemDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  readonly title?: string

  /** Only a VIDEO item has a link, and it must stay a valid YouTube link. */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly externalUrl?: string | null

  @IsOptional()
  @IsBoolean()
  readonly isVisible?: boolean
}