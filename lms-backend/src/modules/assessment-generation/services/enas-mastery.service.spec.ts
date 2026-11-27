import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EnasGatewayClient, EnasGroupedResult } from './enas-gateway.client.js';
import { EnasMasteryService } from './enas-mastery.service.js';

interface Internals {
  sampleQuestions: (kcIds: string[]) => Promise<Map<string, { name: string; qids: number[] }>>;
  history: () => Promise<unknown[]>;
}

const grouped = (over: Partial<EnasGroupedResult> = {}): EnasGroupedResult => ({
  p: new Map(),
  kc: null,
  logSeq: null,
  lagMode: null,
  ...over,
});

const build = (predictGrouped: EnasGatewayClient['predictGrouped']) => {
  const service = new EnasMasteryService(
    undefined as never,
    undefined as never,
    { predictGrouped } as EnasGatewayClient,
  );
  const internals = service as unknown as Internals;
  internals.sampleQuestions = async () =>
    new Map([
      ['kc-a', { name: 'A', qids: [1, 2] }],
      ['kc-b', { name: 'B', qids: [3] }],
      ['kc-c', { name: 'C', qids: [99] }], // the model has no prediction for it
    ]);
  internals.history = async () => [];
  return service;
};

describe('EnasMasteryService.kcMastery', () => {
  afterEach(() => {
    delete process.env.QUESTION_SELECTOR;
  });

  it('returns null when the model is not enabled and never calls the gateway', async () => {
    const predict = vi.fn();
    expect(await build(predict).kcMastery('s', ['kc-a'])).toBeNull();
    expect(predict).not.toHaveBeenCalled();
  });

  it('averages the predictions per KC itself when the gateway does not (old gateway)', async () => {
    process.env.QUESTION_SELECTOR = 'enas';
    const predict = vi.fn().mockResolvedValue(
      grouped({
        p: new Map([
          [1, 0.4],
          [2, 0.8],
          [3, 0.5],
        ]),
      }),
    );
    const m = await build(predict).kcMastery('s', ['kc-a', 'kc-b', 'kc-c']);
    expect(predict).toHaveBeenCalledTimes(1);
    expect(m?.get('kc-a')).toBeCloseTo(0.6);
    expect(m?.get('kc-b')).toBeCloseTo(0.5);
    expect(m?.has('kc-c')).toBe(false);
  });

  it("uses the gateway's own per-KC mean and reports the log position", async () => {
    process.env.QUESTION_SELECTOR = 'enas';
    const predict = vi.fn().mockResolvedValue(
      grouped({
        p: new Map([[1, 0.1]]),
        kc: new Map([['kc-a', { mean: 0.77, n: 2 }]]),
        logSeq: 42,
        lagMode: 'fixed',
      }),
    );
    const r = await build(predict).kcMasteryDetailed('s', ['kc-a', 'kc-b'], { purpose: 'quiz_after' });
    expect(r?.byKc.get('kc-a')).toEqual({ mean: 0.77, n: 2 });
    expect(r?.byKc.has('kc-b')).toBe(false);
    expect(r?.logSeq).toBe(42);
    expect(predict.mock.calls[0][2]).toMatchObject({ purpose: 'quiz_after', student: 's' });
  });

  it('returns null on a gateway error and pauses calls for a while', async () => {
    process.env.QUESTION_SELECTOR = 'enas';
    const predict = vi.fn().mockRejectedValue(new Error('down'));
    const service = build(predict);
    expect(await service.kcMastery('s', ['kc-a'])).toBeNull();
    expect(await service.kcMastery('s', ['kc-a'])).toBeNull();
    expect(predict).toHaveBeenCalledTimes(1);
  });
});
