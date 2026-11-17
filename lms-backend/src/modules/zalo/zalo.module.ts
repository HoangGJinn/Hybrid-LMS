import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ZaloBotClient } from './clients/zalo-bot.client.js';
import { ZaloWebhookController } from './controllers/zalo-webhook.controller.js';
import { ZaloController } from './controllers/zalo.controller.js';
import { ZaloLinkCode } from './entities/zalo-link-code.entity.js';
import { ZaloLink } from './entities/zalo-link.entity.js';
import { ZaloFacade } from './facades/zalo.facade.js';
import { ZaloLinkService } from './services/zalo-link.service.js';
import { ZaloPollingService } from './services/zalo-polling.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([ZaloLink, ZaloLinkCode])],
  controllers: [ZaloController, ZaloWebhookController],
  providers: [ZaloBotClient, ZaloLinkService, ZaloPollingService, ZaloFacade],
  exports: [ZaloFacade], // chỉ xuất Facade
})
export class ZaloModule {}