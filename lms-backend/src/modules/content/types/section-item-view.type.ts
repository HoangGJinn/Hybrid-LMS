import type { SectionItem } from '../entities/section-item.entity.js'
import type { ItemType } from '../enums/item-type.enum.js'

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
  /** Completion is a per-student concept, so the lecturer view is always false. */
  readonly isCompleted = false

  private constructor(entity: SectionItem) {
    this.id = entity.id
    this.sectionId = entity.sectionId
    this.itemType = entity.itemType
    this.title = entity.title
    this.externalUrl = entity.externalUrl
    this.orderIndex = entity.orderIndex
    this.documentId = entity.documentId
    this.assignmentId = entity.assignmentId
  }

  /** Maps an entity to its view without leaking the entity itself. */
  static fromEntity(entity: SectionItem): SectionItemView {
    return new SectionItemView(entity)
  }
}
