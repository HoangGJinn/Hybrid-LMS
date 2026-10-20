import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Badge } from './Badge';

describe('Badge Component', () => {
  it('should render children correctly', () => {
    render(<Badge>Active</Badge>);
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should apply default variant classes by default', () => {
    const { container } = render(<Badge>Default</Badge>);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('bg-muted');
  });

  it('should apply success variant class', () => {
    const { container } = render(<Badge variant="success">Completed</Badge>);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('bg-success/15');
  });

  it('should apply custom className', () => {
    const { container } = render(<Badge className="custom-class">Custom</Badge>);
    const badge = container.querySelector('span');
    expect(badge).toHaveClass('custom-class');
  });
});
