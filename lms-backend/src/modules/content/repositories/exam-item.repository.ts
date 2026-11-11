import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import { ExamSchedule } from '../../exam/entities/exam-schedule.entity.js'
import { SectionItem } from '../entities/section-item.entity.js'
import { ItemType } from '../enums/item-type.enum.js'

/** TypeORM access for the EXAM items of a class. */
@Injectable()
export class ExamItemRepository {
  constructor(
    @InjectRepository(SectionItem)
    private readonly itemOrmRepository: Repository<SectionItem>,
    @InjectRepository(ExamSchedule)
    private readonly examOrmRepository: Repository<ExamSchedule>,
  ) {}

  /** Tells whether a section of the class shows the exam. */
  async existsInClass(classId: string, examId: string): Promise<boolean> {
    return this.itemOrmRepository
      .createQueryBuilder('item')
      .innerJoin('item.section', 'section')
      .where('section.classId = :classId', { classId })
      .andWhere('item.itemType = :itemType', { itemType: ItemType.EXAM })
      .andWhere('item.examId = :examId', { examId })
      .getExists()
  }

  /** Removes the class's section items that show the exam and returns how many were removed. */
  async deleteItemsByExam(classId: string, examId: string): Promise<number> {
    const result = await this.itemOrmRepository
      .createQueryBuilder()
      .delete()
      .from(SectionItem)
      .where('exam_id = :examId', { examId })
      .andWhere(
        'section_id IN (SELECT id FROM sections WHERE class_id = :classId)',
        { classId },
      )
      .execute()
    return result.affected ?? 0
  }

  /** Tells whether any section item, in any class, still shows the exam. */
  async isExamReferenced(examId: string): Promise<boolean> {
    return this.itemOrmRepository.exists({ where: { examId } })
  }

  /** Of the given ids, those that are exams of the class; the section editor may only link such exams. */
  async findExamIdsOfClass(classId: string, examIds: string[]): Promise<string[]> {
    if (examIds.length === 0) return []
    const exams = await this.examOrmRepository.find({
      select: { id: true },
      where: { id: In(examIds), classId },
    })
    return exams.map((exam) => exam.id)
  }
}
