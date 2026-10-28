import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsUUID } from 'class-validator'

export class AddParticipantsDto {
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  readonly studentIds: string[]
}