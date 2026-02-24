import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * Test database connection and configuration
 * GET /api/test/db
 */
export async function GET(request: NextRequest) {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    nodeEnv: process.env.NODE_ENV,
    databaseUrl: process.env.DATABASE_URL ? '✓ Set' : '✗ Not set',
  };

  try {
    // Test 1: Basic connection with raw query
    results.connectionTest = 'pending';
    console.log('[DB Test] Testing basic connection...');
    
    const connResult = await prisma.$queryRaw`SELECT NOW() as current_time, version() as db_version`;
    results.connectionTest = 'success';
    results.databaseInfo = connResult;
    console.log('[DB Test] ✓ Connection successful');
  } catch (error: any) {
    results.connectionTest = 'failed';
    results.connectionError = {
      message: error.message,
      code: error.code,
      details: error.toString(),
    };
    console.error('[DB Test] ✗ Connection failed:', error);
    
    return NextResponse.json(results, { status: 503 });
  }

  try {
    // Test 2: Count users
    console.log('[DB Test] Counting users...');
    const userCount = await prisma.user.count();
    results.userCount = userCount;
    console.log(`[DB Test] Users: ${userCount}`);
  } catch (error: any) {
    results.userError = error.message;
    console.error('[DB Test] User count failed:', error);
  }

  try {
    // Test 3: Count workflows
    console.log('[DB Test] Counting workflows...');
    const workflowCount = await prisma.workflow.count();
    results.workflowCount = workflowCount;
    console.log(`[DB Test] Workflows: ${workflowCount}`);
  } catch (error: any) {
    results.workflowError = error.message;
    console.error('[DB Test] Workflow count failed:', error);
  }

  try {
    // Test 4: Count workflow runs
    console.log('[DB Test] Counting workflow runs...');
    const runCount = await prisma.workflowRun.count();
    results.workflowRunCount = runCount;
    console.log(`[DB Test] Workflow runs: ${runCount}`);
  } catch (error: any) {
    results.workflowRunError = error.message;
    console.error('[DB Test] Workflow run count failed:', error);
  }

  try {
    // Test 5: List tables
    console.log('[DB Test] Fetching table list...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    results.tables = (tables as any[]).map((t: any) => t.table_name);
    console.log(`[DB Test] Tables found: ${results.tables.join(', ')}`);
  } catch (error: any) {
    results.tablesError = error.message;
    console.error('[DB Test] Table list failed:', error);
  }

  console.log('[DB Test] Diagnostic complete:', JSON.stringify(results, null, 2));
  return NextResponse.json(results);
}

