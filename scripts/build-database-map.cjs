const fs = require('fs');
const nodes = [
  [450,280,'Заявка / приём','appointments: единый статус'],
  [50,70,'Родитель','auth.users + user_roles'], [50,280,'Несколько детей','children → parent_id'],
  [450,70,'Айгерим С.','specialists → owner_id'], [850,70,'Клиника','clinics + clinic_members'],
  [850,280,'Уведомления','notifications → parent_id'], [450,490,'Цели и задания','child_goals → task_assignments'],
  [50,490,'Дневник родителя','task_completions + reviews'], [850,490,'Мессенджеры','WhatsApp / Telegram'],
  [50,730,'Только общий термин','без данных ребёнка'], [450,730,'ИИ: объяснение','≈71–141 вход; выход ≤350'], [850,730,'Кэш 24 часа','повторный запрос: 0 токенов'],
];
const edges = [[1,2],[2,0],[3,0],[3,4],[0,5],[0,6],[6,7],[4,8],[9,10],[10,11]];
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 900" role="img" aria-label="Карта связей базы Birge Bol"><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="#9b89bd"/></marker></defs><rect width="1200" height="900" fill="#faf9f6"/><text x="50" y="35" font-family="Arial" font-size="25" fill="#463657">Birge Bol · связи данных и экономия токенов</text>${edges.map(([a,b]) => {const [x,y]=nodes[a],[xx,yy]=nodes[b];return `<path d="M${x+140} ${y+45}L${xx+140} ${yy+45}" stroke="#9b89bd" stroke-width="2" fill="none" marker-end="url(#arrow)"/>`;}).join('')}${nodes.map(([x,y,title,sub],i) => `<g transform="translate(${x} ${y})"><rect width="285" height="90" rx="18" fill="${i===0?'#ded2ee':i>=9?'#eef1e8':'#fff'}" stroke="#cdbfdf"/><text x="18" y="36" font-family="Arial" font-size="19" fill="#463657">${title}</text><text x="18" y="64" font-family="Arial" font-size="13" fill="#6b6680">${sub.replaceAll('≤','&#8804;')}</text></g>`).join('')}<text x="50" y="670" font-family="Arial" font-size="19" fill="#463657">Запись, подтверждение, задания, переписка, сравнение: 0 LLM-токенов</text><text x="50" y="865" font-family="Arial" font-size="15" fill="#6b6680">Оценка входа приблизительная. Лимит выхода — не средний расход. Отправку в мессенджере подтверждает пользователь.</text></svg>`;
fs.mkdirSync('public/design', { recursive:true });fs.writeFileSync('public/design/database-map.svg',svg);
console.log('Database map generated.');
