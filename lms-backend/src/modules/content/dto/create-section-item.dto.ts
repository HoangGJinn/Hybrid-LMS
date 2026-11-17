import { Transform } from 'class-transformer'
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator'
import { ItemType } from '../enums/item-type.enum.js'

/** One item appended to a section. The id is chosen by the client so the UI never has to wait for it. */
export class CreateSectionItemDto {
  @IsUUID()
  readonly id: string

  @IsEnum(ItemType)
  readonly itemType: ItemType

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  readonly title: string

  @IsOptional()
  @IsString()
  @MaxLength(500)
  readonly externalUrl?: string | null

  @IsOptional()
  @IsUUID()
  readonly documentId?: string | null

  @IsOptional()
  @IsUUID()
  readonly assignmentId?: string | null

  @IsOptional()
  @IsUUID()
  readonly examId?: string | null
}