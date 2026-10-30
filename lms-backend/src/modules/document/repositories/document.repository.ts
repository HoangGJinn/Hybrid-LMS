import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Document } from '../entities/document.entity.js';

/** All TypeORM access for documents. */
@Injectable()
export class DocumentRepository {
  constructor(
    @InjectRepository(Document)
    private readonly documentOrmRepository: Repository<Document>,
  ) {}

  /** Finds the given documents together with their file records; unknown ids are skipped. */
  async findByIds(ids: string[]): Promise<Document[]> {
    if (ids.length === 0) return [];
    return this.documentOrmRepository.find({
      where: { id: In(ids) },
      relations: { file: true },
    });
  }

  /** Inserts a document and returns it with its file record loaded. */
  async create(input: {
    uploadedBy: string;
    title: string;
    fileId: string;
  }): Promise<Document> {
    const saved = await this.documentOrmRepository.save(
      this.documentOrmRepository.create(input),
    );
    return this.documentOrmRepository.findOneOrFail({
      where: { id: saved.id },
      relations: { file: true },
    });
  }

  /** Finds one document by id, or null when it does not exist. */
  async findById(id: string): Promise<Document | null> {
    return this.documentOrmRepository.findOne({ where: { id } });
  }
}
