import type { MasteryLevel, QuestionFit } from '../types/quizzes.types';

export const LEVEL_LABEL: Record<MasteryLevel, string> = {
  NEW: 'Not started',
  WEAK: 'Needs work',
  UNSURE: 'Getting there',
  GOOD: 'Good',
  MASTERED: 'Strong',
};

export const LEVEL_TONE: Record<MasteryLevel, string> = {
  NEW: 'bg-muted text-muted-foreground',
  WEAK: 'bg-destructive/10 text-destructive',
  UNSURE: 'bg-warning/15 text-warning',
  GOOD: 'bg-primary/15 text-brand',
  MASTERED: 'bg-success/15 text-success',
};

export const FIT_LABEL: Record<QuestionFit, string> = {
  EASY: 'Warm-up',
  FIT: 'Good fit',
  CHALLENGE: 'Challenge',
};

export const FIT_HINT: Record<QuestionFit, string> = {
  EASY: 'You will probably get this one right.',
  FIT: 'Right at your current level.',
  CHALLENGE: 'A stretch for you right now.',
};

export const FIT_TONE: Record<QuestionFit, string> = {
  EASY: 'bg-success/15 text-success',
  FIT: 'bg-primary/15 text-brand',
  CHALLENGE: 'bg-warning/15 text-warning',
};

export const FIT_ORDER: QuestionFit[] = ['EASY', 'FIT', 'CHALLENGE'];
