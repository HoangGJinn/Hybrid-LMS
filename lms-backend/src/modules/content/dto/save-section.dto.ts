import { Type } from 'class-transformer'
import {
  IsArray,
  IsInt,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator'
import { SaveSectionItemDto } from './save-section-item.dto.js'

/** One section (with its items) as sent by the course editor. */
export class SaveSectionDto {
  @IsUUID()
  readonly id: string

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  readonly title: string

  @IsInt()
  @Min(0)
  readonly orderIndex: number

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveSectionItemDto)
  readonly items: SaveSectionItemDto[]
}
