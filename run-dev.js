const { spawn } = require('child_process');
const path = require('path');

console.log('='.repeat(65));
console.log('  ⚓ CROSS-HUNT HIGH-AVAILABILITY DEV RUNNER (FastAPI + Vite)');
console.log('='.repeat(65));
console.log('[DEV] Starting Backend and Frontend with Auto-Restart Protection...');
console.log('[DEV] Note: If you press Ctrl+C once (e.g. copying text), the app will KEEP running.');
console.log('[DEV] Press Ctrl+C TWICE within 1.5 seconds to fully shut down.\n');

let backendProcess = null;
let frontendProcess = null;
let isShuttingDown = false;
let lastCtrlCTime = 0;

function startBackend() {
  if (isShuttingDown) return;

  backendProcess = spawn(process.execPath, [path.join(__dirname, 'run-backend.js')], {
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  backendProcess.on('exit', (code, signal) => {
    if (isShuttingDown) return;
    console.warn(`\n[DEV WARNING] Backend stopped (code ${code}, signal ${signal}). Restarting in 1.5s...`);
    setTimeout(startBackend, 1500);
  });
}

function startFrontend() {
  if (isShuttingDown) return;

  frontendProcess = spawn(process.execPath, [path.join(__dirname, 'run-frontend.js')], {
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  frontendProcess.on('exit', (code, signal) => {
    if (isShuttingDown) return;
    console.warn(`\n[DEV WARNING] Frontend stopped (code ${code}, signal ${signal}). Restarting in 1.5s...`);
    setTimeout(startFrontend, 1500);
  });
}

function fullShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n[DEV] Shutting down Cross-Hunt server processes gracefully...');

  const killProc = (proc, name) => {
    if (!proc || !proc.pid) return;
    if (process.platform === 'win32') {
      try {
        const { execSync } = require('child_process');
        execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'ignore' });
      } catch {
        try { proc.kill('SIGTERM'); } catch {}
      }
    } else {
      try { proc.kill('SIGTERM'); } catch {}
    }
  };

  killProc(backendProcess, 'backend');
  killProc(frontendProcess, 'frontend');

  setTimeout(() => {
    console.log('[DEV] All servers stopped. Goodbye!');
    process.exit(0);
  }, 1000);
}

// Handle Ctrl+C double-tap protection against accidental shutdown
process.on('SIGINT', () => {
  const now = Date.now();
  if (now - lastCtrlCTime < 1500) {
    fullShutdown();
  } else {
    lastCtrlCTime = now;
    console.log('\n\x1b[33m[DEV] Accidental Ctrl+C prevented! Press Ctrl+C again within 1.5s to shut down.\x1b[0m\n');
  }
});

process.on('SIGTERM', fullShutdown);

// Start both
startBackend();
startFrontend();
