const { execFile } = require('child_process');

function runWithCallback(args) {
  return new Promise((resolve) => {
    execFile('smbclient', args, { timeout: 10000, maxBuffer: 1024 * 1024 * 100 }, (err, stdout, stderr) => {
      resolve({ type: 'callback', stdoutLen: stdout.length, stdoutFirst100: JSON.stringify(stdout.slice(0, 100)), stderrLen: stderr.length, err: err ? err.message : null });
    });
  });
}

function runWithStream(args) {
  return new Promise((resolve) => {
    const child = execFile('smbclient', args, { timeout: 10000 });
    let stdoutLen = 0;
    let stderrLen = 0;
    let first100 = '';

    if (child.stdout) {
      child.stdout.on('data', (chunk) => {
        stdoutLen += chunk.length;
        if (first100.length < 100) first100 += chunk.slice(0, 100 - first100.length).toString('utf8').replace(/[^\x20-\x7e]/g, '.');
      });
    }
    if (child.stderr) {
      child.stderr.on('data', (chunk) => { stderrLen += chunk.length; });
    }
    child.on('close', () => {
      resolve({ type: 'stream', stdoutLen, first100, stderrLen });
    });
  });
}

async function main() {
  const args = ['//image-smb-server/images', '-U', 'camera%smbpass', '-c', 'get test_small.tiff -'];
  const cb = await runWithCallback(args);
  console.log('CALLBACK:', JSON.stringify(cb));

  const st = await runWithStream(args);
  console.log('STREAM:', JSON.stringify(st));
}

main().catch(console.error);
