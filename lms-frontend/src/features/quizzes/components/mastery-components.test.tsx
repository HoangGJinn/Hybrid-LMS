import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MasteryBar } from './MasteryBar';
import { QuestionFitBadge } from './QuestionFitBadge';

describe('MasteryBar', () => {
  it('shows the level and percentage', () => {
    render(<MasteryBar label="Fractions" value={0.82} level="MASTERED" confidence="HIGH" />);
    expect(screen.getByText('Strong')).toBeInTheDocument();
    expect(screen.getByText('82%')).toBeInTheDocument();
    expect(screen.queryByText(/rough estimate/i)).not.toBeInTheDocument();
  });

  it('warns that the estimate is rough when there are few answers', () => {
    render(<MasteryBar label="Fractions" value={0.5} level="UNSURE" confidence="LOW" />);
    expect(screen.getByText(/rough estimate/i)).toBeInTheDocument();
  });

  it('shows "Not started" without a level pill for an untouched topic', () => {
    render(<MasteryBar label="Fractions" value={null} level="NEW" confidence="LOW" />);
    expect(screen.getByText('Not started')).toBeInTheDocument();
    expect(screen.queryByText(/rough estimate/i)).not.toBeInTheDocument();
  });

  it('still works with only a label and a value', () => {
    render(<MasteryBar label="Fractions" value={0.3} />);
    expect(screen.getByText('30%')).toBeInTheDocument();
  });
});

describe('QuestionFitBadge', () => {
  it.each([
    ['EASY', 'Warm-up'],
    ['FIT', 'Good fit'],
    ['CHALLENGE', 'Challenge'],
  ] as const)('labels %s as %s', (fit, label) => {
    render(<QuestionFitBadge fit={fit} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it('renders nothing when the model made no prediction', () => {
    const { container } = render(<QuestionFitBadge fit={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
