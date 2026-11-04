import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SectionItem } from '../entities/section-item.entity.js';
import { ItemType } from '../enums/item-type.enum.js';

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
  async existsInClass(classId: string, assignmentId: string): Promise<boolean> {
    return this.itemOrmRepository
      .createQueryBuilder('item')
      .innerJoin('item.section', 'section')
      .where('section.classId = :classId', { classId })
      .andWhere('item.itemType = :itemType', { itemType: ItemType.ASSIGNMENT })
      .andWhere('item.assignmentId = :assignmentId', { assignmentId })
      .getExists();
  }

  /** Every (assignment, class) pair shown by the given classes, each pair once. */
  async findByClasses(classIds: string[]): Promise<ClassAssignmentLink[]> {
    if (classIds.length === 0) return [];
    return this.itemOrmRepository
      .createQueryBuilder('item')
      .innerJoin('item.section', 'section')
      .select('item.assignmentId', 'assignmentId')
      .addSelect('section.classId', 'classId')
      .where('section.classId IN (:...classIds)', { classIds })
      .andWhere('item.itemType = :itemType', { itemType: ItemType.ASSIGNMENT })
      .andWhere('item.assignmentId IS NOT NULL')
      .distinct(true)
      .getRawMany<ClassAssignmentLink>();
  }

  /** Removes the class's section items that show the assignment and returns how many were removed. */
  async deleteItemsByAssignment(
    classId: string,
    assignmentId: string,
  ): Promise<number> {
    const result = await this.itemOrmRepository
      .createQueryBuilder()
      .delete()
      .from(SectionItem)
      .where('assignment_id = :assignmentId', { assignmentId })
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
}