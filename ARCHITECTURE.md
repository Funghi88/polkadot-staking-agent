# Architecture Documentation

## Overview

This project follows a clean, layered architecture pattern with clear separation of concerns:

```
┌─────────────────────────────────────────┐
│         Web Interface (React)           │
│  - Wallet Integration (LunoKit)         │
│  - UI Components                         │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      LLM Agent Layer                    │
│  - Tool Registration                    │
│  - Natural Language Processing          │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      Service Layer                      │
│  - StakingService                       │
│  - Business Logic                       │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      Core Agent Layer                   │
│  - PolkadotAgentKit Wrapper             │
│  - Network Connection                   │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│      Polkadot Blockchain                │
│  - Nomination Pools                     │
│  - Staking Operations                   │
└─────────────────────────────────────────┘
```

## Directory Structure

```
polkadot-staking-agent/
├── src/
│   ├── config/          # Configuration management
│   │   └── index.ts     # Environment config validation
│   ├── core/            # Core agent functionality
│   │   ├── agent.ts     # PolkadotAgentKit wrapper
│   │   └── llm-agent.ts # LLM integration layer
│   ├── services/        # Business logic
│   │   └── staking.service.ts  # All staking operations
│   ├── tools/           # LLM tool definitions
│   │   └── staking.tools.ts    # Tool configs with Zod schemas
│   ├── types/           # TypeScript definitions
│   │   └── index.ts     # Shared types
│   ├── utils/           # Utilities
│   │   ├── errors.ts    # Error handling
│   │   └── validation.ts # Input validation
│   └── index.ts         # Entry point
├── web/                 # React web interface
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── hooks/       # Custom React hooks
│   │   └── utils/       # Frontend utilities
│   └── ...
└── ...
```

## Core Components

### 1. Agent (`src/core/agent.ts`)

Wraps the PolkadotAgentKit SDK and manages:
- Network connection
- API initialization
- Lifecycle management

**Key Methods:**
- `initialize()` - Connect to Polkadot network
- `getAgentKit()` - Get underlying SDK instance
- `disconnect()` - Clean disconnect

### 2. StakingService (`src/services/staking.service.ts`)

Implements all 6 required staking operations:
- `joinPool()` - Join a nomination pool
- `bondExtra()` - Add funds to existing stake
- `unbond()` - Initiate unbonding
- `withdrawUnbonded()` - Withdraw after unbonding period
- `claimRewards()` - Claim staking rewards
- `getPoolInfo()` - Retrieve pool information
- `getStakingStatus()` - Get user's staking status

**Design Principles:**
- Input validation before execution
- Comprehensive error handling
- Consistent return types
- Transaction result tracking

### 3. LLM Agent (`src/core/llm-agent.ts`)

Bridges AI capabilities with staking operations:
- Registers all staking tools
- Provides LangChain-compatible tool interface
- Manages tool lifecycle

### 4. Tools (`src/tools/staking.tools.ts`)

Defines LLM tools with:
- Zod schemas for type safety
- ToolConfig for AI understanding
- Error handling and response formatting

## Security Architecture

### 1. Key Management
- Private keys stored in environment variables
- Never logged or exposed in code
- Validation on initialization

### 2. Input Validation
- All inputs validated before processing
- Type checking with Zod schemas
- Amount and address validation
- Pool ID validation

### 3. Error Handling
- Custom error hierarchy
- User-friendly error messages
- Detailed logging for debugging
- Graceful failure handling

### 4. Transaction Safety
- Validation before execution
- Clear error messages
- Transaction hash tracking
- Status verification

## Data Flow

### Staking Operation Flow

```
User Request
    ↓
Input Validation
    ↓
StakingService Method
    ↓
PolkadotAgentKit Tool
    ↓
Polkadot Network
    ↓
Transaction Result
    ↓
Response Formatting
    ↓
User Feedback
```

### AI Agent Flow

```
Natural Language Input
    ↓
LLM Processing
    ↓
Tool Selection
    ↓
Parameter Extraction
    ↓
Tool Invocation
    ↓
StakingService
    ↓
Result Formatting
    ↓
Natural Language Response
```

## Extension Points

### Adding New Tools

1. Create tool implementation in `src/tools/`
2. Define Zod schema and ToolConfig
3. Register with LLMAgent
4. Add to StakingService if needed

### Adding New Services

1. Create service class in `src/services/`
2. Inject Agent dependency
3. Implement business logic
4. Add error handling
5. Export from index

### Customizing UI

1. Add components in `web/src/components/`
2. Use WalletProvider for wallet state
3. Integrate with backend API
4. Add styling in component CSS files

## Best Practices

1. **Type Safety**: Use TypeScript strictly, define all types
2. **Error Handling**: Always handle errors, provide context
3. **Validation**: Validate all inputs at boundaries
4. **Logging**: Log important events, never log secrets
5. **Testing**: Write tests for critical paths
6. **Documentation**: Document public APIs and complex logic

## Performance Considerations

- Connection pooling for API instances
- Caching pool information
- Lazy loading of components
- Optimistic UI updates
- Batch operations where possible

## Future Enhancements

- [ ] WebSocket for real-time updates
- [ ] Transaction history tracking
- [ ] Multi-account management
- [ ] Advanced analytics
- [ ] Automated strategies
- [ ] Batch transaction support
