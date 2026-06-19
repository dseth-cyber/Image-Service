const { execFile } = require('child_process');
const { createHash } = require('crypto');
const { Readable } = require('stream');

function createReadStream(filePath) {
  const unc = '//image-smb-server/images';
  const creds = 'camera%smbpass';
  const prefix = unc + '/';
  const relativePath = filePath.startsWith(prefix) ? filePath.slice(prefix.length) : filePath.replace(/^[\\/]+/, '');
  const args = [unc, '-U', creds, '-c', 'get ' + relativePath + ' /dev/stdout'];

  const child = execFile('smbclient', args, { timeout: 30000 });
  const stream = new Readable({
    read() {},
  });

  if (child.stdout) {
    child.stdout.on('data', (chunk) => {
      stream.push(chunk);
    });
    child.stdout.on('end', () => {
      stream.push(null);
    });
  }

  child.on('error', (err) => {
    stream.destroy(err);
  });

  return stream;
}

function computeChecksum(stream) {
  return new Promise((resolve, reject) => {
    const hash = createHash('md5');
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
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
    const p = '//image-smb-server/images/' + f;
    const stream = createReadStream(p);
    const checksum = await computeChecksum(stream);
    const md5 = require('crypto').createHash('md5').update(f).digest('hex');
    console.log(f + ': checksum=' + checksum);
  }
}

main().catch(console.error);
