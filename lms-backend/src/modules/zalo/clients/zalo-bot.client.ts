import { Injectable } from '@nestjs/common';

const API_BASE = 'https://bot-api.zaloplatforms.com';
const MAX_TEXT_LENGTH = 2000;
const TIMEOUT_ERROR_CODE = 408;

/** Lỗi do chính Zalo Bot API trả về (ok=false), kèm mã lỗi. */
export class ZaloBotApiError extends Error {
  constructor(
    readonly method: string,
    readonly errorCode: number,
    readonly payload: unknown,
  ) {
    super(`Zalo Bot ${method} lỗi: ${JSON.stringify(payload)}`);
  }
}

@Injectable()
export class ZaloBotClient {
  isConfigured(): boolean {
    return !!process.env.ZALO_BOT_TOKEN;
  }

  private async call<T = any>(method: string, payload: object = {}, timeoutMs = 15000): Promise<T> {
    const token = process.env.ZALO_BOT_TOKEN;
    if (!token) throw new Error('Thiếu ZALO_BOT_TOKEN');

    const res = await fetch(`${API_BASE}/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) {
      throw new ZaloBotApiError(method, Number(data?.error_code ?? res.status), data);
    }
    return data as T;
  }

  /** Giới hạn 2000 ký tự/tin, tự tách nếu dài hơn. */
  async sendText(chatId: string, text: string): Promise<void> {
    for (let i = 0; i < text.length; i += MAX_TEXT_LENGTH) {
      await this.call('sendMessage', {
        chat_id: String(chatId),
        text: text.slice(i, i + MAX_TEXT_LENGTH),
      });
    }
  }

  /**
   * Long polling: Zalo giữ yêu cầu tối đa `timeoutSec` giây rồi trả lỗi 408 nếu chưa có tin mới.
   * 408 là trạng thái bình thường nên trả về mảng rỗng, không ném lỗi.
   */
  async getUpdates(timeoutSec = 30): Promise<any[]> {
    try {
      const data = await this.call('getUpdates', { timeout: timeoutSec }, (timeoutSec + 10) * 1000);
      const result = data?.result;
      if (Array.isArray(result)) return result;
      return result ? [result] : [];
    } catch (e) {
      if (e instanceof ZaloBotApiError && e.errorCode === TIMEOUT_ERROR_CODE) return [];
      throw e;
    }
  }

  setWebhook(url: string) {
    return this.call('setWebhook', { url, secret_token: process.env.ZALO_BOT_WEBHOOK_SECRET });
  }

  deleteWebhook() {
    return this.call('deleteWebhook');
  }
}