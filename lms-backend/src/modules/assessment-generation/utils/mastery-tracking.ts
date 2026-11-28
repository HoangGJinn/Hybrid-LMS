import { LEVEL_THRESHOLDS } from './mastery.js';

const round2 = (n: number): number => Math.round(n * 100) / 100;
const round3 = (n: number): number => Math.round(n * 1000) / 1000;
const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

/** Làm tròn mastery về 3 chữ số thập phân, khớp numeric(4,3) của cột p_mastery. */
export const roundMastery = round3;

/**
 * Năng lực của sinh viên trong một môn, thang 0..100: 100 × trung bình p_mastery của các KC đã làm.
 * Không có KC nào thì là 0.
 */
export const abilityScore = (masteries: number[]): number =>
  masteries.length === 0 ? 0 : round2((100 * masteries.reduce((s, v) => s + v, 0)) / masteries.length);

/** Quy tắc lịch ôn (student_kc_review_schedule). Hiển thị trong màn hình monitor cùng công thức. */
export const REVIEW_RULES = {
  /** Số ngày tới lần ôn kế tiếp theo mức mastery: dưới 0.4 / dưới 0.6 / dưới 0.8. */
  days: { weak: 1, unsure: 3, good: 7 },
  /** Khi mastery >= 0.8: lần đầu ôn sau `masteredFirst` ngày, các lần sau = khoảng cách cũ × ease_factor, kẹp trong [masteredMin, masteredMax]. */
  masteredFirst: 14,
  masteredMin: 7,
  masteredMax: 60,
  ease: { initial: 2.5, min: 1.3, max: 2.5, up: 0.1, down: 0.2 },
  thresholds: LEVEL_THRESHOLDS,
} as const;

export interface ReviewState {
  intervalDays: number;
  easeFactor: number;
}

/**
 * Trạng thái lịch ôn mới sau khi mastery của KC được cập nhật.
 * `improved` = mastery không giảm so với lần trước (hoặc là lần đầu): ease_factor +0.1, ngược lại -0.2.
 */
export const nextReviewState = (
  mastery: number,
  improved: boolean,
  prev: ReviewState | null,
): ReviewState => {
  const { days, ease: e } = REVIEW_RULES;
  const ease = prev
    ? clamp(prev.easeFactor + (improved ? e.up : -e.down), e.min, e.max)
    : e.initial;

  let intervalDays: number;
  if (mastery < LEVEL_THRESHOLDS.unsure) intervalDays = days.weak;
  else if (mastery < LEVEL_THRESHOLDS.good) intervalDays = days.unsure;
  else if (mastery < LEVEL_THRESHOLDS.mastered) intervalDays = days.good;
  else {
    intervalDays = prev
      ? clamp(Math.round(prev.intervalDays * ease), REVIEW_RULES.masteredMin, REVIEW_RULES.masteredMax)
      : REVIEW_RULES.masteredFirst;
  }
  return { intervalDays, easeFactor: round2(ease) };
};

export const addDays = (from: Date, days: number): Date =>
  new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
