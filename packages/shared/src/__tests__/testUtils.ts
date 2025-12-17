/**
 * Test utilities for shared package
 */

/**
 * Creates a mock Date object with a specific timestamp
 */
export function mockDate(isoString: string): Date {
  return new Date(isoString);
}

/**
 * Waits for a specified amount of time
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Asserts that a function throws an error
 */
export async function expectToThrow(
  fn: () => any | Promise<any>,
  errorMessage?: string
): Promise<void> {
  try {
    await fn();
    throw new Error('Expected function to throw, but it did not');
  } catch (error) {
    if (errorMessage && !(error as Error).message.includes(errorMessage)) {
      throw new Error(
        `Expected error message to include "${errorMessage}", but got "${(error as Error).message}"`
      );
    }
  }
}

/**
 * Creates a spy function that tracks calls
 */
export function createSpy<T extends (...args: any[]) => any>(): T & {
  calls: any[][];
  callCount: number;
  reset: () => void;
} {
  const calls: any[][] = [];
  const spy = ((...args: any[]) => {
    calls.push(args);
  }) as any;

  Object.defineProperty(spy, 'calls', {
    get: () => calls
  });

  Object.defineProperty(spy, 'callCount', {
    get: () => calls.length
  });

  spy.reset = () => {
    calls.length = 0;
  };

  return spy;
}
