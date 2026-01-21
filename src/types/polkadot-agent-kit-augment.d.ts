// Minimal module augmentation to align runtime fields used in this repo with
// the upstream SDK types (which may lag behind runtime behavior).
declare module '@polkadot-agent-kit/sdk' {
  // Merge with upstream class type while keeping the runtime value export.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export class PolkadotAgentKit {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    api?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    account?: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addCustomTools: (tools: any[]) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getLangChainTools: () => any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getPoolInfoTool: () => any;
  }
}

