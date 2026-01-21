import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import '@luno-kit/ui/styles.css';
import { QueryClientProvider } from '@tanstack/react-query';
import { LunoKitProvider } from '@luno-kit/ui';
import { lunoKitConfig, queryClient } from './lunokit';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <LunoKitProvider config={lunoKitConfig}>
        <App />
      </LunoKitProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
