import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FileAttachment } from '../entities/file-attachment.entity.js';
import { FileStatus } from '../enums/file-status.enum.js';

export interface NewPendingFile {
  readonly id: string;
  readonly ownerId: string;
  readonly fileName: string;
  readonly storageKey: string;
  readonly fileType: string;
  readonly fileSize: number;
}

/** All TypeORM access for file records. */
@Injectable()
export class FileRepository {
  constructor(
    @InjectRepository(FileAttachment)
    private readonly fileOrmRepository: Repository<FileAttachment>,
  ) {}

  /** Finds one file record by id, or null when it does not exist. */
  async findById(id: string): Promise<FileAttachment | null> {
    return this.fileOrmRepository.findOne({ where: { id } });
  }

  /** Records a file whose upload has been authorised but not yet confirmed. */
  async createPending(input: NewPendingFile): Promise<FileAttachment> {
    return this.fileOrmRepository.save(
      this.fileOrmRepository.create({ ...input, status: FileStatus.PENDING }),
    );
  }

  /** Moves a file to READY once S3 has proven the object exists. */
  async markReady(id: string): Promise<void> {
    await this.fileOrmRepository.update({ id }, { status: FileStatus.READY });
  }
}
