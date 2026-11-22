import { Injectable } from '@nestjs/common'
import type { ItemScope } from '../repositories/item-filters.js'
import {
  type ClassExamLink,
  ExamItemRepository,
} from '../repositories/exam-item.repository.js'

/** Which exams a class shows. */
@Injectable()
export class ClassExamService {
  constructor(private readonly examItemRepository: ExamItemRepository) {}

  /** The exams shown by the given classes, as (exam, class) pairs. */
  async findExamsByClasses(classIds: string[], scope: ItemScope = {}): Promise<ClassExamLink[]> {
    return this.examItemRepository.findByClasses(classIds, scope)
  }

  /** Tells whether the class shows the exam; an exam of another class must stay unreachable. */
  async isExamInClass(classId: string, examId: string, scope: ItemScope = {}): Promise<boolean> {
    return this.examItemRepository.existsInClass(classId, examId, scope)
  }

  /** Removes the exam from every section of the class; returns how many section items were removed. */
  // async removeExam(classId: string, examId: string): Promise<number> {
  //   return this.examItemRepository.deleteItemsByExam(classId, examId)
  // }

  /** Soft-deletes the exam from every section of the class; returns how many section items were deleted. */
  async removeExam(
    classId: string,
    examId: string,
    deletedBy: string | null = null,
  ): Promise<number> {
    return this.examItemRepository.deleteItemsByExam(classId, examId, deletedBy)
  }

  /** Tells whether any class still shows the exam. */
  async isExamReferenced(examId: string): Promise<boolean> {
    return this.examItemRepository.isExamReferenced(examId)
  }

  /** Of the given ids, those that are exams of the class. */
  async findExamIdsOfClass(
    classId: string,
    examIds: string[],
  ): Promise<string[]> {
    return this.examItemRepository.findExamIdsOfClass(classId, examIds)
  }
}
