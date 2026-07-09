require('dotenv').config();
const http = require('http');
const app = require('./app');
const { prisma } = require('./src/prisma/client');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn } = require('child_process');
const path = require('path');

const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';
const SHUTDOWN_TIMEOUT_MS = 10_000;

let server;
let nextProcess;

async function waitForNextReady(port, maxWaitMs = 30_000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      await new Promise((resolve, reject) => {
        const req = http.get(`http://localhost:${port}`, resolve);
        req.on('error', reject);
        req.setTimeout(3000, () => {
          req.destroy();
          reject(new Error('timeout'));
        });
      });
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return false;
}

function gracefulShutdown(signal) {
  console.log(`\n[${signal}] Iniciando apagado controlado...`);

  if (nextProcess && !nextProcess.killed) {
    nextProcess.kill('SIGTERM');
    setTimeout(() => {
      if (nextProcess && !nextProcess.killed) {
        nextProcess.kill('SIGKILL');
      }
    }, 5000);
  }

  if (server) {
    server.close((err) => {
      if (err) console.error('Error cerrando servidor HTTP:', err);
    });
  }

  setTimeout(async () => {
    try {
      const wsService = require('./src/services/websocket.service');
      if (wsService.io) {
        wsService.io.close();
        console.log('WebSocket cerrado');
      }
      await prisma.$disconnect();
      console.log('Base de datos desconectada');
    } catch (e) {
      console.error('Error en limpieza:', e);
    }
    process.exit(0);
  }, SHUTDOWN_TIMEOUT_MS).unref();
}

async function main() {
  try {
    await prisma.$connect();
    console.log('Database connected');

    server = http.createServer(app);

    const wsService = require('./src/services/websocket.service');
    wsService.init(server);

    if (isProduction) {
      const frontendDir = path.join(__dirname, '..', 'frontend');
      const nextPort = 3000;
      const nodeBin = process.execPath;
      const npxBin = path.join(path.dirname(nodeBin), 'npx');

      console.log('Starting Next.js on port', nextPort);
      nextProcess = spawn(npxBin, ['next', 'start', '-p', String(nextPort)], {
        cwd: frontendDir,
        stdio: 'pipe'
      });

      nextProcess.stderr.on('data', (d) => process.stderr.write('[next] ' + d));
      nextProcess.stdout.on('data', (d) => process.stdout.write('[next] ' + d));

      nextProcess.on('error', (err) => {
        console.error('Next.js failed:', err.message);
      });
      nextProcess.on('exit', (code) => {
        console.error('Next.js exited with code', code);
      });

      const ready = await waitForNextReady(nextPort, 30_000);

      if (ready) {
        try {
          app.use('/', createProxyMiddleware({
            target: `http://localhost:${nextPort}`,
            changeOrigin: true,
            ws: true
          }));
          console.log('Frontend proxy ready');
        } catch (e) {
          console.warn('Proxy setup failed, API-only mode:', e.message);
        }
      } else {
        console.warn('Next.js no respondio a tiempo, API-only mode');
      }
    }

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`WebSocket ready on ws://localhost:${PORT}`);
      if (isProduction) console.log('   Mode: production (API + Frontend + WebSocket)');
      else console.log('   Mode: development (API + WebSocket)');
    });

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

main();
