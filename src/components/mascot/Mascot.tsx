import { useEffect, useId, useRef, useState ,useCallback} from 'react';
import type { CSSProperties } from 'react';
import { mascotConfig, oneShotDuration, transition } from './mascot-states';
import type { Direction, MascotState } from './mascot-states';

export function useMascot(initial:MascotState='idle') {
  const [state,setState]=useState(initial);
  useEffect(()=>{const duration=oneShotDuration[state];if(!duration)return;const timer=setTimeout(()=>setState('idle'),duration);return()=>clearTimeout(timer);},[state]);
  const react=useCallback((next:MascotState,force=false)=>setState(current=>transition(current,next,force)),[]);return {state,react};
}

type Props={state?:MascotState;size?:'small'|'medium'|'large'|'hero';direction?:Direction;reducedMotion?:boolean;interactive?:boolean;visible?:boolean;label?:string};
/** One character, layered SVG. IDs remain unique with many simultaneous instances. */
export function Mascot({state='idle',size='medium',direction='center',reducedMotion=false,interactive=false,visible=true,label}:Props) {
  const id=useId().replace(/:/g,''),ref=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    const node=ref.current;if(!node)return;
    const media=matchMedia('(prefers-reduced-motion: reduce)');let frame=0;
    const pause=()=>{node.dataset.paused=String(document.hidden||media.matches||reducedMotion);};
    const observer=new IntersectionObserver(([entry])=>{node.dataset.inview=String(entry.isIntersecting);});observer.observe(node);
    const move=(event:PointerEvent)=>{if(!interactive||media.matches||document.hidden||node.dataset.inview==='false')return;cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{const box=node.getBoundingClientRect();node.style.setProperty('--eye-x',`${Math.max(-4,Math.min(4,(event.clientX-box.x-box.width/2)/55))}px`);node.style.setProperty('--eye-y',`${Math.max(-3,Math.min(3,(event.clientY-box.y-box.height/2)/65))}px`);});};
    pause();document.addEventListener('visibilitychange',pause);media.addEventListener('change',pause);if(interactive)window.addEventListener('pointermove',move,{passive:true});
    return()=>{observer.disconnect();cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',pause);media.removeEventListener('change',pause);window.removeEventListener('pointermove',move);};
  },[interactive,reducedMotion]);
  if(!visible||state==='hidden')return null;
  const gaze={left:[-4,0],right:[4,0],up:[0,-3],down:[0,3],center:[0,0]}[direction];
  return <div ref={ref} className={`birge-mascot mascot-${size}`} data-state={state} data-direction={direction} style={{'--eye-x':gaze[0]+'px','--eye-y':gaze[1]+'px'} as CSSProperties} role={label?'img':undefined} aria-label={label||undefined} aria-hidden={label?undefined:true}>
    <svg viewBox="0 0 320 320" focusable="false" aria-hidden="true">
      <defs>
        <radialGradient id={id+'body'} cx="28%" cy="18%" r="90%"><stop stopColor="var(--mascot-light)"/><stop offset=".5" stopColor="var(--mascot-mid)"/><stop offset=".82" stopColor="var(--mascot-main)"/><stop offset="1" stopColor="var(--mascot-shadow)"/></radialGradient>
        <linearGradient id={id+'limb'} x2=".8" y2="1"><stop stopColor="var(--mascot-mid)"/><stop offset="1" stopColor="var(--mascot-shadow)"/></linearGradient>
        <radialGradient id={id+'shine'}><stop stopColor="var(--mascot-shine)" stopOpacity=".75"/><stop offset="1" stopColor="var(--mascot-shine)" stopOpacity="0"/></radialGradient>
        <radialGradient id={id+'shadow'}><stop stopColor="var(--mascot-shadow)" stopOpacity=".23"/><stop offset="1" stopColor="var(--mascot-shadow)" stopOpacity="0"/></radialGradient>
      </defs>
      <ellipse className="mascot-ground" cx="160" cy="284" rx="94" ry="16" fill={`url(#${id}shadow)`}/>
      <g className="mascot-figure">
        <g fill={`url(#${id}limb)`}><ellipse className="mascot-foot left" cx="131" cy="267" rx="19" ry="14" transform="rotate(-12 131 267)"/><ellipse className="mascot-foot right" cx="190" cy="267" rx="19" ry="14" transform="rotate(12 190 267)"/></g>
        <g className="mascot-arm left" fill={`url(#${id}limb)`}><path d="M74 164C52 166 35 184 40 202C42 211 54 213 59 204L81 181Z"/><g className="mascot-hand"><ellipse cx="47" cy="201" rx="13" ry="15"/><ellipse cx="57" cy="195" rx="6" ry="9"/></g></g>
        <g className="mascot-arm right" fill={`url(#${id}limb)`}><path d="M245 162C268 163 284 181 280 200C278 210 265 212 260 201L239 181Z"/><g className="mascot-hand"><ellipse cx="274" cy="199" rx="13" ry="15"/><ellipse cx="263" cy="193" rx="6" ry="9"/></g></g>
        <path d="M160 87C145 60 118 48 91 58C53 72 47 110 61 146C77 187 112 226 146 251C155 259 165 259 176 250C216 219 251 182 264 142C279 98 258 61 224 56C196 51 172 65 160 87Z" fill={`url(#${id}body)`}/>
        <path d="M73 108C76 78 105 65 130 79" stroke="var(--mascot-shine)" strokeWidth="4" strokeLinecap="round" opacity=".42" fill="none"/>
        <ellipse cx="101" cy="96" rx="35" ry="29" fill={`url(#${id}shine)`}/><ellipse cx="208" cy="84" rx="24" ry="14" fill={`url(#${id}shine)`} opacity=".4"/>
        <g className="mascot-cheeks" fill="var(--mascot-blush)" opacity=".6"><ellipse cx="104" cy="171" rx="16" ry="8"/><ellipse cx="216" cy="171" rx="16" ry="8"/></g>
        <g className="mascot-brows" fill="none" stroke="var(--mascot-eye)" strokeWidth="4" strokeLinecap="round"><path className="left" d="M112 121Q122 115 133 119"/><path className="right" d="M184 119Q195 115 206 121"/></g>
        <g className="mascot-eyes"><g fill="var(--mascot-shine)"><ellipse cx="125" cy="148" rx="13" ry="17"/><ellipse cx="194" cy="148" rx="13" ry="17"/></g><g className="mascot-pupils" fill="var(--mascot-eye)"><ellipse cx="127" cy="150" rx="7" ry="11"/><ellipse cx="192" cy="150" rx="7" ry="11"/><g fill="var(--mascot-shine)"><circle cx="125" cy="146" r="2.7"/><circle cx="190" cy="146" r="2.7"/></g></g></g>
        <path className="mascot-closed-eyes" d="M115 149Q125 142 135 149M184 149Q194 142 204 149" fill="none" stroke="var(--mascot-eye)" strokeWidth="4" strokeLinecap="round"/>
        <g className="mascot-mouth" fill="none" stroke="var(--mascot-eye)" strokeWidth="4.5" strokeLinecap="round"><path className="smile" d="M144 180Q160 195 176 180"/><path className="quiet" d="M149 184Q160 180 171 184"/><ellipse className="surprise" cx="160" cy="184" rx="6" ry="7"/></g>
        <g className="mascot-sparkles" stroke="var(--mascot-main)" strokeWidth="4" strokeLinecap="round"><path d="M49 81V65M41 73H57M267 78V58M257 68H277M250 36V26M245 31H255"/></g>
        <g className="mascot-dots" fill="var(--mascot-eye)"><circle cx="240" cy="38" r="4"/><circle cx="255" cy="38" r="4"/><circle cx="270" cy="38" r="4"/></g>
        <g className="mascot-offline" stroke="var(--mascot-eye)" strokeWidth="3" strokeLinecap="round" fill="none"><path d="M242 35Q258 20 275 35M248 43Q259 33 269 43M239 24L278 56"/></g>
      </g>
    </svg>
  </div>;
}
export {mascotConfig};
