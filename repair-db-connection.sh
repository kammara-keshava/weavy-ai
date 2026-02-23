#!/bin/bash

# Prisma + Supabase Connection Repair Script
# This script fixes P1001 error: Can't reach database server

set -e

echo "================================================"
echo "  Prisma + Supabase Connection Repair"
echo "================================================"
echo ""

PROJECT_ROOT="$PWD"

# Step 1: Verify environment setup
echo "Step 1: Verifying environment configuration..."
if [ -f ".env.local" ]; then
    echo "✅ .env.local found"
    DATABASE_URL=$(grep "^DATABASE_URL" .env.local | cut -d'=' -f2 | tr -d '"')
    echo "   URL: ${DATABASE_URL:0:60}..."
    
    # Check if using Session Pooler
    if [[ $DATABASE_URL == *"pooler.supabase.com"* ]]; then
        echo "   ✅ Using Session Pooler (correct)"
    else
        echo "   ❌ NOT using Session Pooler - this is the problem!"
        exit 1
    fi
else
    echo "❌ .env.local not found!"
    exit 1
fi

echo ""
echo "Step 2: Clearing Prisma cache..."
# Remove cached Prisma client
rm -rf "node_modules/.prisma/client"
rm -rf ".next"
echo "✅ Cache cleared"

echo ""
echo "Step 3: Regenerating Prisma client..."
npx prisma generate
echo "✅ Prisma client regenerated"

echo ""
echo "Step 4: Verifying database connection..."
# Create a test file
cat > "__test_db_connection.js" << 'EOF'
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient({
  log: ["error", "warn"],
});

async function testConnection() {
  try {
    console.log("Testing connection to Supabase...");
    const result = await prisma.$queryRaw`SELECT 1`;
    console.log("✅ Connection successful!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    console.error("\nTroubleshooting steps:");
    console.error("1. Verify DATABASE_URL uses Session Pooler (pooler.supabase.com)");
    console.error("2. Check password is correct in DATABASE_URL");
    console.error("3. Ensure Supabase project is active (not paused)");
    console.error("4. Check network allows port 5432");
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
EOF

node "__test_db_connection.js"
TEST_RESULT=$?
rm "__test_db_connection.js"

if [ $TEST_RESULT -eq 0 ]; then
    echo ""
    echo "================================================"
    echo "  ✅ ALL CHECKS PASSED"
    echo "================================================"
    echo ""
    echo "Your Prisma connection to Supabase is working!"
    echo ""
    echo "Next steps:"
    echo "  1. Run: npm run db:push (to sync schema)"
    echo "  2. Run: npm run dev (to start development)"
    echo ""
else
    echo ""
    echo "================================================"
    echo "  ❌ CONNECTION FAILED"
    echo "================================================"
    echo ""
    exit 1
fi
