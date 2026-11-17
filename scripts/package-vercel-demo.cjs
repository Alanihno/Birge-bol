const fs=require('fs'),path=require('path');
const target=path.resolve('деплой версель'),source=path.resolve('dist-demo');
if(!fs.existsSync(path.join(source,'sw.js')))throw Error('Run npm run build:demo first');
fs.mkdirSync(target,{recursive:true});fs.cpSync(source,target,{recursive:true});
const config=JSON.parse(fs.readFileSync('vercel.json','utf8'));delete config.framework;delete config.buildCommand;delete config.outputDirectory;
config.headers.push({source:'/(.*)',headers:[{key:'Content-Security-Policy',value:"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.org; font-src 'self'; media-src 'self' blob:; connect-src 'self' https://tile.openstreetmap.org; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"}]});
fs.writeFileSync(path.join(target,'vercel.json'),JSON.stringify(config,null,2)+'\n');
const licenses=path.join(target,'licenses');fs.mkdirSync(licenses,{recursive:true});
const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8'));const lines=['# Third-party notices','', 'Оригинальные иллюстрации и нейтральные WAV созданы для Birge Bol. Фотографии людей не используются.','Код перечисленных библиотек используется по их лицензиям; полные доступные тексты находятся в licenses/.','OpenStreetMap: https://www.openstreetmap.org/copyright; атрибуция также показывается на карте.',''];
for(const [dir,entry]of Object.entries(lock.packages)){if(!dir.startsWith('node_modules/')||(entry.dev&&!dir.includes('workbox')))continue;const pkgFile=path.join(dir,'package.json');if(!fs.existsSync(pkgFile))continue;const pkg=JSON.parse(fs.readFileSync(pkgFile,'utf8'));const name=pkg.name||dir;const files=fs.readdirSync(dir).filter(n=>/^(licen[cs]e|copying|ofl)([.\-_].*)?$/i.test(n)&&fs.statSync(path.join(dir,n)).isFile());for(const f of files){const dest=name.replace(/[@/]/g,'_')+'-'+f;fs.copyFileSync(path.join(dir,f),path.join(licenses,dest));}lines.push('- '+name+' '+pkg.version+' — '+(typeof pkg.license==='string'?pkg.license:JSON.stringify(pkg.license||'See package license')));}
fs.writeFileSync(path.join(target,'THIRD_PARTY_NOTICES.md'),lines.join('\n')+'\n');
fs.copyFileSync('DEMO_STATUS.md',path.join(target,'СТАТУС ДЕМО.md'));
fs.copyFileSync('DEPLOY_DEMO.md',path.join(target,'КАК ЗАГРУЗИТЬ.md'));
fs.copyFileSync('DEMO_KEYS.md',path.join(target,'КЛЮЧИ И PWA.md'));
for(const f of fs.readdirSync(target)){if(/^\.env/.test(f)||f==='node_modules')throw Error('Unexpected private or dependency files in package');}
let js='';for(const f of fs.readdirSync(path.join(target,'assets')))if(f.endsWith('.js'))js+=fs.readFileSync(path.join(target,'assets',f),'utf8');
if(js.includes('sychksvkgwrgyhxpaabt')||/eyJhbGciOiJIUzI1NiI/.test(js)||/sb_secret_/.test(js))throw Error('Unexpected key/project credentials in demo bundle');
if(/AQ\.[A-Za-z0-9_-]{20,}|AIza[A-Za-z0-9_-]{20,}/.test(js))throw Error('Unexpected Gemini credential in demo bundle');
console.log('Ready: '+target+'; no credentials; static deploy, no install or build required.');
