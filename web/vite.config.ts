import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import type { Plugin } from 'vite';

// Vite plugin to REMOVE CSP headers completely for wallet extensions
// Chrome seems to be enforcing CSP even when we set permissive headers
// So we'll completely remove CSP in development
function cspHeadersPlugin(): Plugin {
  return {
    name: 'csp-headers',
    enforce: 'pre', // Run before other plugins
    configureServer(server) {
      // Insert at the beginning of middleware stack to ensure it runs first
      server.middlewares.stack.unshift({
        route: '',
        handle: (req: any, res: any, next: any) => {
          // In development, completely remove CSP to allow wallet extensions
          // This is safe for localhost development only
          if (process.env.NODE_ENV === 'development') {
            // Remove any existing CSP headers that might be set by Vite or other middleware
            res.removeHeader('Content-Security-Policy');
            res.removeHeader('X-Content-Security-Policy');
            res.removeHeader('X-WebKit-CSP');
            res.removeHeader('Content-Security-Policy-Report-Only');
            
            // Set a header to explicitly allow everything (some browsers need this)
            // But actually, let's not set any CSP at all - let the browser use defaults
            console.log('[CSP Plugin] ✅ CSP REMOVED for development (wallet extensions need eval)');
          }
          next();
        },
      });
    },
    transformIndexHtml(html) {
      // Remove any existing CSP meta tags from HTML
      if (process.env.NODE_ENV === 'development') {
        return html.replace(
          /<meta\s+http-equiv=["']Content-Security-Policy["'][^>]*>/gi,
          '<!-- CSP meta tag removed for development -->'
        );
      }
      return html;
    },
  };
}

export default defineConfig({
  plugins: [react(), cspHeadersPlugin()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  // Allow unsafe-eval in development for LunoKit (wallet extensions may need it)
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
});
