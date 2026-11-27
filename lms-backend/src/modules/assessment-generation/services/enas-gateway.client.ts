import { Injectable } from '@nestjs/common';

export interface EnasHistoryStep {
  /** XES3G5M question id (questions.xes_question_id). */
  qid: number;
  correct: boolean;
  /** Answer time in epoch milliseconds. */
  timestamp: number;
}

/**
 * HTTP client of the Python ENAS-KT gateway (enas_gateway.py).
 * Env: ENAS_GATEWAY_URL (default http://127.0.0.1:8002), ENAS_GATEWAY_TIMEOUT_MS (default 15000).
 */
@Injectable()
export class EnasGatewayClient {
  private readonly baseUrl = (process.env.ENAS_GATEWAY_URL ?? 'http://127.0.0.1:8002').replace(/\/$/, '');
  private readonly timeoutMs = Number(process.env.ENAS_GATEWAY_TIMEOUT_MS ?? 15_000);

  /** P(correct) of each candidate right after the given history, keyed by XES question id. */
  async predict(history: EnasHistoryStep[], candidates: number[]): Promise<Map<number, number>> {
    const res = await fetch(`${this.baseUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        history: history.map((h) => ({ qid: h.qid, correct: h.correct ? 1 : 0, timestamp: h.timestamp })),
        candidates,
      }),
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!res.ok) throw new Error(`ENAS gateway HTTP ${res.status}`);
    const json = (await res.json()) as { predictions: { qid: number; p: number }[] };
    return new Map(json.predictions.map((p) => [p.qid, p.p]));
  }
}