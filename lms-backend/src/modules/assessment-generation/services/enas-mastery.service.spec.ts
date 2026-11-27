import { afterEach, describe, expect, it, vi } from 'vitest';
import type { EnasGatewayClient } from './enas-gateway.client.js';
import { EnasMasteryService } from './enas-mastery.service.js';

interface Internals {
  sampleQuestions: (kcIds: string[]) => Promise<Map<string, number[]>>;
  history: () => Promise<unknown[]>;
}

const build = (predict: EnasGatewayClient['predict']) => {
  const service = new EnasMasteryService(
    undefined as never,
    undefined as never,
    { predict } as EnasGatewayClient,
  );
  const internals = service as unknown as Internals;
  internals.sampleQuestions = async () =>
    new Map([
      ['kc-a', [1, 2]],
      ['kc-b', [3]],
      ['kc-c', [99]], // the model has no prediction for it
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

  it('averages the predictions per KC with one gateway call', async () => {
    process.env.QUESTION_SELECTOR = 'enas';
    const predict = vi.fn().mockResolvedValue(
      new Map([
        [1, 0.4],
        [2, 0.8],
        [3, 0.5],
      ]),
    );
    const m = await build(predict).kcMastery('s', ['kc-a', 'kc-b', 'kc-c']);
    expect(predict).toHaveBeenCalledTimes(1);
    expect(m?.get('kc-a')).toBeCloseTo(0.6);
    expect(m?.get('kc-b')).toBeCloseTo(0.5);
    expect(m?.has('kc-c')).toBe(false);
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
