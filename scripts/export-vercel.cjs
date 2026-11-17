const fs=require('fs'),path=require('path'),crypto=require('crypto');
const root=path.resolve('dist-demo');
const files=[];
function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())walk(file);else {const data=fs.readFileSync(file);files.push({file:path.relative(root,file).replaceAll('\\','/'),data:data.toString('base64'),encoding:'base64',size:data.length,sha:crypto.createHash('sha1').update(data).digest('hex')});}}}
walk(root);
const config=JSON.parse(fs.readFileSync('деплой версель/vercel.json','utf8'));const content=Buffer.from(JSON.stringify(config));files.push({file:'vercel.json',data:content.toString('base64'),encoding:'base64',size:content.length,sha:crypto.createHash('sha1').update(content).digest('hex')});
const groups=[];let batch=[],size=0;for(const f of files){if(size+f.data.length>700000&&batch.length){groups.push(batch);batch=[];size=0;}batch.push(f);size+=f.data.length;}if(batch.length)groups.push(batch);
const index=Number(process.argv[2]??-1);process.stdout.write(JSON.stringify(index<0?{groups:groups.length,files:files.length}:groups[index]));
