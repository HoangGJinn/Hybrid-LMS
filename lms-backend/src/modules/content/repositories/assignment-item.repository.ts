import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {Section} from '../entities/section.entity.js';
import { SectionItem } from '../entities/section-item.entity.js';
import { ItemType } from '../enums/item-type.enum.js';
import { restrictToLiveItems, type ItemScope } from './item-filters.js';

/** One assignment shown by one class. */
export interface ClassAssignmentLink {
  readonly assignmentId: string;
  readonly classId: string;
}

/** TypeORM access for the ASSIGNMENT items of a class. */
@Injectable()
export class AssignmentItemRepository {
  constructor(
    @InjectRepository(SectionItem)
    private readonly itemOrmRepository: Repository<SectionItem>,
  ) {}

  /** Tells whether a section of the class shows the assignment. */
  // async existsInClass(classId: string, assignmentId: string, scope?:): Promise<boolean> {
  //   return this.itemOrmRepository
  //     .createQueryBuilder('item')
  //     .innerJoin('item.section', 'section')
  //     .where('section.classId = :classId', { classId })
  //     .andWhere('item.itemType = :itemType', { itemType: ItemType.ASSIGNMENT })
  //     .andWhere('item.assignmentId = :assignmentId', { assignmentId })
  //     .getExists();
  // }
  async existsInClass(
    classId: string,
    assignmentId: string,
    scope: ItemScope = {},
  ): Promise<boolean> {
    const query = this.itemOrmRepository
      .createQueryBuilder('item')
      .innerJoin('item.section', 'section')
      .where('section.classId = :classId', { classId })
      .andWhere('item.itemType = :itemType', { itemType: ItemType.ASSIGNMENT })
      .andWhere('item.assignmentId = :assignmentId', { assignmentId });
    return restrictToLiveItems(query, scope).getExists();
  }

  /** Every (assignment, class) pair shown by the given classes, each pair once. */
  // async findByClasses(classIds: string[]): Promise<ClassAssignmentLink[]> {
  //   if (classIds.length === 0) return [];
  //   return this.itemOrmRepository
  //     .createQueryBuilder('item')
  //     .innerJoin('item.section', 'section')
  //     .select('item.assignmentId', 'assignmentId')
  //     .addSelect('section.classId', 'classId')
  //     .where('section.classId IN (:...classIds)', { classIds })
  //     .andWhere('item.itemType = :itemType', { itemType: ItemType.ASSIGNMENT })
  //     .andWhere('item.assignmentId IS NOT NULL')
  //     .distinct(true)
  //     .getRawMany<ClassAssignmentLink>();
  // }
  async findByClasses(
    classIds: string[],
    scope: ItemScope = {},
  ): Promise<ClassAssignmentLink[]> {
    if (classIds.length === 0) return [];
    const query = this.itemOrmRepository
      .createQueryBuilder('item')
      .innerJoin('item.section', 'section')
      .select('item.assignmentId', 'assignmentId')
      .addSelect('section.classId', 'classId')
      .where('section.classId IN (:...classIds)', { classIds })
      .andWhere('item.itemType = :itemType', { itemType: ItemType.ASSIGNMENT })
      .andWhere('item.assignmentId IS NOT NULL')
      .distinct(true);
    return restrictToLiveItems(query, scope).getRawMany<ClassAssignmentLink>();
  }

  /** Removes the class's section items that show the assignment and returns how many were removed. */
  // async deleteItemsByAssignment(
  //   classId: string,
  //   assignmentId: string,
  // ): Promise<number> {
  //   const result = await this.itemOrmRepository
  //     .createQueryBuilder()
  //     .delete()
  //     .from(SectionItem)
  //     .where('assignment_id = :assignmentId', { assignmentId })
  //     .andWhere(
  //       'section_id IN (SELECT id FROM sections WHERE class_id = :classId)',
  //       { classId },
  //     )
  //     .execute();
  //   return result.affected ?? 0;
  // }


  /**
   * Places an existing assignment at the end of a section of the class, in one transaction.
   * Returns false when the section does not belong to the class.
   */
  async appendToSection(
    classId: string,
    sectionId: string,
    assignmentId: string,
    title: string,
  ): Promise<boolean> {
    return this.itemOrmRepository.manager.transaction(async (manager) => {
      const section = await manager.findOne(Section, {
        where: { id: sectionId, classId },
      });
      if (section === null) return false;
      const raw = await manager
        .getRepository(SectionItem)
        .createQueryBuilder('item')
        .select('COALESCE(MAX(item.orderIndex), 0)', 'maxOrder')
        .where('item.sectionId = :sectionId', { sectionId })
        .getRawOne<{ maxOrder: number | string }>();
      await manager.insert(SectionItem, {
        sectionId,
        itemType: ItemType.ASSIGNMENT,
        title,
        externalUrl: null,
        orderIndex: Number(raw?.maxOrder ?? 0) + 1,
        documentId: null,
        assignmentId,
        examId: null,
        isVisible: false,
      });
      return true;
    });
  }

  /**
   * Soft-deletes the class's section items that show the assignment and returns how many were deleted.
   * The assignment, its submissions and its files stay until the clean-up job removes what nobody needs.
   */
  async deleteItemsByAssignment(
    classId: string,
    assignmentId: string,
    deletedBy: string | null = null,
  ): Promise<number> {
    const result = await this.itemOrmRepository
      .createQueryBuilder()
      .update(SectionItem)
      .set({ deletedAt: () => 'NOW()', deletedBy })
      .where('assignment_id = :assignmentId', { assignmentId })
      .andWhere('deleted_at IS NULL')
      .andWhere(
        'section_id IN (SELECT id FROM sections WHERE class_id = :classId)',
        { classId },
      )
      .execute();
    return result.affected ?? 0;
  }


  /** Tells whether any section item, in any class, still shows the assignment. */
  async isAssignmentReferenced(assignmentId: string): Promise<boolean> {
    return this.itemOrmRepository.exists({ where: { assignmentId } });
  }


  /** Of the given assignments, the ids some section item (deleted or not) still points at. */
  async findReferencedIds(assignmentIds: string[]): Promise<Set<string>> {
    if (assignmentIds.length === 0) return new Set();
    const rows = await this.itemOrmRepository
      .createQueryBuilder('item')
      .select('item.assignmentId', 'assignmentId')
      .where('item.assignmentId IN (:...assignmentIds)', { assignmentIds })
      .distinct(true)
      .getRawMany<{ assignmentId: string }>();
    return new Set(rows.map((row) => row.assignmentId));
  }

  /**
   * Permanently removes the assignment items that were soft-deleted before `cutoff`
   * and returns the ids of the assignments they pointed at.
   */
  async purgeDeletedBefore(cutoff: Date): Promise<string[]> {
    const result = await this.itemOrmRepository
      .createQueryBuilder()
      .delete()
      .from(SectionItem)
      .where('item_type = :itemType', { itemType: ItemType.ASSIGNMENT })
      .andWhere('deleted_at IS NOT NULL')
      .andWhere('deleted_at < :cutoff', { cutoff })
      .returning('assignment_id')
      .execute();
    const rows = result.raw as { assignment_id: string | null }[];
    return [...new Set(rows.flatMap((row) => row.assignment_id ?? []))];
  }
}