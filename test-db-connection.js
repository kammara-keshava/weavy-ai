#!/usr/bin/env node

/**
 * Prisma + Supabase Connection Test & Repair
 * 
 * This script:
 * 1. Verifies DATABASE_URL configuration
 * 2. Tests Prisma client connection
 * 3. Provides diagnostic information
 * 4. Suggests fixes if needed
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  bold: "\x1b[1m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function header(title) {
  log("", "reset");
  log("═".repeat(60), "cyan");
  log(title, "cyan bold");
  log("═".repeat(60), "cyan");
  log("", "reset");
}

function success(message) {
  log(`✅ ${message}`, "green");
}

function error(message) {
  log(`❌ ${message}`, "red");
}

function warning(message) {
  log(`⚠️  ${message}`, "yellow");
}

function info(message) {
  log(`ℹ️  ${message}`, "cyan");
}

async function main() {
  header("Prisma + Supabase Connection Diagnostic");

  // Step 1: Check .env.local
  log("Step 1: Checking environment configuration...", "bold");
  
  const envLocalPath = path.join(process.cwd(), ".env.local");
  const envPath = path.join(process.cwd(), ".env");
  
  if (!fs.existsSync(envLocalPath)) {
    error(".env.local not found");
    log("Please create .env.local with DATABASE_URL", "yellow");
    process.exit(1);
  }
  success(".env.local found");

  // Read environment
  const envContent = fs.readFileSync(envLocalPath, "utf-8");
  const databaseUrlMatch = envContent.match(/^DATABASE_URL="?([^"\n]+)"?/m);
  
  if (!databaseUrlMatch) {
    error("DATABASE_URL not found in .env.local");
    process.exit(1);
  }

  const databaseUrl = databaseUrlMatch[1];
  success("DATABASE_URL found");
  log(`URL: ${databaseUrl.substring(0, 80)}...`, "cyan");

  // Check URL format
  log("", "reset");
  log("Step 2: Verifying Session Pooler configuration...", "bold");

  if (databaseUrl.includes("pooler.supabase.com")) {
    success("Using Session Pooler (correct)");
  } else if (databaseUrl.includes("db.") && databaseUrl.includes("supabase.co")) {
    error("Using Direct Connection - this causes P1001 errors");
    warning("You must use Session Pooler instead");
    log("", "reset");
    log("Fix: Get Session Pooler URL from Supabase Dashboard:", "yellow");
    log("  1. Go to Supabase Dashboard", "yellow");
    log("  2. Select your project", "yellow");
    log("  3. Click 'Connect'", "yellow");
    log("  4. Select 'Session Pooler' tab", "yellow");
    log("  5. Copy connection string", "yellow");
    log("  6. Update DATABASE_URL in .env.local", "yellow");
    process.exit(1);
  } else {
    warning("Unrecognized connection format");
  }

  // Check SSL
  if (databaseUrl.includes("sslmode=require")) {
    success("SSL/TLS enabled");
  } else {
    warning("SSL/TLS not explicitly enabled");
  }

  // Step 3: Check Prisma schema
  log("", "reset");
  log("Step 3: Checking Prisma schema...", "bold");

  const schemaPath = path.join(process.cwd(), "prisma", "schema.prisma");
  if (fs.existsSync(schemaPath)) {
    success("prisma/schema.prisma found");
    const schemaContent = fs.readFileSync(schemaPath, "utf-8");
    if (schemaContent.includes('url = env("DATABASE_URL")')) {
      success("Schema correctly references DATABASE_URL from environment");
    } else {
      warning("Schema may not be using env('DATABASE_URL')");
    }
  } else {
    warning("prisma/schema.prisma not found");
  }

  // Step 4: Check Prisma client
  log("", "reset");
  log("Step 4: Checking Prisma client installation...", "bold");

  try {
    require("@prisma/client");
    success("@prisma/client is installed");
  } catch (e) {
    error("@prisma/client not found - install with: npm install");
    process.exit(1);
  }

  // Step 5: Test connection
  log("", "reset");
  log("Step 5: Testing database connection...", "bold");

  try {
    const { PrismaClient } = require("@prisma/client");
    const prisma = new PrismaClient({
      log: [],
      errorFormat: "pretty",
    });

    info("Attempting connection to Supabase...");
    
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT 1`;
    
    await prisma.$disconnect();
    
    success("✨ Database connection successful!");
    success("Your Prisma can connect to Supabase");
    
    log("", "reset");
    header("✅ All Checks Passed");
    
    log("Next steps:", "bold");
    log("  1. npx prisma db pull  (to sync schema)", "cyan");
    log("  2. npm run dev          (to start development)", "cyan");
    log("", "reset");
    
  } catch (err) {
    error("Database connection failed");
    log("", "reset");
    log("Error details:", "bold");
    log(err.message, "red");
    log("", "reset");

    // Provide specific guidance
    if (err.message.includes("ECONNREFUSED")) {
      error("Connection refused - database may be offline");
      log("", "reset");
      log("Troubleshooting:", "yellow");
      log("  1. Verify Supabase project is Active (not Paused)", "yellow");
      log("  2. Check DATABASE_URL is correct", "yellow");
      log("  3. Verify network allows outbound to port 5432", "yellow");
      
    } else if (err.message.includes("authentication failed")) {
      error("Password authentication failed");
      log("", "reset");
      log("Troubleshooting:", "yellow");
      log("  1. Check password in DATABASE_URL", "yellow");
      log("  2. Get new Session Pooler URL from Supabase Dashboard", "yellow");
      log("  3. Update .env.local and retry", "yellow");
      
    } else if (err.message.includes("db.") && err.message.includes("supabase.co")) {
      error("Still trying to use Direct Connection");
      log("", "reset");
      log("Troubleshooting:", "yellow");
      log("  1. You must use Session Pooler (pooler.supabase.com)", "yellow");
      log("  2. Update DATABASE_URL in .env.local", "yellow");
      log("  3. Run: npx prisma generate", "yellow");
      log("  4. Run: npx prisma db pull", "yellow");
    }

    log("", "reset");
    log("Quick fix steps:", "yellow");
    log("  1. rm -rf node_modules/.prisma/client", "yellow");
    log("  2. npm install", "yellow");
    log("  3. npx prisma generate", "yellow");
    log("  4. npx prisma db pull", "yellow");
    log("  5. npm run dev", "yellow");
    log("", "reset");

    process.exit(1);
  }
}

main().catch((err) => {
  error("Fatal error: " + err.message);
  process.exit(1);
});
