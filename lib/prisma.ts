import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function getPrismaInstance() {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  const client = new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'warn', 'error'] : ['error'],
  });

  if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = client;
  }

  return client;
}

// Use Object.defineProperty to make this a lazy getter
let _prismaInstance: PrismaClient | undefined;

Object.defineProperty(globalThis, 'prismaInstance', {
  get: () => {
    if (!_prismaInstance) {
      _prismaInstance = getPrismaInstance();
    }
    return _prismaInstance;
  },
});

export const prisma = new Proxy({} as PrismaClient, {
  get(target, prop) {
    return getPrismaInstance()[prop as keyof PrismaClient];
  },
});
