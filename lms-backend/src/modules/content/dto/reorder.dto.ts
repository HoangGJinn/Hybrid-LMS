import { ArrayUnique, IsArray, IsUUID } from 'class-validator'

/** New display order as a list of ids; ids that are left out keep their relative order after the listed ones. */
export class ReorderDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  readonly ids: string[]
}