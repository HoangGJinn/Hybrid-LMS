import type { SectionItem } from '../entities/section-item.entity.js'
import type { Section } from '../entities/section.entity.js'
import { ItemSchedule } from './item-schedule.type.js'
import { SectionItemView } from './section-item-view.type.js'

/** Read model of a section with its items, shaped for the frontend. */
export class SectionView {
  readonly id: string
  readonly classId: string
  readonly title: string
  readonly description: string | null
  readonly orderIndex: number
  readonly isVisible: boolean
  readonly items: readonly SectionItemView[]

  private constructor(
    entity: Section,
    items: readonly SectionItem[],
    completedIds: ReadonlySet<string>,
    schedules: ReadonlyMap<string, ItemSchedule>,
  ) {
    this.id = entity.id
    this.classId = entity.classId
    this.title = entity.title
    this.description = entity.description
    this.orderIndex = entity.orderIndex
    this.isVisible = entity.isVisible
    this.items = items.map((item) =>
      SectionItemView.fromEntity(item, completedIds.has(item.id), schedules.get(item.id) || null),
    )
  }

  /** Maps an entity (and its items, if any) to its view. */
  static fromEntity(
    entity: Section,
    items: readonly SectionItem[] = [],
    completedIds: ReadonlySet<string> = new Set(),
    schedules: ReadonlyMap<string, ItemSchedule> = new Map()
  ): SectionView {
    return new SectionView(entity, items, completedIds, schedules)
  }
}