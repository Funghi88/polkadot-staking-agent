import dotenv from 'dotenv';

dotenv.config();

export interface Config {
  privateKey: string;
  keyType: 'Sr25519' | 'Ed25519' | 'Ecdsa';
  rpcUrl: string;
  openaiApiKey?: string;
  anthropicApiKey?: string;
  nodeEnv: string;
  port: number;
  apiPort: number; // Separate port for API server
}

function validateConfig(): Config {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    throw new Error('PRIVATE_KEY is required in environment variables');
  }

  const keyType = process.env.KEY_TYPE as 'Sr25519' | 'Ed25519' | 'Ecdsa';
  if (!keyType || !['Sr25519', 'Ed25519', 'Ecdsa'].includes(keyType)) {
    throw new Error('KEY_TYPE must be one of: Sr25519, Ed25519, Ecdsa');
  }

  // Default to Westend testnet for safety
  const rpcUrl = process.env.POLKADOT_RPC_URL || 'wss://westend-rpc.polkadot.io';
  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = parseInt(process.env.PORT || '3000', 10);
  const apiPort = parseInt(process.env.API_PORT || process.env.PORT || '3001', 10); // Default to 3001 for API server

  return {
    privateKey,
    keyType,
    rpcUrl,
    openaiApiKey: process.env.OPENAI_API_KEY,
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    nodeEnv,
    port,
    apiPort,
  };
}

export const config = validateConfig();
