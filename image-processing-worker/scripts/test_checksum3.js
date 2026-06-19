const { execFile } = require('child_process');
const { createHash } = require('crypto');

function runSmbClient(args) {
  return new Promise((resolve, reject) => {
    execFile('smbclient', args, { timeout: 15000 }, (err, stdout, stderr) => {
      resolve({ stdout, stderr, err, code: err ? err.code : 'ok' });
    });
  });
}

async function main() {
  // Test: get without /dev/stdout
  const result = await runSmbClient([
    '//image-smb-server/images',
    '-U', 'camera%smbpass',
    '-c', 'get test_small.tiff',
  ]);
  console.log('Without /dev/stdout:');
  console.log('  stdout.length:', result.stdout.length);
  console.log('  stderr:', JSON.stringify(result.stderr));
  console.log('  error:', result.err ? result.err.message : 'none');

  // Get MD5
  const hash = createHash('md5');
  hash.update(result.stdout.slice(0, result.stdout.length));
  console.log('  md5:', hash.digest('hex'));
}

main().catch(console.error);
