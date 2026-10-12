const { spawn, execSync } = require('child_process');

function getPythonCommand() {
  // Candidate commands in priority order based on platform
  const candidates = process.platform === 'win32'
    ? ['py', 'python', 'python3']
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
const args = customArgs.length > 0 ? customArgs : ['manage.py', 'runserver', '127.0.0.1:8000'];

const child = spawn(pythonCmd, args, {
  stdio: 'inherit',
  shell: false
});

child.on('exit', (code) => {
  process.exit(code || 0);
});

process.on('SIGINT', () => {
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  child.kill('SIGTERM');
});
