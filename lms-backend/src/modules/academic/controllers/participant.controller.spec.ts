import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthenticatedUser } from '../../../common/types/authenticated-user.type.js'
import { AddParticipantsDto } from '../dto/add-participants.dto.js'
import { ParticipantService } from '../services/participant.service.js'
import { ParticipantController } from './participant.controller.js'

const user = { id: 'lecturer-1' } as AuthenticatedUser

describe('ParticipantController', () => {
  const participantService = {
    findAll: vi.fn(),
    searchCandidates: vi.fn(),
    add: vi.fn(),
    remove: vi.fn(),
  }
  let controller: ParticipantController

  beforeEach(() => {
    vi.resetAllMocks()
    controller = new ParticipantController(
      participantService as unknown as ParticipantService,
    )
  })

  it('getAll delegates to the service', async () => {
    participantService.findAll.mockResolvedValue([{ id: 'p1' }])
    await expect(controller.getAll('class-1', user)).resolves.toEqual([{ id: 'p1' }])
    expect(participantService.findAll).toHaveBeenCalledWith('class-1', user)
  })

  it('searchCandidates passes the search term through', async () => {
    participantService.searchCandidates.mockResolvedValue([])
    await controller.searchCandidates('class-1', 'an', user)
    expect(participantService.searchCandidates).toHaveBeenCalledWith('class-1', 'an', user)
  })

  it('searchCandidates falls back to an empty term when missing', async () => {
    participantService.searchCandidates.mockResolvedValue([])
    await controller.searchCandidates('class-1', undefined, user)
    expect(participantService.searchCandidates).toHaveBeenCalledWith('class-1', '', user)
  })

  it('add delegates to the service and returns its result', async () => {
    const dto = { studentIds: ['s1'] } as AddParticipantsDto
    participantService.add.mockResolvedValue({ added: 1, skipped: 0 })
    await expect(controller.add('class-1', dto, user)).resolves.toEqual({
      added: 1,
      skipped: 0,
    })
    expect(participantService.add).toHaveBeenCalledWith('class-1', dto, user)
  })

  it('remove delegates to the service', async () => {
    participantService.remove.mockResolvedValue(undefined)
    await expect(controller.remove('class-1', 's1', user)).resolves.toBeUndefined()
    expect(participantService.remove).toHaveBeenCalledWith('class-1', 's1', user)
  })
})