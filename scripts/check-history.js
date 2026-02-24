const { PrismaClient } = require('@prisma/client');
(async () => {
  const prisma = new PrismaClient();
  try {
    console.log('Listing recent WorkflowRun records (limit 20):');
    const runs = await prisma.workflowRun.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: true, workflow: true, nodes: true },
    });
    console.log('Total runs fetched:', runs.length);
    runs.forEach((r) => {
      console.log('---');
      console.log('run.id:', r.id);
      console.log('run.workflowId:', r.workflowId);
      console.log('run.userId:', r.userId);
      console.log('run.type:', r.type, 'status:', r.status, 'createdAt:', r.createdAt);
      console.log('user.clerkId:', r.user?.clerkId, 'user.id:', r.user?.id, 'user.email:', r.user?.email);
      console.log('node count:', Array.isArray(r.nodes) ? r.nodes.length : r.nodes);
    });

    const userCount = await prisma.user.count();
    console.log('Total users:', userCount);

  } catch (e) {
    console.error('Error querying workflow runs:', e);
  } finally {
    await prisma.$disconnect();
  }
})();
