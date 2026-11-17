const fs = require('node:fs');
const rows = JSON.parse(fs.readFileSync('src/domain/community-content.json','utf8'));
const quote = value => "'" + value.replaceAll("'", "''") + "'";
const statements = rows.flatMap((q, i) => {
 const key = `bb-prepared-thread-${i}`;
 return [
  `insert into public.questions(id,title,body,topic,city,status,is_demo,created_at) values(md5('${key}')::uuid,${quote(q.title)},${quote(q.body)},${quote(q.topic)},'Алматы','answered',true,now()-make_interval(mins=>${i})) on conflict(id) do nothing;`,
  ...q.answers.map((body,j) => `insert into public.answers(id,question_id,body,approved,is_demo) values(md5('${key}-reply-${j}')::uuid,md5('${key}')::uuid,${quote(body)},true,true) on conflict(id) do nothing;`)
 ];
});
fs.writeFileSync('supabase/demo-community-data.sql', '-- Synthetic product news and moderated example discussions. Idempotent.\n' + statements.join('\n') + '\n');
