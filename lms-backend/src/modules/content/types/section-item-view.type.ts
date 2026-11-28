import type { SectionItem } from '../entities/section-item.entity.js'
import type { ItemType } from '../enums/item-type.enum.js'
import type { ItemSchedule } from './item-schedule.type.js'
/** Read model of a section item, shaped for the frontend. */
export class SectionItemView {
  readonly id: string
  readonly sectionId: string
  readonly itemType: ItemType
  readonly title: string
  readonly externalUrl: string | null
  readonly orderIndex: number
  readonly documentId: string | null
  readonly assignmentId: string | null
  readonly examId: string | null
  readonly isVisible: boolean
  /** Per-student: true when the signed-in student has completed the item. Always false for lecturers and admins. */
  readonly isCompleted: boolean

  readonly openAt: Date | null
  readonly closeAt: Date | null

  private constructor(entity: SectionItem, isCompleted: boolean, schedule: ItemSchedule | null) {
    this.id = entity.id
    this.sectionId = entity.sectionId
    this.itemType = entity.itemType
    this.title = entity.title
    this.externalUrl = entity.externalUrl
    this.orderIndex = entity.orderIndex
    this.documentId = entity.documentId
    this.assignmentId = entity.assignmentId
    this.examId = entity.examId
    this.isVisible = entity.isVisible
    this.isCompleted = isCompleted
    this.openAt = schedule?.openAt || null
    this.closeAt = schedule?.closeAt || null
  }

  /** Maps an entity to its view without leaking the entity itself. */
  static fromEntity(entity: SectionItem, isCompleted = false, schedule: ItemSchedule | null = null): SectionItemView {
    return new SectionItemView(entity, isCompleted, schedule)
  }
}