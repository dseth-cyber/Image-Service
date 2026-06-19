const { execFile } = require('child_process');

function runSmbClient(args) {
  return new Promise((resolve, reject) => {
    execFile('smbclient', args, { timeout: 15000 }, (err, stdout, stderr) => {
      resolve({ stdout, stderr, err });
    });
  });
}

async function main() {
  // Test 1: UNC path (old broken code)
  const result1 = await runSmbClient([
    '//image-smb-server/images',
    '-U', 'camera%smbpass',
    '-c', 'get //image-smb-server/images/test_small.tiff /dev/stdout',
  ]);
  console.log('UNC path:');
  console.log('  stdout length:', result1.stdout.length);
  console.log('  stdout first 100:', JSON.stringify(result1.stdout.slice(0, 100)));
  console.log('  stderr:', JSON.stringify(result1.stderr.slice(0, 200)));

  // Test 2: Relative path (new fixed code)
  const result2 = await runSmbClient([
    '//image-smb-server/images',
    '-U', 'camera%smbpass',
    '-c', 'get test_small.tiff /dev/stdout',
  ]);
  console.log('Relative path:');
  console.log('  stdout length:', result2.stdout.length);
  console.log('  stdout first 100:', JSON.stringify(result2.stdout.slice(0, 100)));
  console.log('  stderr:', JSON.stringify(result2.stderr.slice(0, 200)));
}

main().catch(console.error);
