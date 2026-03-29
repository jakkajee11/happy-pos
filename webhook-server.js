const http = require('http');
const crypto = require('crypto');
const { execSync } = require('child_process');

const PORT = 21333;
const SECRET = '665628fd634e6293d84e3041ef748d9de7e83a1d';
const REPO_DIR = __dirname;

function verifySignature(payload, signature) {
  if (!SECRET) return true;
  const hmac = crypto.createHmac('sha256', SECRET);
  hmac.update(payload);
  return 'sha256=' + hmac.digest('hex') === signature;
}

const server = http.createServer(async (req, res) => {
  if (req.method !== 'POST') {
    res.writeHead(405);
    return res.end('Method not allowed');
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString();
  const sig = req.headers['x-hub-signature-256'];

  if (sig && !verifySignature(body, sig)) {
    console.log('[REJECTED] Invalid signature');
    res.writeHead(403);
    return res.end('Forbidden');
  }

  try {
    const event = JSON.parse(body);
    const isMainPush = event.ref === 'refs/heads/main' && event.after !== '0000000000000000000000000000000000000000';

    if (!isMainPush) {
      console.log(`[SKIP] ${event.ref} (not main push)`);
      res.writeHead(200);
      return res.end('Ignored');
    }

    const commit = event.after?.slice(0, 7);
    const pusher = event.pusher?.name || 'unknown';
    console.log(`\n[DEPLOY] ${pusher} pushed ${commit} to main`);

    // Build steps
    const steps = [
      { name: 'git pull', cmd: 'git pull origin main' },
      { name: 'npm install', cmd: 'npm install' },
      { name: 'next build', cmd: 'npm run build' },
    ];

    for (const step of steps) {
      console.log(`  → ${step.name}...`);
      try {
        execSync(step.cmd, { cwd: REPO_DIR, stdio: 'pipe', timeout: 300000 });
        console.log(`  ✓ ${step.name} done`);
      } catch (err) {
        console.error(`  ✗ ${step.name} FAILED: ${err.stderr?.toString() || err.message}`);
        res.writeHead(500);
        return res.end(`Build failed at: ${step.name}`);
      }
    }

    // Kill existing next start process and restart
    console.log('  → Restarting next start...');
    try {
      execSync("pkill -f 'next start -p 21300' || true", { timeout: 5000 });
    } catch {}

    // Start in background
    const spawn = require('child_process').spawn;
    spawn('npm', ['start'], { cwd: REPO_DIR, detached: true, stdio: 'ignore' }).unref();

    console.log(`  ✓ Deploy complete! (${commit})`);
    res.writeHead(200);
    res.end(`Deployed ${commit}`);
  } catch (err) {
    console.error('[ERROR]', err.message);
    res.writeHead(500);
    res.end('Error');
  }
});

server.listen(PORT, () => {
  console.log(`Webhook server listening on port ${PORT}`);
});
