import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import {VitePWA} from 'vite-plugin-pwa';
const buildId=process.env.BIRGE_BUILD_ID||new Date().toISOString().replace(/\D/g,'');
export default defineConfig({define:{__BB_BUILD_ID__:JSON.stringify(buildId)},plugins:[react(),tailwindcss(),{
 name:'birge-version',transformIndexHtml:html=>({html,tags:[{tag:'meta',attrs:{name:'app-version',content:buildId},injectTo:'head'},{tag:'script',attrs:{src:'/boot-recovery.js'},injectTo:'head-prepend'}]}),
 generateBundle(){this.emitFile({type:'asset',fileName:'version.json',source:JSON.stringify({buildId})});}
},VitePWA({strategies:'injectManifest',srcDir:'src',filename:'sw.ts',registerType:'prompt',injectRegister:false,
 includeAssets:['icon.svg','icons/*.png','audio/*.wav','portraits/*.svg','video/*.webm','video/*.vtt'],
 manifest:{name:'Birge Bol — быть рядом',short_name:'Birge Bol',description:'Специалисты, приёмы и поддержка рядом.',lang:'ru',theme_color:'#7760a9',background_color:'#faf9f6',display:'standalone',start_url:'/',scope:'/',icons:[{src:'/icons/icon-192.png',sizes:'192x192',type:'image/png'},{src:'/icons/icon-512.png',sizes:'512x512',type:'image/png'},{src:'/icons/maskable-512.png',sizes:'512x512',type:'image/png',purpose:'maskable'}]},
 injectManifest:{globPatterns:['**/*.{js,css,html,svg,png,woff2,wav,webm,vtt}'],globIgnores:['**/auth/update.*']}
})],build:{chunkSizeWarningLimit:650,rollupOptions:{output:{manualChunks:{localization:['./src/lib/i18n.ts'],'react-vendor':['react','react-dom','react-router-dom'],query:['@tanstack/react-query'],supabase:['@supabase/supabase-js']}}}}});
