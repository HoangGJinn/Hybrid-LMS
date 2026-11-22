import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ExamItemRepository } from '../repositories/exam-item.repository.js'
import type { ItemScope } from '../repositories/item-filters.js'
import { ClassExamService } from './class-exam.service.js'

type Mock = ReturnType<typeof vi.fn>

const scope = { role: 'student' } as unknown as ItemScope

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

  describe('findExamsByClasses', () => {
    it('lists the exams shown by the given classes, with an empty scope by default', async () => {
      const links = [{ examId: 'exam-1', classId: 'class-1' }]
      repository.findByClasses.mockResolvedValue(links)

      await expect(service.findExamsByClasses(['class-1'])).resolves.toEqual(links)
      expect(repository.findByClasses).toHaveBeenCalledWith(['class-1'], {})
    })

    it('forwards the given scope', async () => {
      repository.findByClasses.mockResolvedValue([])

      await service.findExamsByClasses(['class-1'], scope)

      expect(repository.findByClasses).toHaveBeenCalledWith(['class-1'], scope)
    })
  })

  describe('isExamInClass', () => {
    it('tells whether the class shows the exam, with an empty scope by default', async () => {
      repository.existsInClass.mockResolvedValue(true)

      await expect(service.isExamInClass('class-1', 'exam-1')).resolves.toBe(true)
      expect(repository.existsInClass).toHaveBeenCalledWith('class-1', 'exam-1', {})
    })

    it('forwards the given scope', async () => {
      repository.existsInClass.mockResolvedValue(false)

      await expect(service.isExamInClass('class-1', 'exam-1', scope)).resolves.toBe(false)
      expect(repository.existsInClass).toHaveBeenCalledWith('class-1', 'exam-1', scope)
    })
  })

  describe('removeExam', () => {
    it('returns how many section items were deleted, recording who asked', async () => {
      repository.deleteItemsByExam.mockResolvedValue(2)

      await expect(service.removeExam('class-1', 'exam-1', 'user-1')).resolves.toBe(2)
      expect(repository.deleteItemsByExam).toHaveBeenCalledWith('class-1', 'exam-1', 'user-1')
    })

    it('records null as the deleter when none is given', async () => {
      repository.deleteItemsByExam.mockResolvedValue(0)

      await expect(service.removeExam('class-1', 'exam-1')).resolves.toBe(0)
      expect(repository.deleteItemsByExam).toHaveBeenCalledWith('class-1', 'exam-1', null)
    })
  })

  it('tells whether any class still shows the exam', async () => {
    repository.isExamReferenced.mockResolvedValue(false)

    await expect(service.isExamReferenced('exam-1')).resolves.toBe(false)
    expect(repository.isExamReferenced).toHaveBeenCalledWith('exam-1')
  })

  it('finds which of the given ids are exams of the class', async () => {
    repository.findExamIdsOfClass.mockResolvedValue(['exam-1'])

    await expect(service.findExamIdsOfClass('class-1', ['exam-1', 'exam-2'])).resolves.toEqual([
      'exam-1',
    ])
    expect(repository.findExamIdsOfClass).toHaveBeenCalledWith('class-1', ['exam-1', 'exam-2'])
  })
})