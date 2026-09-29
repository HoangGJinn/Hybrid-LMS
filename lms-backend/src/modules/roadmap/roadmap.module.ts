import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { LearningRoadmap } from './entities/learning-roadmap.entity.js'
import { RoadmapItem } from './entities/roadmap-item.entity.js'

@Module({
  imports: [TypeOrmModule.forFeature([LearningRoadmap, RoadmapItem])],
  providers: [],
  exports: [],
})
export class RoadmapModule {}
