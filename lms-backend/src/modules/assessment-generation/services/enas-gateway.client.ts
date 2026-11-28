import { Injectable } from '@nestjs/common';

export interface EnasHistoryStep {
  /** XES3G5M question id (questions.xes_question_id). */
  qid: number;
  correct: boolean;
  /** Answer time in epoch milliseconds. */
  timestamp: number;
}

/** Nhãn để màn hình /monitor của gateway biết lần gọi này phục vụ việc gì và của ai. */
export interface EnasTrace {
  /** select | mastery_view | quiz_after | quiz_before | recompute ... */
  purpose: string;
  student?: string;
  /** Thông số phía LMS hiển thị cạnh công thức (số câu mẫu mỗi KC, ngưỡng...). */
  meta?: Record<string, unknown>;
}

export interface EnasGroup {
  kcId: string;
  name?: string;
  /** XES question ids sampled for the KC. */
  qids: number[];
}

export interface EnasGroupedResult {
  /** P(correct) per XES question id. */
  p: Map<number, number>;
  /** Mastery per KC as computed by the gateway (mean of P over the KC's questions); null for an old gateway. */
  kc: Map<string, { mean: number; n: number }> | null;
  /** Sequence number of this prediction in the gateway log (/monitor). */
  logSeq: number | null;
  lagMode: string | null;
}

interface PredictResponse {
  predictions: { qid: number; p: number }[];
  kc_mastery?: { kc_id: string; mean: number | null; n: number }[];
  log_seq?: number;
  lag_mode?: string;
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
  async predict(
    history: EnasHistoryStep[],
    candidates: number[],
    timeoutMs: number = this.timeoutMs,
    trace?: EnasTrace,
  ): Promise<Map<number, number>> {
    const json = await this.post(
      { history: this.steps(history), candidates, ...this.traceFields(trace) },
      timeoutMs,
    );
    return new Map(json.predictions.map((p) => [p.qid, p.p]));
  }

  /** Same as predict, and the gateway also computes the mastery of every group (KC) and logs the whole calculation. */
  async predictGrouped(
    history: EnasHistoryStep[],
    groups: EnasGroup[],
    trace: EnasTrace,
    timeoutMs: number = this.timeoutMs,
  ): Promise<EnasGroupedResult> {
    const json = await this.post(
      {
        history: this.steps(history),
        candidates: [...new Set(groups.flatMap((g) => g.qids))],
        groups: groups.map((g) => ({ kc_id: g.kcId, name: g.name, qids: g.qids })),
        ...this.traceFields(trace),
      },
      timeoutMs,
    );
    const kc = json.kc_mastery
      ? new Map(
          json.kc_mastery.flatMap((k) =>
            k.mean === null ? [] : [[k.kc_id, { mean: k.mean, n: k.n }] as const],
          ),
        )
      : null;
    return {
      p: new Map(json.predictions.map((p) => [p.qid, p.p])),
      kc,
      logSeq: json.log_seq ?? null,
      lagMode: json.lag_mode ?? null,
    };
  }

  private steps(history: EnasHistoryStep[]) {
    return history.map((h) => ({ qid: h.qid, correct: h.correct ? 1 : 0, timestamp: h.timestamp }));
  }

  private traceFields(trace?: EnasTrace) {
    return trace ? { purpose: trace.purpose, student: trace.student, meta: trace.meta } : {};
  }

  private async post(body: unknown, timeoutMs: number): Promise<PredictResponse> {
    const res = await fetch(`${this.baseUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) throw new Error(`ENAS gateway HTTP ${res.status}`);
    return (await res.json()) as PredictResponse;
  }
}
