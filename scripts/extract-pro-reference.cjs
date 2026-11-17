const fs=require('fs');
const source='Birge Bol — экраны кабинета специалиста.html',html=fs.readFileSync(source,'utf8');
fs.mkdirSync('public/design',{recursive:true});fs.copyFileSync(source,'public/design/pro-reference.html');
let css=html.match(/<style>([\s\S]*?)<\/style>/)[1];css=css.replaceAll(':root:not([data-theme="light"])','&:not([data-theme="light"])').replaceAll(':root[data-theme="dark"]','&[data-theme="dark"]').replaceAll(':root','&').replaceAll('body{','&{').replaceAll('*{','& *{');
fs.writeFileSync('src/pro-reference.css','/* Complete CSS from the user supplied specialist design, scoped to the pro cabinet. */\n.pro-suite{\n'+css+'\n}\n');
console.log('Copied the original HTML byte for byte; extracted all specialist styles.');
