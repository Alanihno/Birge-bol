export function youtubeId(raw:string|null|undefined):string|null {
 if(!raw||raw.length>2048)return null;
 try{const url=new URL(raw);if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
 const host=url.hostname.toLowerCase(),parts=url.pathname.split('/').filter(Boolean);let id:string|null=null;
 if(host==='youtu.be'&&parts.length===1)id=parts[0];
 if(['youtube.com','www.youtube.com','m.youtube.com','www.youtube-nocookie.com'].includes(host)){
  if(url.pathname==='/watch')id=url.searchParams.get('v');
  if(['shorts','embed'].includes(parts[0])&&parts.length===2)id=parts[1];
 }
 return id&&/^[a-zA-Z0-9_-]{11}$/.test(id)?id:null;
 }catch{return null;}
}
export function canonicalYouTube(raw:string){const id=youtubeId(raw);return id?'https://www.youtube.com/watch?v='+id:null;}
