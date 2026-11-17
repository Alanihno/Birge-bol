export const mascotConfig = { name: 'Бірге', version: 1 } as const;
export const mascotStates = ['idle','greeting','waving','pointing','explaining','thinking','loading','success','celebrating','comforting','error','offline','sleeping','hidden'] as const;
export type MascotState = typeof mascotStates[number];
export type Direction = 'left' | 'right' | 'up' | 'down' | 'center';
export const statePriority: Record<MascotState, number> = { hidden:100,offline:90,error:80,comforting:75,success:70,celebrating:70,loading:60,greeting:50,waving:45,pointing:40,explaining:35,thinking:30,sleeping:10,idle:0 };
export const oneShotDuration: Partial<Record<MascotState,number>> = {greeting:1050,waving:1450,success:1350,celebrating:1900,pointing:1800,explaining:2400,comforting:2400,error:2400};
export function transition(current:MascotState,next:MascotState,force=false):MascotState {return force || statePriority[next]>=statePriority[current] ? next : current;}
