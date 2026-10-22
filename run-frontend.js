const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const frontendDir = path.join(__dirname, 'frontend');
const viteBin = path.join(frontendDir, 'node_modules', 'vite', 'bin', 'vite.js');

let child = null;
let isShuttingDown = false;
let restartCount = 0;
let lastStartTime = Date.now();

function getCommandAndArgs() {
  if (fs.existsSync(viteBin)) {
    return { cmd: process.execPath, args: [viteBin, '--host', '0.0.0.0'] };
  }
  // Fallback to npx
  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  return { cmd: npxCmd, args: ['vite', '--host', '0.0.0.0'] };
}

function startFrontend() {
  if (isShuttingDown) return;

  lastStartTime = Date.now();
  console.log('[FRONTEND] Starting Vite Dev Server on http://127.0.0.1:5173...');

  const { cmd, args } = getCommandAndArgs();

  child = spawn(cmd, args, {
    cwd: frontendDir,
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      FORCE_COLOR: '1',
    },
  });

  child.on('error', (err) => {
    console.error('[FRONTEND ERROR] Failed to start Vite:', err);
  });

  child.on('exit', (code, signal) => {
    if (isShuttingDown) {
      process.exit(0);
      return;
    }

    const uptime = Date.now() - lastStartTime;
    if (uptime > 10000) {
      restartCount = 0;
    } else {
      restartCount++;
    }

    if (restartCount > 5) {
      console.error('[FRONTEND CRASH LOOP] Vite crashed repeatedly. Waiting 5s before next restart...');
      setTimeout(startFrontend, 5000);
    } else {
      console.warn(`[FRONTEND WARNING] Vite stopped (code: ${code}, signal: ${signal}). Auto-restarting in 1.5s...`);
      setTimeout(startFrontend, 1500);
    }
  });
}

function handleShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n[FRONTEND] Gracefully stopping Vite dev server...');
  if (child) {
    if (process.platform === 'win32') {
      try {
        const { execSync } = require('child_process');
        execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
      } catch {
        child.kill('SIGTERM');
      }
    } else {
      child.kill('SIGTERM');
    }
  }
  setTimeout(() => process.exit(0), 1000);
}

process.on('SIGINT', handleShutdown);
process.on('SIGTERM', handleShutdown);

startFrontend();
