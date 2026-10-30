import { Transform } from 'class-transformer';
import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

/** Step 4 of the upload flow: turns a confirmed (READY) file into a course document. */
export class CreateDocumentDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  readonly title: string;

  @IsUUID()
  readonly fileId: string;
}
