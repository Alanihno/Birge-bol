import { supabase } from './backend';
export const LEGAL_VERSION='2026-11-17.draft.1';
export async function saveConsent(userId:string,kind:'platform'|'child_authority'='platform'){if(!supabase)return;const {error}=await supabase.from('consent_events').insert({user_id:userId,kind,document_version:LEGAL_VERSION,granted:true});if(error)throw Error('Не удалось сохранить согласие. Повторите действие.');}
