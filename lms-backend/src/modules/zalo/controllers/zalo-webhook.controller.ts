import { Body, Controller, ForbiddenException, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ZaloLinkService } from '../services/zalo-link.service.js';

/** Chỉ dùng khi ZALO_MODE=webhook (cần domain HTTPS). Không dùng @Auth vì Zalo gọi vào. */
@Controller('zalo/webhook')
export class ZaloWebhookController {
  constructor(private readonly linkService: ZaloLinkService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async receive(
    @Headers('x-bot-api-secret-token') secret: string,
    @Body() body: any,
  ): Promise<{ received: boolean }> {
    if (secret !== process.env.ZALO_BOT_WEBHOOK_SECRET) throw new ForbiddenException();
    const payload = body?.result ?? body;
    for (const update of Array.isArray(payload) ? payload : [payload]) {
      await this.linkService.handleUpdate(update);
    }
    return { received: true };
  }
}