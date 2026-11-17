import {describe,it,expect} from 'vitest';
import {qrMatrix} from './qr';
function decodeByteSymbol(m:boolean[][]){
 const size=m.length,version=(size-17)/4,blocked=Array.from({length:size},()=>Array<boolean>(size).fill(false));const reserve=(x:number,y:number)=>{if(x>=0&&x<size&&y>=0&&y<size)blocked[y][x]=true;};
 for(let i=0;i<size;i++){reserve(6,i);reserve(i,6);}for(const [cx,cy] of [[3,3],[size-4,3],[3,size-4]])for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++)reserve(cx+dx,cy+dy);
 if(version>1)for(let y=size-9;y<=size-5;y++)for(let x=size-9;x<=size-5;x++)reserve(x,y);
 for(let i=0;i<size;i++)if(i<=8||i>=size-8){reserve(8,i);reserve(i,8);}const bits:number[]=[];
 for(let right=size-1;right>=1;right-=2){if(right===6)right=5;const up=((right+1)&2)===0;for(let step=0;step<size;step++){const y=up?size-1-step:step;for(const x of [right,right-1])if(!blocked[y][x])bits.push(Number(m[y][x]!==((x+y)%2===0)));}}
 const integer=(start:number,len:number)=>bits.slice(start,start+len).reduce((a,b)=>a*2+b,0),length=integer(4,8);expect(integer(0,4)).toBe(4);
 const bytes=Array.from({length},(_,i)=>integer(12+i*8,8));const dataCount=[19,34,55,80,108][version-1],ecc=[7,10,15,20,26][version-1];const codewords=Array.from({length:dataCount+ecc},(_,i)=>integer(i*8,8));
 function gf(a:number,b:number){let v=0;while(b){if(b&1)v^=a;b>>>=1;a<<=1;if(a&256)a^=0x11d;}return v;}
 let root=1;for(let i=0;i<ecc;i++){let syndrome=0;for(const word of codewords)syndrome=gf(syndrome,root)^word;expect(syndrome).toBe(0);root=gf(root,2);}
 return new TextDecoder().decode(Uint8Array.from(bytes));
}
describe('local attendance QR encoding',()=>{
 for(const input of ['visit','x'.repeat(30),'x'.repeat(50),'http://127.0.0.1:4173/v/00000000000040008000000000000001/123456','x'.repeat(100)])it('decodes exact payload and validates all Reed–Solomon syndromes: '+input.length+' bytes',()=>{expect(decodeByteSymbol(qrMatrix(input))).toBe(input);});
 it('fails explicitly for oversized links, leaving the numeric fallback available',()=>expect(()=>qrMatrix('x'.repeat(107))).toThrow('цифровой код'));
});
