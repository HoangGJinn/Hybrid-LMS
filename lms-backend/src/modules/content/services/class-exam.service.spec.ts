import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExamItemRepository } from '../repositories/exam-item.repository.js'
import { ClassExamService } from './class-exam.service.js'

type Mock = ReturnType<typeof vi.fn>

describe('ClassExamService', () => {
  let repository: {
    findByClasses: Mock
    existsInClass: Mock
    deleteItemsByExam: Mock
    isExamReferenced: Mock
    findExamIdsOfClass: Mock
  }
  let service: ClassExamService

  beforeEach(() => {
    repository = {
      findByClasses: vi.fn(),
      existsInClass: vi.fn(),
      deleteItemsByExam: vi.fn(),
      isExamReferenced: vi.fn(),
      findExamIdsOfClass: vi.fn(),
    }
    service = new ClassExamService(repository as unknown as ExamItemRepository)
  })

  it('lists the exams shown by the given classes', async () => {
    const links = [{ examId: 'exam-1', classId: 'class-1' }]
    repository.findByClasses.mockResolvedValue(links)

    await expect(service.findExamsByClasses(['class-1'])).resolves.toEqual(links)
    expect(repository.findByClasses).toHaveBeenCalledWith(['class-1'])
  })

  it('tells whether the class shows the exam', async () => {
    repository.existsInClass.mockResolvedValue(true)

    await expect(service.isExamInClass('class-1', 'exam-1')).resolves.toBe(true)
    expect(repository.existsInClass).toHaveBeenCalledWith('class-1', 'exam-1')
  })

  it('returns how many section items were removed with the exam', async () => {
    repository.deleteItemsByExam.mockResolvedValue(2)

    await expect(service.removeExam('class-1', 'exam-1')).resolves.toBe(2)
    expect(repository.deleteItemsByExam).toHaveBeenCalledWith('class-1', 'exam-1')
  })

  it('tells whether any class still shows the exam', async () => {
    repository.isExamReferenced.mockResolvedValue(false)

    await expect(service.isExamReferenced('exam-1')).resolves.toBe(false)
  })

  it('finds which of the given ids are exams of the class', async () => {
    repository.findExamIdsOfClass.mockResolvedValue(['exam-1'])

    await expect(
      service.findExamIdsOfClass('class-1', ['exam-1', 'exam-2']),
    ).resolves.toEqual(['exam-1'])
    expect(repository.findExamIdsOfClass).toHaveBeenCalledWith('class-1', [
      'exam-1',
      'exam-2',
    ])
  })
})
