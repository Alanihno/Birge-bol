const fs=require('node:fs');function edit(file,fn){fs.writeFileSync(file,fn(fs.readFileSync(file,'utf8')));}
edit('src/design-tokens.css',s=>s.replace('var(--indigo)0d','color-mix(in srgb,var(--indigo) 5%,transparent)'));
edit('eslint.config.js',s=>s.replace('globals:globals.node','globals:{...globals.node,...globals.browser}'));
edit('scripts/build-contest-fixtures.cjs',s=>s.replace(/^const arr=.*\r?\n/m,''));
for(const f of ['scripts/generate-kk-video.cjs','scripts/generate-task-demo-video.cjs','scripts/journey-assets.cjs'])edit(f,s=>s.replace(",path=require('path')",''));
edit('scripts/vercel-release.cjs',s=>s.replace('files.map(({ absolute, ...item }, index) => ({ ...item, index }))','files.map((file, index) => ({ file:file.file, sha:file.sha, size:file.size, index }))'));
edit('scripts/finish-promt2.cjs',s=>s.replace('replace(/\\.$/','replace(/.$/'));
edit('public/boot-recovery.js',s=>s.replace(/catch\{\}/g,'catch{/* Recovery storage can be unavailable in private mode. */}'));
edit('src/lib/pwa-context.tsx',s=>s.replace("installing.state==='installed'?resolve():reject(new Error('install'));","if(installing.state==='installed')resolve();else reject(new Error('install'));"));
edit('src/components/clinic-dashboard.tsx',s=>s.replaceAll("'claimed'","'payment_reported'").replaceAll('value="claimed"','value="payment_reported"').replace("(a.payment_state||'unpaid')===payment","(payment==='unpaid'?(!a.payment_state||a.payment_state==='awaiting_payment'):a.payment_state===payment)"));
edit('src/components/specialist-card.tsx',s=>s.replace('<div className="specialist-meta">','<details className="card-description-details"><summary>{tr("О специалисте")}</summary><p>{tr(s.description)}</p></details><div className="specialist-meta">'));
edit('src/pages/specialist.tsx',s=>"import { MapLinks } from '../components/map-links';\n"+s.replace('<CompareButton id={s.id}/>','<MapLinks specialist={s}/><CompareButton id={s.id}/>'));
edit('src/pages/feedback.tsx',s=>"import { Mascot } from '../components/mascot/Mascot';\n"+s.replace('<Notice tone="sage">{tr("Отзыв отправлен','<Mascot state="success" size="large"/><Notice tone="sage">{tr("Отзыв отправлен'));
edit('src/pages/start.tsx',s=>"import { Mascot } from '../components/mascot/Mascot';\n"+s.replace('<div className="welcome-circle"><Sprout size={88} strokeWidth={1}/></div><span>✳</span><span>✦</span>','<Mascot state="greeting" size="hero"/>'));
// The existing Bayesian formula stays in place. A provider with zero own reviews gets no visible score.
edit('src/lib/ratings.ts',s=>s.replace('const overall = c === null ? null','const overall = c === null || own.length===0 ? null'));
console.log('Validation findings corrected. Existing catalog retained, no new specialists.');
