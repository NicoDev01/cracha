#!/usr/bin/env node

/**
 * Proxy für Wrangler Dev OAuth-Callbacks
 * Löst SSL-Probleme bei localhost:8787
 */

const http = require('http');
const https = require('https');
const url = require('url');

const WRANGLER_PORT = 8787;
const PROXY_PORT = 8788;

const server = http.createServer((req, res) => {
  console.log(`🔄 Proxy request: ${req.method} ${req.url}`);

  // Nur OAuth-Callbacks proxyen
  if (req.url.startsWith('/auth/callback')) {
    const targetUrl = `http://localhost:${WRANGLER_PORT}${req.url}`;

    console.log(`🔗 Proxying to: ${targetUrl}`);

    const options = {
      hostname: 'localhost',
      port: WRANGLER_PORT,
      path: req.url,
      method: req.method,
      headers: req.headers
    };

    const proxyReq = http.request(options, (proxyRes) => {
      // Handle redirects
      if (proxyRes.statusCode >= 300 && proxyRes.statusCode < 400) {
        const location = proxyRes.headers.location;
        console.log(`🔄 Redirect to: ${location}`);

        res.writeHead(proxyRes.statusCode, {
          'Location': location,
          'Access-Control-Allow-Origin': '*'
        });
        res.end();
        return;
      }

      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });

    proxyReq.on('error', (err) => {
      console.error('❌ Proxy error:', err);
      res.writeHead(500);
      res.end('Proxy Error');
    });

    req.pipe(proxyReq);
  } else {
    res.writeHead(404);
    res.end('Not Found - Use for OAuth callbacks only');
  }
});

server.listen(PROXY_PORT, () => {
  console.log(`🚀 OAuth Proxy running on http://localhost:${PROXY_PORT}`);
  console.log(`📡 Proxying /auth/callback to http://localhost:${WRANGLER_PORT}`);
  console.log(`💡 Use http://localhost:${PROXY_PORT}/auth/callback as redirect URL for development`);
});