import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Repository } from 'typeorm'
import { ClassStudent } from '../entities/class-student.entity.js'
import { ParticipantRepository } from './participant.repository.js'

type Builder = Record<string, ReturnType<typeof vi.fn>>

function createBuilder(): Builder {
  const builder: Builder = {}
  for (const name of [
    'innerJoin',
    'innerJoinAndSelect',
    'select',
    'where',
    'andWhere',
    'orderBy',
    'take',
    'insert',
    'into',
    'values',
    'orIgnore',
  ]) {
    builder[name] = vi.fn().mockReturnValue(builder)
  }
  builder.getRawMany = vi.fn()
  builder.getMany = vi.fn()
  builder.execute = vi.fn()
  return builder
}

describe('ParticipantRepository', () => {
  const managerBuilder = createBuilder()
  const insertBuilder = createBuilder()
  const classStudentRepo = {
    find: vi.fn(),
    delete: vi.fn(),
    createQueryBuilder: vi.fn(),
    manager: { createQueryBuilder: vi.fn() },
  }
  let repository: ParticipantRepository

  beforeEach(() => {
    vi.clearAllMocks()
    for (const builder of [managerBuilder, insertBuilder]) {
      for (const [name, fn] of Object.entries(builder)) {
        if (!['getRawMany', 'getMany', 'execute'].includes(name)) {
          fn.mockReturnValue(builder)
        }
      }
    }
    classStudentRepo.manager.createQueryBuilder.mockReturnValue(managerBuilder)
    classStudentRepo.createQueryBuilder.mockReturnValue(insertBuilder)
    repository = new ParticipantRepository(
      classStudentRepo as unknown as Repository<ClassStudent>,
    )
  })

  it('findByClassId loads enrollments ordered by student code', async () => {
    const rows = [{ studentId: 's1' }]
    classStudentRepo.find.mockResolvedValue(rows)

    await expect(repository.findByClassId('class-1')).resolves.toBe(rows)
    expect(classStudentRepo.find).toHaveBeenCalledWith({
      where: { classId: 'class-1' },
      relations: { student: { user: true } },
      order: { student: { studentCode: 'ASC' } },
    })
  })

  it('findActiveStudentIds returns the ids as a set', async () => {
    managerBuilder.getRawMany.mockResolvedValue([{ id: 's1' }, { id: 's2' }])

    const result = await repository.findActiveStudentIds(['s1', 's2', 's3'])

    expect(result).toEqual(new Set(['s1', 's2']))
    expect(managerBuilder.where).toHaveBeenCalledWith('u.id IN (:...ids)', {
      ids: ['s1', 's2', 's3'],
    })
  })

  it('findEnrolledIds returns enrolled student ids as a set', async () => {
    classStudentRepo.find.mockResolvedValue([
      { classId: 'class-1', studentId: 's1' },
    ])

    const result = await repository.findEnrolledIds('class-1', ['s1', 's2'])

    expect(result).toEqual(new Set(['s1']))
  })

  it('searchCandidates wraps the term for ILIKE and applies the limit', async () => {
    const students = [{ id: 's1' }]
    managerBuilder.getMany.mockResolvedValue(students)

    const result = await repository.searchCandidates('class-1', 'an', 20)

    expect(result).toBe(students)
    expect(managerBuilder.andWhere).toHaveBeenCalledWith(expect.any(String), {
      classId: 'class-1',
    })
    expect(managerBuilder.andWhere).toHaveBeenCalledWith(expect.any(String), {
      term: '%an%',
    })
    expect(managerBuilder.take).toHaveBeenCalledWith(20)
  })

  describe('createMany', () => {
    it('does nothing for an empty list', async () => {
      await repository.createMany('class-1', [])
      expect(classStudentRepo.createQueryBuilder).not.toHaveBeenCalled()
    })

    it('inserts one row per student and ignores duplicates', async () => {
      insertBuilder.execute.mockResolvedValue(undefined)

      await repository.createMany('class-1', ['s1', 's2'])

      expect(insertBuilder.values).toHaveBeenCalledWith([
        { classId: 'class-1', studentId: 's1' },
        { classId: 'class-1', studentId: 's2' },
      ])
      expect(insertBuilder.orIgnore).toHaveBeenCalled()
      expect(insertBuilder.execute).toHaveBeenCalled()
    })
  })

  describe('delete', () => {
    it('returns true when a row was removed', async () => {
      classStudentRepo.delete.mockResolvedValue({ affected: 1 })
      await expect(repository.delete('class-1', 's1')).resolves.toBe(true)
      expect(classStudentRepo.delete).toHaveBeenCalledWith({
        classId: 'class-1',
        studentId: 's1',
      })
    })

    it('returns false when nothing was removed', async () => {
      classStudentRepo.delete.mockResolvedValue({ affected: 0 })
      await expect(repository.delete('class-1', 's1')).resolves.toBe(false)
    })

    it('returns false when affected is undefined', async () => {
      classStudentRepo.delete.mockResolvedValue({})
      await expect(repository.delete('class-1', 's1')).resolves.toBe(false)
    })
  })
})