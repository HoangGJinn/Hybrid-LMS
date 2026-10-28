import { Transform } from 'class-transformer'
import { IsString, MaxLength, MinLength } from 'class-validator'

/** Payload to append a new section to a class. */
export class CreateSectionDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  readonly title: string
}
