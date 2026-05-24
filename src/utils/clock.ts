export interface Clock {
  now(): number;
  setTimeout(fn: () => void, delayMs: number): NodeJS.Timeout;
  clearTimeout(timeout: NodeJS.Timeout): void;
}

export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }

  setTimeout(fn: () => void, delayMs: number): NodeJS.Timeout {
    return setTimeout(fn, delayMs);
  }

  clearTimeout(timeout: NodeJS.Timeout): void {
    clearTimeout(timeout);
  }
}
