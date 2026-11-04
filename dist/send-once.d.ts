export declare class SendOnceContext {
    readonly node: import("@aztec-labs/aztec.js/node").AztecNode;
    constructor(nodeUrl: string);
    attemptSend<T>(send: () => Promise<T>): Promise<T>;
    isRetryableBeforeBroadcast(error: unknown): boolean;
    isProvablyPreBroadcast(error: unknown): boolean;
}
//# sourceMappingURL=send-once.d.ts.map