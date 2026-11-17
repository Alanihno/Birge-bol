import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import dictionary from './terms.json' with {type:'json'};
export const AI_POLICY_VERSION='2026-11-17.allowlist.1';
const normalize=(s:string)=>s.toLowerCase().normalize('NFKC').replace(/ё/g,'е').trim().replace(/\s+/g,' ');
/** No profile, free text, messages or identifiers can enter the external model boundary. */
export function approvedTerm(input:Record<string,unknown>){
 if(Object.keys(input).some(key=>key!=='term')||typeof input.term!=='string'||input.term.length>80)throw Error('body');
 const q=normalize(input.term);return dictionary.find(term=>[term.term,term.title].some(value=>normalize(value)===q));
}
export async function metric(feature:'explain'|'translation',outcome:'dictionary'|'cache'|'blocked'|'error'){
 const client=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false}});
 const {error}=await client.rpc('record_ai_metric',{p_feature:feature,p_outcome:outcome,p_input:0,p_output:0});
 // Only a fixed error code is logged, never payload, user, term, or query text.
 if(error)console.warn('ai_metric_unavailable');
}
