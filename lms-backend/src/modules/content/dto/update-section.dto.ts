import { Transform } from 'class-transformer'
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator'

/** Partial update of one section: every field is optional, only the sent ones change. */
export class UpdateSectionDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  readonly title?: string

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  readonly description?: string | null

  @IsOptional()
  @IsBoolean()
  readonly isVisible?: boolean
}