import { IsNotEmpty, IsUUID } from 'class-validator';

/** Body of `POST /api/classes/:classId/participants`. */
export class AddParticipantDto {
  /** `user.id` of the student, as returned by the candidates search. */
  @IsUUID()
  @IsNotEmpty()
  readonly studentId: string;
}
