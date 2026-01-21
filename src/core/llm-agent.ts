import { Agent } from './agent';
import { StakingService } from '../services/staking.service';
import { createStakingTools } from '../tools/staking.tools';

export class LLMAgent {
  private agent: Agent;
  private stakingService: StakingService;
  private toolsRegistered = false;

  constructor(agent: Agent) {
    this.agent = agent;
    this.stakingService = new StakingService(agent);
  }

  /**
   * Register all staking tools with the agent
   */
  async registerTools(): Promise<void> {
    if (this.toolsRegistered) {
      return;
    }

    const agentKit = this.agent.getAgentKit();
    const stakingTools = createStakingTools(this.stakingService);

    // Register custom tools
    agentKit.addCustomTools(stakingTools);

    this.toolsRegistered = true;
  }

  /**
   * Get all available tools (both built-in and custom)
   */
  getTools() {
    const agentKit = this.agent.getAgentKit();
    // Some SDK versions don't type this helper; it's available at runtime.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (agentKit as any).getLangChainTools();
  }

  /**
   * Get staking service for direct access if needed
   */
  getStakingService(): StakingService {
    return this.stakingService;
  }
}
