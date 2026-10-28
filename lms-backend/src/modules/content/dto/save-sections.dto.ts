import { Type } from 'class-transformer'
import { IsArray, ValidateNested } from 'class-validator'
import { SaveSectionDto } from './save-section.dto.js'

/** Full desired state of a class's sections; anything missing from it is deleted. */
export class SaveSectionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaveSectionDto)
  readonly sections: SaveSectionDto[]
}
