import { createAztecNodeClient } from "@aztec-labs/aztec.js/node";

class BroadcastAttemptError extends Error {
  constructor(cause: unknown) {
    super("Sponsored transaction broadcast failed", { cause });
  }
}

export class SendOnceContext {
  readonly node;

  constructor(nodeUrl: string) {
    this.node = createAztecNodeClient(nodeUrl);
  }

  async attemptSend<T>(send: () => Promise<T>): Promise<T> {
    try {
      return await send();
    } catch (error) {
      throw new BroadcastAttemptError(error);
    }
  }

  isRetryableBeforeBroadcast(error: unknown): boolean {
    return !(error instanceof BroadcastAttemptError);
  }

  isProvablyPreBroadcast(error: unknown): boolean {
    return !(error instanceof BroadcastAttemptError);
  }
}
