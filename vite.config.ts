import {defineConfig,loadEnv} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import {VitePWA} from 'vite-plugin-pwa';
const buildId=process.env.BIRGE_BUILD_ID||new Date().toISOString().replace(/\D/g,'');
export default defineConfig(({mode})=>{const env=loadEnv(mode,process.cwd(),'VITE_');const siteUrl=env.VITE_SITE_URL||'https://birge-bol.vercel.app';const origin=new URL(siteUrl);if(origin.protocol!=='https:'||origin.username||origin.password)throw Error('VITE_SITE_URL must be an HTTPS origin without credentials');return {define:{__BB_BUILD_ID__:JSON.stringify(buildId)},plugins:[react(),tailwindcss(),{
 name:'birge-version',transformIndexHtml:html=>({html,tags:[{tag:'meta',attrs:{name:'app-version',content:buildId},injectTo:'head'},{tag:'script',attrs:{src:'/boot-recovery.js'},injectTo:'head-prepend'}]}),
 generateBundle(){
 const paths=['/','/privacy','/terms','/cookies','/review-rules','/consent'];
 this.emitFile({type:'asset',fileName:'robots.txt',source:'User-agent: *\nAllow: /$\nAllow: /privacy\nAllow: /terms\nAllow: /cookies\nAllow: /review-rules\nAllow: /consent\n'+['/app','/auth','/register','/find','/specialists','/payments','/compare','/moms','/child','/diary','/profile','/pro','/clinic','/settings','/notifications','/admin','/support','/family','/check-in','/v/','/data-map','/mascot-gallery','/favorites','/explain','/welcome','/onboarding'].map(path=>'Disallow: '+path).join('\n')+'\nSitemap: '+origin.origin+'/sitemap.xml\n'});
 this.emitFile({type:'asset',fileName:'sitemap.xml',source:'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'+paths.map(path=>'<url><loc>'+origin.origin+path+'</loc></url>').join('')+'</urlset>'});
 this.emitFile({type:'asset',fileName:'version.json',source:JSON.stringify({buildId})});}
},VitePWA({strategies:'injectManifest',srcDir:'src',filename:'sw.ts',registerType:'prompt',injectRegister:false,
 includeAssets:['icon.svg','icons/*.png','audio/*.wav','portraits/*.svg','video/*.webm','video/*.vtt'],
 manifest:{name:'Birge Bol — быть рядом',short_name:'Birge Bol',description:'Специалисты, приёмы и поддержка рядом.',lang:'ru',theme_color:'#4B0073',background_color:'#FFFFFF',display:'standalone',start_url:'/',scope:'/',icons:[{src:'/icons/icon-192.png',sizes:'192x192',type:'image/png'},{src:'/icons/icon-512.png',sizes:'512x512',type:'image/png'},{src:'/icons/maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]},
 injectManifest:{globPatterns:['**/*.{js,css,html,svg,png,woff2,wav,webm,vtt}'],globIgnores:['**/auth/update.*']}
})],build:{chunkSizeWarningLimit:650,rollupOptions:{output:{manualChunks:{localization:['./src/lib/i18n.ts'],'react-vendor':['react','react-dom','react-router-dom'],query:['@tanstack/react-query'],supabase:['@supabase/supabase-js']}}}}};});