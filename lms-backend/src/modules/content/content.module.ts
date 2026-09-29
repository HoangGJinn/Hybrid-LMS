import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ItemCompletion } from './entities/item-completion.entity.js'
import { SectionItem } from './entities/section-item.entity.js'
import { Section } from './entities/section.entity.js'

@Module({
  imports: [TypeOrmModule.forFeature([ItemCompletion, SectionItem, Section])],
  providers: [],
  exports: [],
})
export class ContentModule {}
