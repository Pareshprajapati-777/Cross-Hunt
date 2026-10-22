const { spawn, execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

function getPythonCommand() {
  // Check local virtual environments first
  const localVenvs = [
    path.join(__dirname, '.venv', 'Scripts', 'python.exe'),
    path.join(__dirname, 'venv', 'Scripts', 'python.exe'),
    path.join(__dirname, 'env', 'Scripts', 'python.exe'),
    path.join(__dirname, '.venv', 'bin', 'python'),
    path.join(__dirname, 'venv', 'bin', 'python'),
  ];

  for (const venvPath of localVenvs) {
    if (fs.existsSync(venvPath)) {
      return venvPath;
    }
  }

  // Candidate commands in priority order based on platform
  const candidates = process.platform === 'win32'
    ? ['python', 'py', 'python3']
    : ['python3', 'python', 'py'];

  for (const cmd of candidates) {
    try {
      execSync(`${cmd} --version`, { stdio: 'ignore' });
      return cmd;
    } catch {
      // Continue searching
    }
  }
  return null;
}

const pythonCmd = getPythonCommand();

if (!pythonCmd) {
  console.error('[BACKEND ERROR] Could not find a working Python executable (checked py, python, python3).');
  console.error('[BACKEND ERROR] Please verify Python is installed and accessible.');
  process.exit(1);
}

const customArgs = process.argv.slice(2);
const backendWatchDir = path.join(__dirname, 'backend', 'app');

const defaultArgs = [
  '-m', 'uvicorn', 'backend.app.main:app',
  '--host', '0.0.0.0',
  '--port', '8000',
  '--reload',
  '--reload-dir', backendWatchDir,
];

const args = customArgs.length > 0 ? customArgs : defaultArgs;

let child = null;
let isShuttingDown = false;
let restartCount = 0;
let lastStartTime = Date.now();

function startServer() {
  if (isShuttingDown) return;

  lastStartTime = Date.now();
  console.log(`[BACKEND] Starting FastAPI server on http://127.0.0.1:8000 (watching backend/app only)...`);

  child = spawn(pythonCmd, args, {
    stdio: 'inherit',
    shell: false,
    env: {
      ...process.env,
      PYTHONUNBUFFERED: '1',
    },
  });

  child.on('error', (err) => {
    console.error('[BACKEND ERROR] Failed to start server:', err);
  });

  child.on('exit', (code, signal) => {
    if (isShuttingDown) {
      process.exit(0);
      return;
    }

    const uptime = Date.now() - lastStartTime;
    // If it ran for more than 10 seconds, reset restart count
    if (uptime > 10000) {
      restartCount = 0;
    } else {
      restartCount++;
    }

    if (restartCount > 5) {
      console.error('[BACKEND CRASH LOOP] Server crashed too frequently. Waiting 5s before next restart attempt...');
      setTimeout(startServer, 5000);
    } else {
      console.warn(`[BACKEND WARNING] Process exited (code: ${code}, signal: ${signal}). Auto-restarting in 1.5s...`);
      setTimeout(startServer, 1500);
    }
  });
}

function handleShutdown() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log('\n[BACKEND] Gracefully stopping backend server...');
  if (child) {
    if (process.platform === 'win32') {
      try {
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

startServer();
