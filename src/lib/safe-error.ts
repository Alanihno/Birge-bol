export function safeError(error:unknown):string {
 const code=typeof error==='object'&&error!==null&&'code' in error?String(error.code):'';
 const message=error instanceof Error?error.message:typeof error==='string'?error:'';
 if(/invalid login credentials/i.test(message))return 'Неверный логин или пароль.';
 if(/^(Логин:|Этот логин недоступен|Слишком много попыток|Сервис временно недоступен)/.test(message)&&message.length<200)return message;
 if(/email not confirmed/i.test(message))return 'Подтвердите электронную почту перед входом.';
 if(/rate.limit|too many|quota/i.test(message)||code==='429')return 'Слишком много попыток. Попробуйте позже.';
 if(/expired|jwt|session/i.test(message))return 'Сессия истекла. Войдите снова.';
 if(/fetch|network|offline/i.test(message))return 'Проверьте подключение к интернету и повторите действие.';
 if(code==='23P01'||/exclusion|already booked/i.test(message))return 'Это время уже занято. Выберите другое окно.';
 // Known user-facing errors from guarded RPCs; SQL text and identifiers never pass through.
 if(message.length<180&&/^(Этот пароль встречается|Выберите более надёжный пароль|Проверка безопасности пароля|Нет доступа|Нет подтверждённой записи|Неверный код|Войдите|Не удалось|Выберите|Запись |Код |Материал |Посещение |Сначала |Недостаточно |Подтвердите |Это время |Пароль )/.test(message)&&!/[{}]|\b(select|insert|update|constraint|relation|uuid|function|column)\b/i.test(message)&&!/[0-9a-f]{8}-[0-9a-f-]{27}/i.test(message))return message;
 return 'Действие временно недоступно. Проверьте данные и попробуйте ещё раз.';
}
