const { execFile } = require('child_process');
const { Readable } = require('stream');

function createReadStream(filePath) {
  const unc = '//image-smb-server/images';
  const creds = 'camera%smbpass';
  const prefix = unc + '/';
  const relativePath = filePath.startsWith(prefix) ? filePath.slice(prefix.length) : filePath.replace(/^[\\/]+/, '');
  const args = [unc, '-U', creds, '-c', 'get ' + relativePath + ' -'];
  const child = execFile('smbclient', args, { timeout: 30000 });
  const stream = new Readable({ read() {} });
  if (child.stdout) {
    child.stdout.on('data', (chunk) => { stream.push(chunk); });
    child.stdout.on('end', () => { stream.push(null); });
  }
  child.on('error', (err) => { stream.destroy(err); });
  return stream;
}

function consume(stream) {
  return new Promise((resolve) => {
    let total = 0;
    stream.on('data', (chunk) => { total += chunk.length; });
    stream.on('end', () => resolve(total));
    stream.on('close', () => { if (total > 0) resolve(total); });
  });
}

async function main() {
  const files = ['test_small.tiff', 'test_medium.tiff', 'test_large.tiff', 'test_cmyk.tiff'];
  for (const f of files) {
    const p = '//image-smb-server/images/' + f;
    const stream = createReadStream(p);
    const bytes = await consume(stream);
    console.log(f + ': ' + bytes);
  }
  console.log('DONE');
}

main().catch(console.error);
