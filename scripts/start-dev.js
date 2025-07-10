const { spawn } = require('child_process');
const net = require('net');

// ポートが使用可能かチェックする関数
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.once('close', () => {
        resolve(true);
      });
      server.close();
    });
    server.on('error', () => {
      resolve(false);
    });
  });
}

// 利用可能なポートを見つける関数
async function findAvailablePort(startPort = 3005) {
  let port = startPort;
  while (!(await isPortAvailable(port))) {
    port++;
    if (port > 3015) {
      console.error('利用可能なポートが見つかりませんでした（3005-3015）');
      process.exit(1);
    }
  }
  return port;
}

// メイン処理
async function startDev() {
  try {
    const port = await findAvailablePort(3005);
    
    if (port !== 3005) {
      console.log(`⚠️  ポート3005が使用中のため、ポート${port}で起動します`);
    } else {
      console.log('🚀 ポート3005で起動します');
    }
    
    console.log(`📱 アプリケーション: http://localhost:${port}`);
    console.log(`🔍 ヘルスチェック: http://localhost:${port}/api/health`);
    
    // Next.js開発サーバーを起動
    const child = spawn('npx', ['next', 'dev', '-p', port.toString()], {
      stdio: 'inherit',
      shell: true
    });
    
    child.on('error', (error) => {
      console.error('開発サーバーの起動に失敗しました:', error);
      process.exit(1);
    });
    
    child.on('exit', (code) => {
      console.log(`開発サーバーが終了しました（コード: ${code}）`);
      process.exit(code);
    });
    
  } catch (error) {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  }
}

startDev(); 