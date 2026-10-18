import { PartialType } from '@nestjs/mapped-types';
import { CreateSemesterDto } from './create-semester.dto.js';

export class UpdateSemesterDto extends PartialType(CreateSemesterDto) {}
