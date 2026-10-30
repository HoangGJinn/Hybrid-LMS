import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { ItemCompletion } from '../entities/item-completion.entity.js';
import { SectionItem } from '../entities/section-item.entity.js';
import { ItemType } from '../enums/item-type.enum.js';

/** TypeORM access for the DOCUMENT items of a class and the students' completion of them. */
@Injectable()
export class DocumentItemRepository {
  constructor(
    @InjectRepository(SectionItem)
    private readonly itemOrmRepository: Repository<SectionItem>,
    @InjectRepository(ItemCompletion)
    private readonly completionOrmRepository: Repository<ItemCompletion>,
  ) {}

  /** Lists the distinct document ids of a class in display order (section order, then item order). */
  async findDocumentIdsByClassId(classId: string): Promise<string[]> {
    const rows = await this.itemOrmRepository
      .createQueryBuilder('item')
      .innerJoin('item.section', 'section')
      .select('item.documentId', 'documentId')
      .where('section.classId = :classId', { classId })
      .andWhere('item.itemType = :itemType', { itemType: ItemType.DOCUMENT })
      .andWhere('item.documentId IS NOT NULL')
      .orderBy('section.orderIndex', 'ASC')
      .addOrderBy('item.orderIndex', 'ASC')
      .getRawMany<{ documentId: string }>();
    return [...new Set(rows.map((row) => row.documentId))];
  }

  /** Lists the section items of a class that show the given document (usually zero or one). */
  async findItemIdsByDocument(
    classId: string,
    documentId: string,
  ): Promise<string[]> {
    const rows = await this.itemOrmRepository
      .createQueryBuilder('item')
      .innerJoin('item.section', 'section')
      .select('item.id', 'id')
      .where('section.classId = :classId', { classId })
      .andWhere('item.itemType = :itemType', { itemType: ItemType.DOCUMENT })
      .andWhere('item.documentId = :documentId', { documentId })
      .getRawMany<{ id: string }>();
    return rows.map((row) => row.id);
  }

  /** Lists the ids of the class's documents the student has already opened. */
  async findCompletedDocumentIds(
    classId: string,
    studentId: string,
  ): Promise<string[]> {
    const rows = await this.completionOrmRepository
      .createQueryBuilder('completion')
      .innerJoin('completion.sectionItem', 'item')
      .innerJoin('item.section', 'section')
      .select('item.documentId', 'documentId')
      .where('completion.studentId = :studentId', { studentId })
      .andWhere('section.classId = :classId', { classId })
      .andWhere('item.documentId IS NOT NULL')
      .getRawMany<{ documentId: string }>();
    return rows.map((row) => row.documentId);
  }

  /** Records completion for the items the student has not completed yet. */
  async markItemsCompleted(
    studentId: string,
    itemIds: string[],
  ): Promise<void> {
    const existing = await this.completionOrmRepository.find({
      select: { sectionItemId: true },
      where: { studentId, sectionItemId: In(itemIds) },
    });
    const completedItemIds = new Set(
      existing.map((completion) => completion.sectionItemId),
    );
    const completedAt = new Date();
    const rows = itemIds
      .filter((itemId) => !completedItemIds.has(itemId))
      .map((sectionItemId) => ({ sectionItemId, studentId, completedAt }));
    if (rows.length === 0) return;
    await this.completionOrmRepository.insert(rows);
  }
}
