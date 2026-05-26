import { afterEach, describe, expect, it, vi } from 'vitest';

import { SystemClock } from './clock';

describe('SystemClock', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('returns Date.now value', () => {
    vi.spyOn(Date, 'now').mockReturnValue(123456);
    const clock = new SystemClock();

    expect(clock.now()).toBe(123456);
  });

  it('schedules and clears timeouts through the runtime timer API', () => {
    vi.useFakeTimers();
    const clock = new SystemClock();
    const handler = vi.fn();

    const timeout = clock.setTimeout(handler, 1000);
    vi.advanceTimersByTime(999);
    expect(handler).not.toHaveBeenCalled();

    clock.clearTimeout(timeout);
    vi.advanceTimersByTime(1);
    expect(handler).not.toHaveBeenCalled();
  });
});
