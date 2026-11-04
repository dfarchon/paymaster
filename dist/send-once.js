import { createAztecNodeClient } from "@aztec-labs/aztec.js/node";
class BroadcastAttemptError extends Error {
    constructor(cause) {
        super("Sponsored transaction broadcast failed", { cause });
    }
}
export class SendOnceContext {
    node;
    constructor(nodeUrl) {
        this.node = createAztecNodeClient(nodeUrl);
    }
    async attemptSend(send) {
        try {
            return await send();
        }
        catch (error) {
            throw new BroadcastAttemptError(error);
        }
    }
    isRetryableBeforeBroadcast(error) {
        return !(error instanceof BroadcastAttemptError);
    }
    isProvablyPreBroadcast(error) {
        return !(error instanceof BroadcastAttemptError);
    }
}
//# sourceMappingURL=send-once.js.map