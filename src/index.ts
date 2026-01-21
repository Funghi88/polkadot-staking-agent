import { Agent } from './core/agent';
import { LLMAgent } from './core/llm-agent';

async function main() {
  console.log('🚀 Initializing Polkadot Staking Agent...\n');

  try {
    // Initialize core agent
    const agent = new Agent();
    await agent.initialize();
    console.log('✅ Agent initialized successfully');

    // Initialize LLM agent with tools
    const llmAgent = new LLMAgent(agent);
    await llmAgent.registerTools();
    console.log('✅ Staking tools registered');

    // Get all available tools
    const tools = llmAgent.getTools();
    console.log(`✅ Available tools: ${tools.length}\n`);

    // Example: Get staking status
    const stakingService = llmAgent.getStakingService();
    const agentKit = agent.getAgentKit();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const account = (agentKit as any).account?.address || '';

    if (account) {
      console.log(`📊 Account: ${account}`);
      try {
        const status = await stakingService.getStakingStatus(account);
        console.log('📊 Staking Status:');
        console.log(`   Pool ID: ${status.poolId || 'Not in a pool'}`);
        console.log(`   Bonded: ${status.bonded}`);
        console.log(`   Unbonding: ${status.unbonding}`);
        console.log(`   Claimable Rewards: ${status.claimableRewards}`);
      } catch (error) {
        console.log('⚠️  Could not fetch staking status:', error);
      }
    }

    console.log('\n✨ Agent is ready!');
    console.log('\nAvailable operations:');
    console.log('  - join_pool(poolId, amount)');
    console.log('  - bond_extra(amount)');
    console.log('  - unbond(amount)');
    console.log('  - withdraw_unbonded()');
    console.log('  - claim_rewards(poolId?)');
    console.log('  - get_pool_info(poolId)');

    // Keep the process alive
    process.on('SIGINT', async () => {
      console.log('\n\n👋 Shutting down...');
      await agent.disconnect();
      process.exit(0);
    });
  } catch (error) {
    console.error('❌ Error initializing agent:', error);
    process.exit(1);
  }
}

// Run if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { Agent, LLMAgent };
export * from './services/staking.service';
export * from './types';
