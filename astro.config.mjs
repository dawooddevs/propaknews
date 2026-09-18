import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://propaknews.com',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  server: { port: 4321, host: '127.0.0.1' },
});
