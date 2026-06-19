const { execFile } = require('child_process');
const { Readable } = require('stream');
const { createHash } = require('crypto');

function createReadStream(filePath) {
  const unc = '//image-smb-server/images';
  const creds = 'camera%smbpass';
  const prefix = unc + '/';
  const relativePath = filePath.startsWith(prefix) ? filePath.slice(prefix.length) : filePath.replace(/^[\\/]+/, '');
  const args = [unc, '-U', creds, '-c', 'get ' + relativePath + ' -'];

  console.log('  args:', JSON.stringify(args));
  const child = execFile('smbclient', args, { timeout: 30000 });
  const stream = new Readable({
    read() {},
  });

  if (child.stdout) {
    child.stdout.on('data', (chunk) => {
      stream.push(chunk);
    });
    child.stdout.on('end', () => {
      console.log('  stdout end');
      stream.push(null);
    });
  }

  child.on('error', (err) => {
    console.log('  child error:', err.message);
    stream.destroy(err);
  });

  child.on('exit', (code) => {
    console.log('  child exit:', code);
  });

  child.on('close', (code) => {
    console.log('  child close:', code);
  });

  return stream;
}

function computeChecksum(stream) {
  return new Promise((resolve, reject) => {
    const hash = createHash('md5');
    let totalBytes = 0;
    stream.on('data', (chunk) => {
      hash.update(chunk);
      totalBytes += chunk.length;
    });
    stream.on('end', () => {
      console.log('  stream end, total bytes:', totalBytes);
      resolve(hash.digest('hex'));
    });
    stream.on('error', reject);
    stream.on('close', () => console.log('  stream close'));
  });
}

async function main() {
  const files = ['test_cmyk.tiff', 'test_small.tiff'];
  for (const f of files) {
    console.log('Processing:', f);
    const p = '//image-smb-server/images/' + f;
    const stream = createReadStream(p);
    const checksum = await computeChecksum(stream);
    console.log('  checksum:', checksum);
  }
  console.log('DONE');
}

main().catch(console.error);
