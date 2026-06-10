require('dotenv').config();
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

    if (isProduction) {
      const frontendDir = path.join(__dirname, '..', 'frontend');
      const nextPort = 3000;

      console.log('Starting Next.js...');
      const nextProcess = spawn('npx', ['next', 'start', '-p', String(nextPort)], {
        cwd: frontendDir,
        stdio: 'inherit',
        shell: true
      });

      nextProcess.on('error', (err) => {
        console.error('Next.js error:', err.message);
      });

      process.on('exit', () => nextProcess.kill());

      await new Promise(resolve => setTimeout(resolve, 5000));

      app.use('*', createProxyMiddleware({
        target: `http://localhost:${nextPort}`,
        changeOrigin: true,
        filter: (pathname) => !pathname.startsWith('/api')
      }));

      console.log('✅ Frontend proxy ready');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      if (isProduction) console.log('   Mode: production (API + Frontend)');
      else console.log('   Mode: development (API only)');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

main();
