const { execFile } = require('child_process');
const { createHash } = require('crypto');
const crypto = require('crypto');

function runSmbClient(args) {
  return new Promise((resolve, reject) => {
    execFile('smbclient', args, { timeout: 15000 }, (err, stdout, stderr) => {
      resolve({ stdout, stderr, err, code: err ? err.code : 'ok' });
    });
  });
}

async function main() {
  const files = [
    'test_small.tiff',
    'test_medium.tiff',
    'test_large.tiff',
    'test_cmyk.tiff',
    'test_grayscale.tiff',
    'test_multipage.tiff',
    'test_xlarge.tiff',
  ];

  for (const f of files) {
    const result = await runSmbClient([
      '//image-smb-server/images',
      '-U', 'camera%smbpass',
      '-c', `get ${f} -`.replace(/'/g, "'"),
    ]);
    const hash = crypto.createHash('md5');
    hash.update(result.stdout);
    const md5 = hash.digest('hex');
    console.log(`${f}: md5=${md5}, size=${result.stdout.length}`);
  }
}

main().catch(console.error);
