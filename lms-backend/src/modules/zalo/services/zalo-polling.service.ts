import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ZaloBotClient } from '../clients/zalo-bot.client.js';
import { ZaloLinkService } from './zalo-link.service.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class ZaloPollingService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ZaloPollingService.name);
  private running = false;

  constructor(
    private readonly bot: ZaloBotClient,
    private readonly linkService: ZaloLinkService,
  ) {}

  onApplicationBootstrap(): void {
    const mode = process.env.ZALO_MODE ?? 'polling';
    if (mode !== 'polling' || !this.bot.isConfigured()) {
      this.logger.log(`Zalo polling tắt (mode=${mode}, token=${this.bot.isConfigured() ? 'có' : 'thiếu'})`);
      return;
    }
    this.running = true;
    void this.loop();
  }

  onModuleDestroy(): void {
    this.running = false;
  }

  private async loop(): Promise<void> {
    try {
      await this.bot.deleteWebhook(); // polling và webhook loại trừ nhau
    } catch {
      /* chưa đặt webhook thì bỏ qua */
    }
    this.logger.log('Zalo polling bắt đầu');

    while (this.running) {
      try {
        const updates = await this.bot.getUpdates(30);
        if (!updates.length) {
          await sleep(500);
          continue;
        }
        for (const update of updates) {
          try {
            await this.linkService.handleUpdate(update);
          } catch (e: any) {
            this.logger.error(`Xử lý update lỗi: ${e.message}`);
          }
        }
      } catch (e: any) {
        this.logger.error(`Polling lỗi: ${e.message}`);
        await sleep(3000);
      }
    }
  }
}