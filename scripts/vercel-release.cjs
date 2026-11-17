const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const connected = process.argv.includes('--connected');
const root = path.resolve(connected ? 'dist' : 'dist-demo');
const files = [];
function walk(dir) {
  for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, item.name);
    if (item.isDirectory()) walk(absolute);
    else files.push({ file: path.relative(root, absolute).replaceAll('\\', '/'), absolute });
  }
}
walk(root);
let configPath = path.resolve('деплой версель/vercel.json');
if (connected) {
  const config = JSON.parse(fs.readFileSync('vercel.json', 'utf8'));
  delete config.framework;
  delete config.buildCommand;
  delete config.outputDirectory;
  config.headers.push({ source: '/(.*)', headers: [{ key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.org https://sychksvkgwrgyhxpaabt.supabase.co; font-src 'self'; media-src 'self' blob: https://sychksvkgwrgyhxpaabt.supabase.co; connect-src 'self' https://api.pwnedpasswords.com https://tile.openstreetmap.org https://sychksvkgwrgyhxpaabt.supabase.co wss://sychksvkgwrgyhxpaabt.supabase.co; frame-src https://www.youtube-nocookie.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" }] });
  fs.mkdirSync('.preview/release', { recursive: true });
  configPath = path.resolve('.preview/release/vercel.json');
  fs.writeFileSync(configPath, JSON.stringify(config));
}
files.push({ file: 'vercel.json', absolute: configPath });
for (const item of files) {
  const data = fs.readFileSync(item.absolute);
  item.size = data.length;
  item.sha = crypto.createHash('sha1').update(data).digest('hex');
}
if (process.argv[2] === 'chunk') {
  const item = files[Number(process.argv[3])];
  const data = fs.readFileSync(item.absolute).toString('base64');
  const start = Number(process.argv[4]);
  process.stdout.write(data.slice(start, start + 50000));
} else {
  process.stdout.write(JSON.stringify(files.map((file,index)=>{const item={...file};delete item.absolute;return {...item,index};})));
}
