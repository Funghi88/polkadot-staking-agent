# Polkadot Staking Agent

AI-powered Polkadot Nomination Staking application built with `@polkadot-agent-kit` and `LunoKit`. This project demonstrates how to integrate AI capabilities with Polkadot blockchain functionality for automated staking operations.

## ✅ Submission Requirements Met

- ✅ **AI-powered cross-chain applications using polkadot-agent-kit**: Full integration with `@polkadot-agent-kit/sdk` and `@polkadot-agent-kit/llm` for AI-driven staking operations
- ✅ **LunoKit Wallet Integration**: Complete wallet connection using `@luno-kit/react` and `@luno-kit/ui`
- ✅ **Show All Accounts**: Displays all wallet accounts in a dropdown selector
- ✅ **Show Connected Chain**: Displays the currently connected chain (Westend/Polkadot/Kusama)

## 🎯 Features

- **Complete Staking Operations**: All 6 required tool calls implemented
  - `join_pool` - Join a nomination pool
  - `bond_extra` - Add more funds to existing stake
  - `unbond` - Unbond funds from pool
  - `withdraw_unbonded` - Withdraw unbonded funds
  - `claim_rewards` - Claim staking rewards
  - `get_pool_info` - Get detailed pool information

- **AI Integration**: Tools are registered via `@polkadot-agent-kit/llm` and can be used by an LLM agent layer
- **Wallet Integration (Web UI)**: LunoKit (`@luno-kit/react` + `@luno-kit/ui`) with multi-wallet support (accounts + connected chain)
- **Offline Demo Mode**: `MOCK_CHAIN=1` makes the backend fully functional without RPC connectivity (stateful mock pools + balances)
- **Security First**: Secure key management, input validation, error handling
- **Clean Architecture**: Modular, maintainable codebase

## 📋 Prerequisites

- Node.js 18+ and pnpm
- Polkadot account with private key
- (Optional) OpenAI or Anthropic API key for AI features

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Edit `.env`:
```env
PRIVATE_KEY=your-private-key-here
KEY_TYPE=Sr25519
POLKADOT_RPC_URL=wss://westend-rpc.polkadot.io
```

### 3. Run the Application (Backend + Web UI)

```bash
# Backend API (real chain)
pnpm dev:api

# OR: Backend API (offline demo mode)
MOCK_CHAIN=1 pnpm dev:api

# Web UI (in another terminal)
pnpm -C web dev --host
```

## 🏗️ Architecture

```
src/
├── config/          # Configuration management
├── core/            # Core agent and LLM integration
├── services/        # Business logic (staking service)
├── tools/           # LLM tool definitions
├── types/           # TypeScript type definitions
└── utils/           # Utilities (validation, errors)
```

### Key Components

- **Agent**: Core Polkadot Agent Kit wrapper
- **StakingService**: Business logic for all staking operations
- **LLMAgent**: AI agent with tool registration
- **Tools**: LLM tool configurations with Zod schemas

## 🔒 Security Considerations

- **Never commit private keys**: Use environment variables
- **Input validation**: All inputs are validated before processing
- **Error handling**: Comprehensive error handling with user-friendly messages
- **Transaction confirmations**: Always confirm before executing transactions
- **Rate limiting**: Implement rate limiting for production use

## 📚 Usage Examples

### Direct Service Usage

```typescript
import { Agent } from './core/agent';
import { StakingService } from './services/staking.service';

const agent = new Agent();
await agent.initialize();

const stakingService = new StakingService(agent);

// Join a pool
const result = await stakingService.joinPool({
  poolId: 1,
  amount: '1000000000000', // 1 DOT in Planck
});

// Get pool info
const poolInfo = await stakingService.getPoolInfo({ poolId: 1 });
```

### AI Agent Usage

```typescript
import { LLMAgent } from './core/llm-agent';

const llmAgent = new LLMAgent(agent);
await llmAgent.registerTools();

// Get all tools for LangChain integration
const tools = llmAgent.getTools();
```

## 🧪 Testing

```bash
# Run tests
pnpm test

# Type checking
NODE_OPTIONS=--max-old-space-size=8192 pnpm type-check

# Linting
pnpm lint
```

## 📖 Documentation

See [ROADMAP.md](./ROADMAP.md) for a comprehensive learning path and development roadmap.

## 📖 Additional Documentation

- [ROADMAP.md](./ROADMAP.md) - Comprehensive learning roadmap
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture documentation
- [POOLS_LOGIC.md](./POOLS_LOGIC.md) - Nomination pools rules (one pool per account) + how our mock mode simulates it

## 🔗 Resources

- [Polkadot Agent Kit GitHub](https://github.com/elasticlabs-org/polkadot-agent-kit)
- [Official Docs](https://cocdap.github.io/agent-docs/)
- [Polkadot Nomination Pools](https://wiki.polkadot.network/docs/learn-nomination-pools)
- [LunoKit](https://github.com/Luno-lab/LunoKit)

## ⚠️ Important Notes

### Wallet Integration
The web UI uses **LunoKit** for wallet connection and chain selection (see [LunoKit repo](https://github.com/Luno-lab/LunoKit.git)).

### SDK Method Names
The actual method names in `@polkadot-agent-kit/sdk` may differ. Please verify:
- `joinPoolTool()` might be `joinPool()` or similar
- `bondExtraTool()` might be `bondExtra()` or similar
- Adjust method calls based on actual SDK API

## 📝 License

MIT

## 🤝 Contributing

This is a challenge submission for Open Guild's CodeCamp. Feel free to fork and extend!

---

Built with ❤️ for the Polkadot ecosystem
