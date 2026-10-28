import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ItemCompletion } from './entities/item-completion.entity.js';
import { SectionItem } from './entities/section-item.entity.js';
import { Section } from './entities/section.entity.js';
import { Class } from '../academic/entities/class.entity.js'
import { SectionController } from './controllers/section.controller.js'
import { SectionRepository } from './repositories/section.repository.js'
import { SectionService } from './services/section.service.js'

@Module({
  imports: [TypeOrmModule.forFeature([ItemCompletion, SectionItem, Section, Class])],
  controllers: [SectionController],
  providers: [SectionRepository, SectionService],
  exports: [],
})
export class ContentModule {}
