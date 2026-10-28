import type { SectionItem } from '../entities/section-item.entity.js'
import type { Section } from '../entities/section.entity.js'
import { SectionItemView } from './section-item-view.type.js'

/** Read model of a section with its items, shaped for the frontend. */
export class SectionView {
  readonly id: string
  readonly classId: string
  readonly title: string
  readonly description: string | null
  readonly orderIndex: number
  readonly items: readonly SectionItemView[]

  private constructor(entity: Section, items: readonly SectionItem[]) {
    this.id = entity.id
    this.classId = entity.classId
    this.title = entity.title
    this.description = entity.description
    this.orderIndex = entity.orderIndex
    this.items = items.map((item) => SectionItemView.fromEntity(item))
  }

  /** Maps an entity (and its items, if any) to its view. */
  static fromEntity(
    entity: Section,
    items: readonly SectionItem[] = [],
  ): SectionView {
    return new SectionView(entity, items)
  }
}
