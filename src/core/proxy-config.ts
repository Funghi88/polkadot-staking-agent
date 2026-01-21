/**
 * Dynamic Proxy Configuration for QuickQ VPN
 * 
 * ⚠️ CRITICAL: Never hardcode proxy addresses!
 * QuickQ uses a floating/dynamic proxy that changes.
 * This module reads from environment variables that QuickQ sets automatically.
 */

/**
 * Get SOCKS5 proxy URL from environment variables (set by QuickQ)
 * Returns undefined if no proxy is detected
 */
export function getProxyUrl(): string | undefined {
  // QuickQ sets these environment variables dynamically
  // Check in order of preference
  const proxyUrl = 
    process.env.SOCKS_PROXY ||
    process.env.socks_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy ||
    process.env.HTTPS_PROXY ||
    process.env.https_proxy;

  if (!proxyUrl) {
    return undefined;
  }

  // If it's already a SOCKS5 URL, return as-is
  if (proxyUrl.startsWith('socks5://') || proxyUrl.startsWith('socks://')) {
    return proxyUrl;
  }

  // If it's HTTP/HTTPS proxy, we can't use it for WebSocket
  // Return undefined to use direct connection
  return undefined;
}

/**
 * Check if proxy is available and should be used
 */
export function shouldUseProxy(): boolean {
  return getProxyUrl() !== undefined;
}
