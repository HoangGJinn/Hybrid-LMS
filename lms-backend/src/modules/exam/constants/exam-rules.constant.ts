/** Limits of an exam a lecturer creates. The frontend mirrors them in its form validation. */
export const EXAM_NAME_MAX_LENGTH = 255;
export const EXAM_MAX_QUESTIONS = 100;
export const QUESTION_MAX_LENGTH = 2000;
export const OPTION_MAX_LENGTH = 500;
/** A question has between these many answers, exactly one of them correct. */
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 6;
export const MIN_DURATION_MINUTES = 1;
export const MAX_DURATION_MINUTES = 480;
export const MS_PER_MINUTE = 60_000;
