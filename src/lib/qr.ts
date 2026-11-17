// QR Model 2, byte mode, error correction L, versions 1–5, mask 0.
// ISO/IEC 18004 layout; one Reed–Solomon block for these versions.
// Kept local so attendance tokens never go to a QR image service.
export function qrMatrix(text:string):boolean[][]{
 const bytes=new TextEncoder().encode(text),capacity=[19,34,55,80,108],ecc=[7,10,15,20,26];
 const index=capacity.findIndex(c=>bytes.length+2<=c);if(index<0)throw Error('Ссылка слишком длинная для QR. Используйте цифровой код.');
 const version=index+1,size=17+version*4,bits:number[]=[];
 const append=(v:number,n:number)=>{for(let i=n-1;i>=0;i--)bits.push(v>>>i&1);};
 append(4,4);append(bytes.length,8);bytes.forEach(b=>append(b,8));
 const max=capacity[index]*8;append(0,Math.min(4,max-bits.length));while(bits.length%8)bits.push(0);
 const data:number[]=[];for(let i=0;i<bits.length;i+=8)data.push(bits.slice(i,i+8).reduce((a,b)=>(a<<1)|b,0));
 for(let pad=0;data.length<capacity[index];pad++)data.push(pad%2?0x11:0xec);
 function mul(a:number,b:number){let r=0;for(let i=7;i>=0;i--){r=(r<<1)^((r>>>7)*0x11d);r^=((b>>>i)&1)*a;}return r;}
 const degree=ecc[index],divisor=new Array<number>(degree).fill(0);divisor[degree-1]=1;let root=1;
 for(let i=0;i<degree;i++){for(let j=0;j<degree;j++){divisor[j]=mul(divisor[j],root);if(j+1<degree)divisor[j]^=divisor[j+1];}root=mul(root,2);}
 const remainder=new Array<number>(degree).fill(0);for(const b of data){const factor=b^remainder.shift()!;remainder.push(0);for(let i=0;i<degree;i++)remainder[i]^=mul(divisor[i],factor);}
 const payload=[...data,...remainder],matrix=Array.from({length:size},()=>Array<boolean>(size).fill(false)),fixed=Array.from({length:size},()=>Array<boolean>(size).fill(false));
 function set(x:number,y:number,dark:boolean){if(x>=0&&x<size&&y>=0&&y<size){matrix[y][x]=dark;fixed[y][x]=true;}}
 for(let i=0;i<size;i++){set(6,i,i%2===0);set(i,6,i%2===0);}
 function finder(cx:number,cy:number){for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++){const d=Math.max(Math.abs(dx),Math.abs(dy));set(cx+dx,cy+dy,d!==2&&d!==4);}}
 finder(3,3);finder(size-4,3);finder(3,size-4);
 if(version>1){const center=size-7;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++)set(center+dx,center+dy,Math.max(Math.abs(dx),Math.abs(dy))!==1);}
 const format=8;let rem=format;for(let i=0;i<10;i++)rem=(rem<<1)^((rem>>>9)*0x537);const formatBits=((format<<10)|rem)^0x5412;const bit=(i:number)=>(formatBits>>>i&1)!==0;
 for(let i=0;i<=5;i++)set(8,i,bit(i));set(8,7,bit(6));set(8,8,bit(7));set(7,8,bit(8));for(let i=9;i<15;i++)set(14-i,8,bit(i));
 for(let i=0;i<8;i++)set(size-1-i,8,bit(i));for(let i=8;i<15;i++)set(8,size-15+i,bit(i));set(8,size-8,true);
 let pos=0;for(let right=size-1;right>=1;right-=2){if(right===6)right=5;for(let vert=0;vert<size;vert++){const y=((right+1)&2)===0?size-1-vert:vert;for(let j=0;j<2;j++){const x=right-j;if(fixed[y][x])continue;const dark=pos<payload.length*8&&((payload[pos>>>3]>>>(7-(pos&7)))&1)!==0;matrix[y][x]=dark!==((x+y)%2===0);pos++;}}}
 return matrix;
}
export async function qrDataUrl(text:string){const m=qrMatrix(text),quiet=4,size=m.length+quiet*2;const path=m.flatMap((row,y)=>row.map((dark,x)=>dark?`M${x+quiet},${y+quiet}h1v1h-1z`:'')).join('');const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="100%" height="100%" fill="white"/><path d="${path}" fill="black"/></svg>`;return 'data:image/svg+xml;base64,'+btoa(svg);}
