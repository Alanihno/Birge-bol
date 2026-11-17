import { authorize, failure, jsonBody, response } from '../_shared/http.ts';
import { approvedTerm, metric, AI_POLICY_VERSION } from '../_shared/ai-gateway.ts';
Deno.serve(async req=>{if(req.method==='OPTIONS')return response(req,{ok:true});try{
 await authorize(req,'explain');const input=await jsonBody(req);const term=approvedTerm(input);
 if(!term){await metric('explain','blocked');return response(req,{error:'Готового проверенного объяснения нет. Уточните термин у специалиста.',provider:'dictionary'},404);}
 await metric('explain','dictionary');return response(req,{...term,provider:'dictionary',policy_version:AI_POLICY_VERSION,notice:'Информационное объяснение, не диагностика и не назначение.'});
}catch(error){return failure(req,error);}});
