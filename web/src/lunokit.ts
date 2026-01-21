import { createConfig } from '@luno-kit/react';
import { polkadot, kusama, westend } from '@luno-kit/react/chains';
import { polkadotjsConnector, subwalletConnector } from '@luno-kit/react/connectors';
import { QueryClient } from '@tanstack/react-query';

export const lunoKitConfig = createConfig({
  appName: 'Polkadot Staking Agent',
  chains: [westend, polkadot, kusama],
  connectors: [
    polkadotjsConnector(),
    subwalletConnector(),
  ],
  autoConnect: false, // Changed to false - let user explicitly connect via button
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

