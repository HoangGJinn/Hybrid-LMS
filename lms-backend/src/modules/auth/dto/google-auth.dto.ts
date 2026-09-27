import { IsString } from 'class-validator'

export class GoogleAuthDto {
  @IsString()
  readonly idToken: string
}
