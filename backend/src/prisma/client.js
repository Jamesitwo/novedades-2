const { PrismaClient } = require('@prisma/client');

const dbUrl = new URL(process.env.DATABASE_URL);
dbUrl.searchParams.set('connection_limit', '15');
dbUrl.searchParams.set('pool_timeout', '10');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl.toString()
    }
  },
  log: process.env.NODE_ENV === 'production'
    ? [{ level: 'error', emit: 'stdout' }, { level: 'warn', emit: 'stdout' }]
    : [{ level: 'warn', emit: 'stdout' }]
});

module.exports = { prisma };
