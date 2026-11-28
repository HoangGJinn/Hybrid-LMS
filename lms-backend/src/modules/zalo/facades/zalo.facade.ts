import { Injectable, Logger } from '@nestjs/common';
import { ZaloLinkService } from '../services/zalo-link.service.js';

const BATCH_SIZE = 10;

@Injectable()
export class ZaloFacade {
  private readonly logger = new Logger(ZaloFacade.name);

  constructor(private readonly linkService: ZaloLinkService) {}

  /** Không bao giờ throw: lỗi Zalo không được làm hỏng nghiệp vụ chính. */
  async notifyUser(userId: string, text: string): Promise<boolean> {
    try {
      return await this.linkService.sendToUser(userId, text);
    } catch (e: any) {
      this.logger.error(`Gửi Zalo cho user ${userId} lỗi: ${e.message}`);
      return false;
    }
  }

  /** Gửi theo từng đợt 10 người để không dồn dập lên API Zalo. */
  async notifyUsers(userIds: string[], text: string): Promise<void> {
    const unique = [...new Set(userIds)];
    for (let i = 0; i < unique.length; i += BATCH_SIZE) {
      await Promise.allSettled(
        unique.slice(i, i + BATCH_SIZE).map((id) => this.notifyUser(id, text)),
      );
    }
  }
}