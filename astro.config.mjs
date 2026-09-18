import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://propaknews.com',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  server: { port: 4321, host: '127.0.0.1' },
  security: {
    checkOrigin: true,
    // Hosts the server is allowed to believe it is serving. Anything else
    // falls back to "localhost", which broke same-origin form/upload checks.
    allowedDomains: [
      { hostname: 'propaknews.com' },
      { hostname: 'www.propaknews.com' },
      { hostname: 'localhost' },
      { hostname: '127.0.0.1' },
    ],
  },
});
