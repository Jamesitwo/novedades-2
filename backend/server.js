require('dotenv').config();
const http = require('http');
const app = require('./app');
const { prisma } = require('./src/prisma/client');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn } = require('child_process');
const path = require('path');

const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

async function main() {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    const server = http.createServer(app);

    const wsService = require('./src/services/websocket.service');
    wsService.init(server);

    if (isProduction) {
      const frontendDir = path.join(__dirname, '..', 'frontend');
      const nextPort = 3000;

      console.log('Starting Next.js on port', nextPort);
      const nextProcess = spawn('npx', ['next', 'start', '-p', String(nextPort)], {
        cwd: frontendDir,
        stdio: 'pipe',
        shell: true
      });

      nextProcess.stderr.on('data', (d) => process.stderr.write('[next] ' + d));
      nextProcess.stdout.on('data', (d) => process.stdout.write('[next] ' + d));

      nextProcess.on('error', (err) => {
        console.error('Next.js failed:', err.message);
      });
      nextProcess.on('exit', (code) => {
        console.error('Next.js exited with code', code);
      });

      process.on('exit', () => nextProcess.kill());

      await new Promise(resolve => setTimeout(resolve, 8000));

      try {
        app.use('/', createProxyMiddleware({
          target: `http://localhost:${nextPort}`,
          changeOrigin: true,
          ws: true
        }));
        console.log('✅ Frontend proxy ready');
      } catch (e) {
        console.warn('⚠ Proxy setup failed, API-only mode:', e.message);
      }
    }

    server.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔌 WebSocket ready on ws://localhost:${PORT}`);
      if (isProduction) console.log('   Mode: production (API + Frontend + WebSocket)');
      else console.log('   Mode: development (API + WebSocket)');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main();
