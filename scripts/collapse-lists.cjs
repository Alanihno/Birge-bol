const ts=require('typescript'),fs=require('fs');
const targets=['src/pages/diary.tsx','src/pages/pro.tsx','src/pages/clinic.tsx','src/pages/specialist.tsx','src/pages/support.tsx','src/pages/team.tsx','src/pages/other.tsx','src/components/payment-inbox.tsx'];
for(const file of targets){
 let source=fs.readFileSync(file,'utf8');if(source.includes("import { ExpandableList }"))continue;
 const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),edits=[];
 function walk(n){
  if(ts.isCallExpression(n)&&ts.isPropertyAccessExpression(n.expression)&&n.expression.name.text==='map'&&n.arguments.length===1){
   const fn=n.arguments[0],body=fn.getText(ast),array=n.expression.expression.getText(ast);
   const appointment=body.includes('<AppointmentCard'),review=file.endsWith('specialist.tsx')&&body.includes('className="sample-review"')||file.endsWith('pro.tsx')&&array==='reviews';
   const target=appointment||review||file.endsWith('diary.tsx')&&(/<AssignmentCard/.test(body)||array==='events'||array.startsWith('assignments.filter')&&body.includes('document-row'))||file.endsWith('other.tsx')&&array==='data.notifications'||file.endsWith('support.tsx')&&array==='tickets.data'||file.endsWith('team.tsx')&&(array==='state.notes'||array==='state.goals')||file.endsWith('clinic.tsx')&&array.startsWith('slots.filter')||file.endsWith('pro.tsx')&&array.startsWith('state.slots.filter')&&body.includes('slot_remove')||file.endsWith('payment-inbox.tsx')&&array==='paid';
   if(target){let className='stack';for(let p=n.parent;p;p=p.parent){if(ts.isJsxElement(p)){const a=p.openingElement.attributes.properties.find(a=>ts.isJsxAttribute(a)&&a.name.text==='className');if(a&&a.initializer&&ts.isStringLiteral(a.initializer)&&['g2','assignment-grid','stack'].includes(a.initializer.text)){className=a.initializer.text;break;}}}
    let items=array;if(review)items=`[...${array}].sort((a,b)=>b.created_at.localeCompare(a.created_at))`;
    if(file.endsWith('pro.tsx')&&appointment)items=`sortAppointments(${array})`;
    if(file.endsWith('other.tsx'))items=`[...${array}].sort((a,b)=>Number(a.read)-Number(b.read))`;
    if(file.endsWith('clinic.tsx')&&array.startsWith('slots.filter'))items=array.replace('.slice(0, 20)','')+'.sort((a,b)=>a.starts_at.localeCompare(b.starts_at))';
    if(file.endsWith('pro.tsx')&&array.startsWith('state.slots.filter'))items=array.replace('.slice(0, 30)','')+'.sort((a,b)=>a.starts_at.localeCompare(b.starts_at))';
    const selected=file.endsWith('diary.tsx')&&appointment?' selectedId={p.get("appointment") || undefined}':'';
    edits.push({start:n.getStart(ast),end:n.end,text:`<ExpandableList items={${items}} renderItem={${fn.getText(ast)}} className="${className}"${selected}/>`});return;
   }
  }ts.forEachChild(n,walk);
 }walk(ast);
 if(!edits.length)continue;
 for(const e of edits.sort((a,b)=>b.start-a.start))source=source.slice(0,e.start)+e.text+source.slice(e.end);
 source=`import { ExpandableList } from '${file.startsWith('src/components/')?'./':'../components/'}expandable-list';\n`+source;
 if(file.endsWith('pro.tsx'))source="import { sortAppointments } from '../domain/appointments';\n"+source;
 fs.writeFileSync(file,source);console.log(file,edits.length);
}
