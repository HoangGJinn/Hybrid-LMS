import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { LessThan, Repository } from 'typeorm';
import { ZaloBotClient } from '../clients/zalo-bot.client.js';
import { ZaloLinkCode } from '../entities/zalo-link-code.entity.js';
import { ZaloLink } from '../entities/zalo-link.entity.js';

const CODE_TTL_MS = 10 * 60 * 1000;
const CODE_REGEX = /^LK[0-9A-F]{6}$/;

@Injectable()
export class ZaloLinkService {
  private readonly logger = new Logger(ZaloLinkService.name);

  constructor(
    @InjectRepository(ZaloLink) private readonly links: Repository<ZaloLink>,
    @InjectRepository(ZaloLinkCode) private readonly codes: Repository<ZaloLinkCode>,
    private readonly bot: ZaloBotClient,
  ) {}

  /** Tạo mã liên kết (hiệu lực 10 phút), mỗi user chỉ giữ 1 mã. */
  async createCode(userId: string): Promise<{ code: string; expiresInSeconds: number }> {
    await this.codes.delete({ expiresAt: LessThan(new Date()) });
    await this.codes.delete({ userId });
    const code = 'LK' + randomBytes(3).toString('hex').toUpperCase();
    await this.codes.save({ code, userId, expiresAt: new Date(Date.now() + CODE_TTL_MS) });
    return { code, expiresInSeconds: CODE_TTL_MS / 1000 };
  }

  async getStatus(userId: string): Promise<{ linked: boolean; linkedAt: Date | null }> {
    const link = await this.links.findOneBy({ userId });
    return { linked: !!link, linkedAt: link?.linkedAt ?? null };
  }

  async unlink(userId: string): Promise<void> {
    await this.links.delete({ userId });
  }

  /** Gửi tin cho user LMS, trả về false nếu user chưa liên kết. */
  async sendToUser(userId: string, text: string): Promise<boolean> {
    if (!this.bot.isConfigured()) return false;
    const link = await this.links.findOneBy({ userId });
    if (!link) return false;
    await this.bot.sendText(link.chatId, text);
    return true;
  }

  /** Xử lý tin người dùng nhắn cho bot (dùng chung cho polling và webhook). */
  async handleUpdate(update: any): Promise<void> {
    if (process.env.ZALO_DEBUG === 'true') {
      this.logger.debug(`update: ${JSON.stringify(update)}`);
    }
    const message = update?.message;
    const chatId = message?.chat?.id;
    const text = String(message?.text ?? '').trim().toUpperCase();
    if (!chatId || !text) return;
    const chat = String(chatId);

    if (!CODE_REGEX.test(text)) {
      await this.bot.sendText(
        chat,
        'Xin chào! Để nhận thông báo từ LMS, hãy vào trang LMS, bấm "Liên kết Zalo" và nhắn mã dạng LKxxxxxx cho tôi.',
      );
      return;
    }

    const rec = await this.codes.findOneBy({ code: text });
    if (!rec || rec.expiresAt < new Date()) {
      await this.bot.sendText(chat, 'Mã không hợp lệ hoặc đã hết hạn. Hãy tạo mã mới trên trang LMS.');
      return;
    }

    // 1 tài khoản Zalo chỉ gắn 1 user LMS và ngược lại
    await this.links.delete({ chatId: chat });
    await this.links.delete({ userId: rec.userId });
    await this.links.save({ userId: rec.userId, chatId: chat });
    await this.codes.delete({ code: rec.code });

    await this.bot.sendText(chat, '✅ Liên kết thành công. Bạn sẽ nhận thông báo từ LMS qua Zalo.');
  }
}