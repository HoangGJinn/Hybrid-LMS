import { IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator'
import { ItemType } from '../enums/item-type.enum.js'

/** One item of a section as sent by the course editor. */
export class SaveSectionItemDto {
  @IsUUID()
  readonly id: string

  @IsEnum(ItemType)
  readonly itemType: ItemType

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  readonly title: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly externalUrl?: string | null

  @IsInt()
  @Min(0)
  readonly orderIndex: number

  @IsOptional()
  @IsUUID()
  readonly documentId?: string | null

  @IsOptional()
  @IsUUID()
  readonly assignmentId?: string | null
}
