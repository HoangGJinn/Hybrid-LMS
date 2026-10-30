import {
  IsEnum,
  IsInt,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { FilePurpose } from '../enums/file-purpose.enum.js';

/** Step 1 of the S3 upload flow: the client asks for permission to upload one file. */
export class RequestUploadDto {
  @IsEnum(FilePurpose)
  readonly purpose: FilePurpose;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  readonly fileName: string;

  @IsString()
  @MaxLength(100)
  readonly contentType: string;

  /** Size in bytes, checked again by S3 through the signed policy. */
  @IsInt()
  @Min(1)
  readonly size: number;
}
