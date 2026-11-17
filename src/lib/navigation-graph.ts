import { useQuery } from '@tanstack/react-query';
import { useApp } from './app-context';
import { mode,supabase } from './backend';
import { roleGraph } from '../domain/navigation-graph';
import type { NavigationGraph } from '../domain/navigation-graph';
export function useNavigationGraph(){const app=useApp();return useQuery<NavigationGraph>({queryKey:['navigation-graph',app.role,app.userId],enabled:!!app.userId,staleTime:3600000,queryFn:async()=>{if(mode==='demo')return roleGraph(app.role);const result=await supabase!.rpc('app_navigation_graph');if(result.error)throw Error('Не удалось загрузить карту разделов');return result.data as unknown as NavigationGraph;}});}
