const fs=require('node:fs');
fs.writeFileSync('supabase/functions/explain/index.ts',`import { authorize, failure, jsonBody, response } from '../_shared/http.ts';
import { approvedTerm, metric, AI_POLICY_VERSION } from '../_shared/ai-gateway.ts';
Deno.serve(async req=>{if(req.method==='OPTIONS')return response(req,{ok:true});try{
 await authorize(req,'explain');const input=await jsonBody(req);const term=approvedTerm(input);
 if(!term){await metric('explain','blocked');return response(req,{error:'Готового проверенного объяснения нет. Уточните термин у специалиста.',provider:'dictionary'},404);}
 await metric('explain','dictionary');return response(req,{...term,provider:'dictionary',policy_version:AI_POLICY_VERSION,notice:'Информационное объяснение, не диагностика и не назначение.'});
}catch(error){return failure(req,error);}});
`);
let translation=fs.readFileSync('supabase/functions/translate-message/index.ts','utf8');
translation=translation.replace("import { geminiConfig } from '../_shared/gemini.ts';","import { metric } from '../_shared/ai-gateway.ts';");
const start=translation.indexOf('  const admin=createClient('),end=translation.indexOf(" }catch{return reply(req,{error:'unavailable'},503);}",start);
if(start<0||end<0)throw Error('translation boundary missing');
translation=translation.slice(0,start)+"  await metric('translation','blocked');\n  return reply(req,{error:'unavailable',reason:'privacy_policy',message:'Готового перевода нет. Внешний перевод личных сообщений отключён.'},503);\n"+translation.slice(end);
translation=translation.replace("if(cached.data?.source_hash===hash)return reply(req,{text:cached.data.translated_text,target:input.target,cached:true});","if(cached.data?.source_hash===hash){await metric('translation','cache');return reply(req,{text:cached.data.translated_text,target:input.target,cached:true});}");
translation=translation.replace("const input=JSON.parse(raw);if(!input||", "const input=JSON.parse(raw);if(!input||Object.keys(input).some(k=>!['message_id','target','kind'].includes(k))||");
fs.writeFileSync('supabase/functions/translate-message/index.ts',translation);
console.log('External transmission removed from explanation and translation endpoints.');
