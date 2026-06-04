import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

function Bomb({ throwNow }: { throwNow: boolean }): React.ReactElement {
  if (throwNow) throw new Error('kaboom');
  return <span>safe</span>;
}

describe('ErrorBoundary', () => {
  const originalError = console.error;

  beforeEach(() => {
    console.error = vi.fn();
  });
  afterEach(() => {
    console.error = originalError;
  });

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <span>ok</span>
      </ErrorBoundary>,
    );
    expect(screen.getByText('ok')).toBeInTheDocument();
  });

  it('renders the fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb throwNow />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
    expect(screen.getByText('kaboom')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Try Again/ })).toHaveStyle({ color: 'var(--bg-primary)' });
  });

  it('uses a custom fallback message when provided', () => {
    render(
      <ErrorBoundary fallbackMessage="Chart blew up">
        <Bomb throwNow />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Chart blew up')).toBeInTheDocument();
  });

  it('recovers after clicking Try Again once the child stops throwing', () => {
    const { rerender } = render(
      <ErrorBoundary>
        <Bomb throwNow />
      </ErrorBoundary>,
    );
    // Replace the failing child first, then click Try Again to flip hasError back off.
    rerender(
      <ErrorBoundary>
        <Bomb throwNow={false} />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: /Try Again/ }));
    expect(screen.getByText('safe')).toBeInTheDocument();
  });
});
