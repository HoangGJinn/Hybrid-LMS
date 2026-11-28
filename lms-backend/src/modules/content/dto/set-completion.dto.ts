import { IsBoolean } from 'class-validator'

/** A student marks one item as done (true) or takes the mark back (false). */
export class SetCompletionDto {
  @IsBoolean()
  readonly completed: boolean
}