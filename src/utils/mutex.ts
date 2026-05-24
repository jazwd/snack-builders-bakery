export class Mutex {
  private queue: Promise<void> = Promise.resolve();

  runExclusive<T>(work: () => Promise<T> | T): Promise<T> {
    const run = this.queue.then(() => work());
    this.queue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }
}
