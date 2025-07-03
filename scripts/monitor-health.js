#!/usr/bin/env node

const https = require('https');
const http = require('http');

const BASE_URL = process.env.RAILWAY_URL || 'https://blogpostplatform-production.up.railway.app';
const CHECK_INTERVAL = 30000; // 30秒間隔
const MAX_RETRIES = 3;

console.log('🔍 Railway Health Monitor Started');
console.log('Base URL:', BASE_URL);
console.log('Check interval:', CHECK_INTERVAL / 1000, 'seconds');
console.log('===================================');

async function checkHealth() {
  const timestamp = new Date().toISOString();
  
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    console.log(`[${timestamp}] ✅ Health Check PASSED`);
    console.log(`  - Status: ${data.status}`);
    console.log(`  - Uptime: ${data.uptime}s`);
    console.log(`  - Memory: RSS ${data.memory.rss}MB, Heap ${data.memory.heapUsed}MB`);
    console.log(`  - Database: ${data.database.status} (${data.database.latency}ms)`);
    console.log(`  - Latency: ${data.latency}ms`);
    
    if (data.warnings && data.warnings.length > 0) {
      console.log('  ⚠️  Warnings:');
      data.warnings.forEach(warning => {
        console.log(`    - ${warning}`);
      });
    }
    
    // メモリ使用量が危険レベルに達した場合はアラート
    if (data.memory.rss > 400) {
      console.log('  🚨 HIGH MEMORY USAGE DETECTED!');
      console.log('  🚨 Container may be killed soon!');
    }
    
    return { success: true, data };
    
  } catch (error) {
    console.log(`[${timestamp}] ❌ Health Check FAILED`);
    console.log(`  - Error: ${error.message}`);
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
      console.log('  🚨 SERVER IS DOWN OR UNREACHABLE!');
    }
    
    return { success: false, error: error.message };
  }
}

async function checkWithRetry(retries = MAX_RETRIES) {
  for (let i = 0; i < retries; i++) {
    const result = await checkHealth();
    
    if (result.success) {
      return result;
    }
    
    if (i < retries - 1) {
      console.log(`  🔄 Retrying in 5 seconds... (${i + 1}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.log('  💀 All retries failed. Container may be dead.');
  return { success: false, error: 'All retries failed' };
}

async function startMonitoring() {
  console.log('Starting continuous monitoring...');
  
  let consecutiveFailures = 0;
  
  while (true) {
    const result = await checkWithRetry();
    
    if (result.success) {
      consecutiveFailures = 0;
    } else {
      consecutiveFailures++;
      
      if (consecutiveFailures >= 3) {
        console.log(`🚨 CRITICAL: ${consecutiveFailures} consecutive failures!`);
        console.log('🚨 Container is likely dead or restarting!');
        
        // 緊急時の通知やアクションをここに追加
        // 例: Slack通知、メール送信、自動再起動など
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, CHECK_INTERVAL));
  }
}

// 即座に1回チェックを実行
checkHealth().then(result => {
  if (result.success) {
    console.log('\n✅ Initial health check passed. Starting monitoring...\n');
    startMonitoring();
  } else {
    console.log('\n❌ Initial health check failed. Exiting...\n');
    process.exit(1);
  }
});

// プロセス終了時のクリーンアップ
process.on('SIGINT', () => {
  console.log('\n🛑 Monitoring stopped by user');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Monitoring stopped by system');
  process.exit(0);
}); 