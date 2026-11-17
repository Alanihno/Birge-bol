import { createClient } from 'npm:@supabase/supabase-js@2.119.0';
import { renderCalendar } from '../_shared/ical.ts';
Deno.serve(async request => {
    const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' };
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status:405, headers });
    const token = new URL(request.url).searchParams.get('token') || '';
    if (!/^[a-f0-9]{64}$/.test(token)) return new Response('Calendar unavailable', { status:404, headers });
    const client = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth:{persistSession:false} });
    const { data, error } = await client.rpc('care_calendar_feed', { p_token:token });
    if (error || !data) return new Response('Calendar unavailable', { status:404, headers });
    return new Response(request.method === 'HEAD' ? null : renderCalendar(data.appointments || []), { headers:{...headers,'Content-Type':'text/calendar; charset=utf-8','Content-Disposition':'inline; filename="birge-bol.ics"'} });
});
