import { useEffect, useMemo, useState } from "react";
import { getSettings } from "../services/settingsService";
import { subscribeToWorkspaceData } from "../services/workspaceEvents";

export type AppLocale = "uz" | "ru";

/** Exported so the static i18n coverage test (see i18nCoverage.test.ts) can check every t() call site against this dictionary. */
export const RU: Record<string, string> = {
  "nav.main": "ГЛАВНОЕ", "nav.system": "СИСТЕМА", "nav.home": "Главная", "nav.ai": "AI помощник", "nav.calendar": "Календарь", "nav.tasks": "Задачи", "nav.reminders": "Напоминания", "nav.files": "Файлы", "nav.settings": "Настройки", "nav.profile": "Профиль", "nav.logout": "Выйти", "nav.ready": "Готов к работе", "nav.workspace": "AI рабочее пространство",
  "top.search": "Поиск...", "top.search.none": "Ничего не найдено.", "top.notifications": "Уведомления", "top.allRead": "Все прочитано", "top.new": "новых", "top.none": "Уведомлений пока нет.", "top.notificationSettings": "Настройки уведомлений", "top.now": "сейчас", "top.minutes": "мин", "top.hours": "ч", "top.days": "дн",
  "common.create": "Создать", "common.save": "Сохранить", "common.cancel": "Отмена", "common.delete": "Удалить", "common.edit": "Изменить", "common.search": "Поиск", "common.all": "Все", "common.today": "Сегодня", "common.completed": "Выполнено", "common.active": "Активные", "common.overdue": "Просрочено", "common.retry": "Повторить", "common.loading": "Загрузка...",
  "tasks.title": "Задачи", "tasks.new": "Новая задача", "tasks.search": "Поиск задач...", "tasks.important": "Важные", "tasks.inProgress": "В процессе", "tasks.duplicate": "Дублировать", "tasks.subtitle": "Управляйте делами на сегодня и держите прогресс под контролем.", "tasks.progress": "Прогресс", "tasks.todayProgress": "ПРОГРЕСС НА СЕГОДНЯ", "tasks.todayWork": "Задачи на сегодня", "tasks.all": "Все", "tasks.today": "Сегодня", "tasks.overdue": "Просроченные", "tasks.done": "Выполненные", "tasks.sort": "Сортировка", "tasks.sortDeadline": "По сроку", "tasks.sortPriority": "По важности", "tasks.sortTitle": "По названию", "tasks.noTasks": "Задач пока нет", "tasks.notFound": "Задачи не найдены", "tasks.tryFilter": "Попробуйте другой фильтр или поисковый запрос.", "tasks.priority": "ПРИОРИТЕТ", "tasks.priorityHelp": "Дела, которым стоит уделить внимание сегодня.", "tasks.add": "Добавить задачу", "tasks.edit": "Редактировать задачу", "tasks.name": "Название задачи", "tasks.description": "Краткое описание...", "tasks.create": "Создать задачу", "tasks.markDone": "Отметить выполненной", "tasks.makeActive": "Вернуть в активные", "tasks.editAction": "Редактировать", "tasks.copy": "Создать копию", "tasks.delete": "Удалить", "tasks.status": "Статус задачи", "tasks.statusNew": "Новая", "tasks.statusProgress": "В процессе", "tasks.moveProgress": "Перевести в работу", "tasks.movedProgress": "Задача переведена в работу", "tasks.statusError": "Не удалось обновить статус задачи",
  "reminders.title": "Напоминания", "reminders.new": "Новое напоминание", "reminders.search": "Поиск напоминаний...", "reminders.snooze": "Отложить на 10 минут", "reminders.scheduled": "Запланировано", "reminders.subtitle": "Не пропускайте важные дела и возвращайтесь к ним вовремя.", "reminders.all": "Все", "reminders.active": "Активные", "reminders.overdue": "Просроченные", "reminders.done": "Выполненные", "reminders.noItems": "Напоминаний пока нет", "reminders.notFound": "Напоминания не найдены", "reminders.edit": "Редактировать напоминание", "reminders.name": "Название напоминания", "reminders.description": "Краткое описание...", "reminders.create": "Создать напоминание",
  "calendar.title": "Календарь", "calendar.new": "Новая встреча", "calendar.month": "Месяц", "calendar.week": "Неделя", "calendar.day": "День", "calendar.location": "Место / ссылка", "calendar.conflict": "На это время уже запланирована встреча.", "calendar.subtitle": "Управляйте встречами и ежедневным расписанием.", "calendar.today": "Сегодня", "calendar.emptyDay": "На выбранный день встреч пока нет.", "calendar.todayPlan": "ПЛАН НА СЕГОДНЯ", "calendar.edit": "Редактировать встречу", "calendar.name": "Название встречи", "calendar.participant": "Участник", "calendar.description": "Описание", "calendar.save": "Сохранить", "calendar.createEvent": "Создать событие", "calendar.noReminder": "Без напоминания",
  "files.title": "Файлы", "files.upload": "Загрузить", "files.folder": "Создать папку", "files.search": "Поиск файлов...", "files.recent": "Последние файлы", "files.download": "Скачать", "files.open": "Открыть", "files.safe": "Безопасное хранение", "files.subtitle": "Храните и управляйте рабочими документами в одном месте.", "files.folders": "Папки", "files.all": "Все файлы", "files.rename": "Переименовать", "files.delete": "Удалить", "files.back": "Назад", "files.empty": "Файлов пока нет", "files.emptyHelp": "Перетащите файл сюда или нажмите «Загрузить».", "files.newFolder": "Новая папка", "files.folderName": "Название папки", "files.save": "Сохранить", "files.cancel": "Отмена", "files.create": "Создать",
  "settings.title": "Настройки", "settings.subtitle": "Аккаунт, внешний вид, уведомления и интеграции.", "settings.account": "Аккаунт", "settings.security": "Безопасность", "settings.appearance": "Внешний вид", "settings.notifications": "Уведомления", "settings.ai": "AI помощник", "settings.language": "Язык", "settings.integrations": "Интеграции",
  "integrations.connected": "Подключено", "integrations.connect": "Подключить", "integrations.manage": "Управлять", "integrations.soon": "Скоро", "integrations.unavailable": "Пока недоступно",
  "ai.workspace": "AI рабочее пространство", "ai.quick": "Быстрые действия", "ai.history": "Недавние чаты", "ai.newChat": "Новый чат", "ai.historyLoading": "История загружается…", "ai.noHistory": "Сохранённых чатов пока нет.", "ai.messages": "сообщ.", "ai.greeting": "ПРИВЕТ, Я QULAY AI", "ai.question": "Чем я могу помочь сегодня?", "ai.subtitle": "Планируйте день, создавайте задачи или просто начните разговор.", "ai.todayPlan": "Покажи план на сегодня", "ai.newTask": "Создай новую задачу", "ai.newReminder": "Добавь напоминание", "ai.voice": "Открыть голосовой режим", "ai.online": "Онлайн · Готов", "ai.historySearch": "Поиск по истории чатов...", "ai.renameChat": "Переименовать чат", "ai.historyNotFound": "Подходящий чат не найден.",
  "dashboard.title": "Главная", "dashboard.today": "Сегодня", "dashboard.integrations": "Интеграции",
  "quick.title": "Быстрые действия", "quick.subtitle": "Часто используемые реальные функции", "quick.all": "Управлять через AI", "quick.telegram": "Написать в Telegram", "quick.telegramHelp": "Найдите контакт через AI и отправьте после подтверждения", "quick.calendar": "Создать встречу", "quick.calendarHelp": "Новая встреча в календаре", "quick.task": "Создать задачу", "quick.taskHelp": "Задача со сроком и приоритетом", "quick.reminder": "Добавить напоминание", "quick.reminderHelp": "Получите уведомление в нужное время", "quick.files": "Открыть файлы", "quick.filesHelp": "Документы, PDF и файлы Drive", "quick.ai": "AI помощник", "quick.aiHelp": "План, вопрос или другое действие",

  "common.more": "Подробнее", "common.close": "Закрыть",

  "ai.openHistory": "Открыть историю чатов", "ai.historyToday": "Сегодня", "ai.historyYesterday": "Вчера", "ai.historyWeek": "Последние 7 дней", "ai.historyOlder": "Ранее", "ai.deleteChat": "удалить чат", "ai.deleteChatTitle": "Удалить чат", "ai.deleteChatDescription": "Этот чат будет удалён без возможности восстановления.", "ai.attach": "Прикрепить файл", "ai.attachFiles": "Файлы", "ai.attachSoon": "Прикрепить к сообщению (скоро)",

  "briefing.title": "Сегодняшний брифинг", "briefing.askPrompt": "Расскажи мой план на сегодня", "briefing.integrationIssue": "Интеграция требует внимания",

  "agentBriefing.title": "Агент и брифинг", "agentBriefing.subtitle": "Настройте утренний брифинг, итог дня и проактивные советы.", "agentBriefing.loadError": "Не удалось загрузить настройки агента", "agentBriefing.saveError": "Не удалось сохранить настройку", "agentBriefing.morning": "Утренний брифинг", "agentBriefing.morningHint": "Каждый день в выбранное время приходит план на день", "agentBriefing.time": "Время", "agentBriefing.evening": "Итог дня", "agentBriefing.eveningHint": "Вечером — итог сделанного и несделанного за день", "agentBriefing.inApp": "Получать в приложении", "agentBriefing.inAppHint": "Показывать на панели и в центре уведомлений", "agentBriefing.telegram": "Получать в Telegram", "agentBriefing.telegramHint": "Отправлять также в подключённый Telegram-аккаунт", "agentBriefing.proactive": "Проактивные советы", "agentBriefing.proactiveHint": "AI сам заметит важное и предложит совет", "agentBriefing.financial": "Финансовые уведомления", "agentBriefing.financialHint": "Сообщать при резком росте расходов или превышении бюджета", "agentBriefing.quietHours": "Тихие часы для агента", "agentBriefing.quietHoursHint": "В это время проактивные уведомления не отправляются", "agentBriefing.quietStart": "Начало", "agentBriefing.quietEnd": "Конец", "agentBriefing.timezone": "Часовой пояс",

  "proactive.title": "AI советы", "proactive.why": "Почему это предложено?", "proactive.snooze": "Позже", "proactive.dismiss": "Скрыть",

  "notFound.title": "Страница не найдена", "notFound.subtitle": "Этого адреса не существует или он был перемещён.", "common.back": "Назад", "common.saving": "Сохранение...", "common.confirm": "Подтвердить",

  "changePassword.current": "Текущий пароль", "changePassword.new": "Новый пароль", "changePassword.confirm": "Повторите новый пароль", "changePassword.fillAll": "Заполните все поля.", "changePassword.tooShort": "Новый пароль должен содержать не менее 8 символов", "changePassword.mismatch": "Новые пароли не совпадают", "changePassword.title": "Изменение пароля", "changePassword.subtitle": "Введите новый пароль для безопасности аккаунта.", "changePassword.updating": "Обновление...", "changePassword.submit": "Обновить пароль",

  "app.offline": "Соединение потеряно. Изменения обновятся после восстановления сети.",

  "auth.invalidEmail": "Введите корректный email адрес.", "auth.passwordTooShort": "Пароль должен содержать не менее 8 символов.", "auth.googleNotConnected": "Google OAuth ещё не подключён.", "auth.badge": "AI Business Assistant", "auth.heroLine1": "Доверьте свою работу", "auth.heroLine2": "искусственному интеллекту.", "auth.heroSubtitle": "Управляйте ежедневными задачами, встречами, документами и делами бизнеса с умным помощником.", "auth.assistantReady": "Готов помочь вам сегодня.", "auth.welcomeBack": "Добро пожаловать 👋", "auth.loginSubtitle": "Войдите в аккаунт и продолжайте работу.", "auth.email": "Email", "auth.password": "Пароль", "auth.forgotPassword": "Забыли пароль?", "auth.hidePassword": "Скрыть пароль", "auth.showPassword": "Показать пароль", "auth.rememberMe": "Запомнить меня", "auth.checking": "Проверка...", "auth.login": "Войти", "auth.or": "или", "auth.googleLogin": "Войти через Google", "auth.noAccount": "Нет аккаунта?", "auth.register": "Зарегистрироваться",

  "auth.fillNames": "Введите имя и фамилию.", "auth.passwordsMismatch": "Пароли не совпадают.", "auth.registerHeroLine1": "Управляйте бизнесом", "auth.registerHeroLine2": "с помощью AI.", "auth.registerHeroSubtitle": "Управляйте задачами, встречами, документами и повседневными делами через одного умного помощника.", "auth.featureVoice": "Голосовое общение с AI", "auth.featureTasks": "Управление задачами и встречами", "auth.featureIntegrations": "Интеграция с Telegram, Gmail и Calendar", "auth.createAccount": "Создание аккаунта 👋", "auth.registerSubtitle": "Начните пользоваться QULAY AI.", "auth.firstName": "Имя", "auth.firstNamePlaceholder": "Введите имя", "auth.lastName": "Фамилия", "auth.lastNamePlaceholder": "Введите фамилию", "auth.confirmPassword": "Подтвердите пароль", "auth.hideConfirmPassword": "Скрыть подтверждение пароля", "auth.showConfirmPassword": "Показать подтверждение пароля", "auth.creating": "Создание...", "auth.createAccountButton": "Создать аккаунт", "auth.googleRegister": "Зарегистрироваться через Google", "auth.haveAccount": "Уже есть аккаунт?",

  "auth.forgotSuccess": "Если такой email зарегистрирован, инструкция по восстановлению пароля будет отправлена.", "auth.accountRecovery": "ВОССТАНОВЛЕНИЕ АККАУНТА", "auth.resetPasswordTitle": "Восстановление пароля", "auth.forgotSubtitle": "Введите свой email. Если аккаунт существует, мы отправим инструкцию по восстановлению.", "auth.sending": "Отправка...", "auth.sendResetLink": "Отправить ссылку для восстановления", "auth.backToLogin": "Вернуться на страницу входа",

  "auth.resetLinkMissing": "Ссылка для восстановления не найдена.", "auth.resetPasswordLength": "Новый пароль должен содержать от 8 до 72 символов.", "auth.passwordsMismatch2": "Пароли не совпадают.", "auth.resetLinkInvalid": "Ссылка недействительна или срок её действия истёк.", "auth.resetLinkRetry": "Проверьте ссылку восстановления и попробуйте снова.", "auth.setNewPassword": "Установите новый пароль", "auth.resetSuccess": "Пароль обновлён. Теперь войдите с новым паролем.", "auth.backToLoginShort": "Вернуться ко входу", "auth.resetSubtitle": "Введите новый пароль. Ссылка действительна 30 минут.", "auth.newPassword": "Новый пароль",

  "integrationsPage.eyebrow": "ПОДКЛЮЧЕНИЯ", "integrationsPage.subtitle": "Подключите QULAY AI к вашим повседневным сервисам.", "integrationsPage.viewAll": "Смотреть все",

  "billing.loadError": "Не удалось загрузить тарифы.", "billing.eyebrow": "ТАРИФ И ЛИМИТЫ", "billing.title": "Тарифы QULAY AI", "billing.subtitle": "Лимиты AI-сообщений, действий агента, файлов и долговременной памяти.", "billing.trialActive": "PRO пробный период", "billing.trialUntil": "до", "billing.currentUsage": "Текущее использование", "billing.aiMessages": "AI сообщения", "billing.toolActions": "Действия агента", "billing.memory": "Память", "billing.storage": "Хранилище (МБ)", "billing.activePlan": "Активный тариф", "billing.disclaimer": "AI всегда запрашивает подтверждение перед любым действием записи. По окончании тарифа ваши данные не удаляются.", "billing.free": "Бесплатно", "billing.perMonth": "В месяц", "billing.aiMessageUnit": "AI сообщение", "billing.toolActionUnit": "действие агента", "billing.fileUnit": "файл", "billing.memoryUnit": "запись памяти", "billing.paymentSoon": "Payme / Click скоро", "billing.currency": "сум",

  "contacts.loadError": "Не удалось загрузить контакты.", "contacts.updated": "Контакт обновлён", "contacts.created": "Контакт сохранён", "contacts.saveError": "Не удалось сохранить контакт.", "contacts.confirmDelete": "Удалить контакт?", "contacts.deleted": "Контакт удалён", "contacts.deleteError": "Не удалось удалить контакт.", "contacts.eyebrow": "КОНТАКТЫ", "contacts.title": "Контакты", "contacts.subtitle": "AI запоминает людей, компании и важные разговоры.", "contacts.add": "Добавить контакт", "contacts.searchPlaceholder": "Имя, телефон или компания...", "contacts.countSuffix": "контактов", "contacts.all": "Все контакты", "contacts.noExtraInfo": "Дополнительной информации нет", "contacts.notFound": "Контакты не найдены.", "contacts.upcoming": "Ближайшие контакты", "contacts.noUpcoming": "Запланированных контактов нет.", "contacts.modalEyebrow": "КОНТАКТ", "contacts.editTitle": "Редактировать контакт", "contacts.newTitle": "Новый контакт", "contacts.phone": "Телефон", "contacts.company": "Компания", "contacts.position": "Должность", "contacts.relationship": "Тип связи", "contacts.relationshipPlaceholder": "Клиент, партнёр...", "contacts.birthday": "Дата рождения", "contacts.nextFollowUp": "Следующий контакт", "contacts.tags": "Теги (через запятую)", "contacts.notes": "Заметка",

  "memory.typePersonal": "Личное", "memory.typeBusiness": "Бизнес", "memory.typeContact": "Контакт", "memory.typePreference": "Предпочтение", "memory.typeDecision": "Решение", "memory.typeGoal": "Цель", "memory.typeContext": "Контекст", "memory.loadError": "Не удалось загрузить память AI.", "memory.toggleError": "Не удалось сохранить настройку памяти", "memory.confirmDeleteAll": "ВНИМАНИЕ: вся память AI будет полностью удалена. Продолжить?", "memory.allDeleted": "Вся память удалена", "memory.updated": "Запись обновлена", "memory.created": "Запись добавлена", "memory.saveError": "Не удалось сохранить запись.", "memory.confirmForget": "Забыть эту запись?", "memory.forgotten": "Информация забыта", "memory.deleteError": "Не удалось удалить информацию.", "memory.title": "Память AI", "memory.subtitle": "Управляйте тем, что AI знает о вас, бизнесе и важных привычках.", "memory.remember": "Запомнить", "memory.searchPlaceholder": "Поиск по памяти...", "memory.countSuffix": "активных записей", "memory.toggleHint": "Включить или выключить общую память во всех чатах.", "memory.export": "Экспорт", "memory.deleteAll": "Удалить всю память", "memory.importance": "Важность", "memory.verifiedByYou": "Подтверждено вами", "memory.aiSuggestion": "Предложение AI", "memory.verified": "Подтверждено", "memory.needsReview": "Требует проверки", "memory.forget": "Забыть", "memory.empty": "Память AI пока пуста.", "memory.editTitle": "Редактировать запись", "memory.newTitle": "Новая запись", "memory.type": "Тип", "memory.aboutWhat": "О чём?", "memory.aboutWhatPlaceholder": "Например: Основной бизнес", "memory.whatToRemember": "Что AI должен запомнить?", "memory.whatToRememberPlaceholder": "Напишите точную и краткую информацию", "memory.confirmSave": "Подтвердить и сохранить",

  "finance.loadError": "Не удалось загрузить финансовые данные.", "finance.budgetLoadError": "Не удалось загрузить данные бюджета.", "finance.budgetSaved": "Бюджет сохранён", "finance.budgetSaveError": "Не удалось сохранить бюджет.", "finance.confirmDeleteBudget": "Удалить этот бюджет?", "finance.budgetDeleted": "Бюджет удалён", "finance.budgetDeleteError": "Не удалось удалить бюджет.", "finance.incomeSaved": "Доход сохранён", "finance.expenseSaved": "Расход сохранён", "finance.transactionSaveError": "Не удалось сохранить запись.", "finance.confirmDeleteTransaction": "Удалить эту финансовую запись?", "finance.eyebrow": "ФИНАНСЫ", "finance.title": "Прибыль и убыток", "finance.subtitle": "Доход, расход и результат бизнеса в одном месте.", "finance.expense": "Расход", "finance.income": "Доход", "finance.overview": "Обзор", "finance.budgets": "Бюджеты", "finance.netProfit": "Чистая прибыль", "finance.recentTransactions": "Последние операции", "finance.noCategory": "Без категории", "finance.noAccount": "Счёт не выбран", "finance.noTransactions": "Финансовых записей пока нет.", "finance.accounts": "Счета", "finance.defaultAccount": "Основной", "finance.forecastLabel": "Прогноз баланса на конец месяца", "finance.forecastBadge": "это прогноз", "finance.insufficientData": "Недостаточно данных — для прогноза нужно минимум 3 дня записей в этом месяце.", "finance.dailyAverage": "среднее в день", "finance.addBudget": "Добавить бюджет", "finance.overallBudget": "Общий бюджет", "finance.overBudget": "Превышен", "finance.nearLimit": "Близко к лимиту", "finance.noBudgets": "На этот месяц бюджет не задан.", "finance.newEntryEyebrow": "НОВАЯ ЗАПИСЬ", "finance.addSuffix": "добавление", "finance.name": "Название", "finance.amount": "Сумма", "finance.account": "Счёт", "finance.automatic": "Автоматически", "finance.category": "Категория", "finance.description": "Заметка", "finance.newBudgetEyebrow": "НОВЫЙ БЮДЖЕТ", "finance.overallBudgetOption": "Общий (все расходы)", "finance.incomePlaceholder": "Например: Продажа товара", "finance.expensePlaceholder": "Например: Расходы на рекламу",

  "calendar.loadError": "Не удалось загрузить встречи", "calendar.enterTitle": "Введите название встречи", "calendar.selectDateTime": "Выберите дату и время", "calendar.endAfterStart": "Время окончания должно быть позже времени начала", "calendar.timeConflict": "На это время уже есть другая встреча. Измените время.", "calendar.updatedWithSyncError": "Встреча обновлена, но ошибка синхронизации с Google:", "calendar.updated": "Встреча обновлена", "calendar.createdWithSyncError": "Встреча сохранена, но ошибка синхронизации с Google:", "calendar.created": "Встреча добавлена в календарь", "calendar.saveError": "Не удалось сохранить встречу", "calendar.deleteError": "Не удалось удалить встречу", "calendar.deleted": "Встреча удалена", "calendar.deletedWithSyncError": "Встреча удалена, но ошибка синхронизации с Google:", "calendar.noEvents": "Нет событий", "calendar.selectedDay": "ВЫБРАННЫЙ ДЕНЬ", "calendar.reminder": "Напоминание", "calendar.editAria": "Редактировать встречу", "calendar.deleteAria": "Удалить встречу", "calendar.noEventsTitle": "Событий нет", "calendar.addEvent": "Добавить событие", "calendar.todayCount": "Сегодня у вас {count} событий", "calendar.nextMeetingAt": "Следующая встреча в {time}.", "calendar.noMeetingsToday": "На сегодня встреч нет.", "calendar.prevMonth": "Предыдущий месяц", "calendar.nextMonth": "Следующий месяц", "calendar.viewSwitch": "Вид календаря", "calendar.closeModal": "Закрыть окно встречи", "calendar.editEventEyebrow": "РЕДАКТИРОВАНИЕ", "calendar.newEventEyebrow": "НОВОЕ СОБЫТИЕ", "calendar.enterEventInfo": "Введите данные события.", "calendar.dateAria": "Дата встречи", "calendar.start": "Начало", "calendar.startTimeAria": "Время начала", "calendar.end": "Конец", "calendar.endTimeAria": "Время окончания", "calendar.descriptionAria": "Описание встречи", "calendar.reminderAria": "Напоминание о встрече", "calendar.reminder15": "За 15 минут", "calendar.reminder1h": "За 1 час", "calendar.pageEyebrow": "ВАШЕ РАСПИСАНИЕ", "calendar.deleteTitle": "Удаление встречи", "calendar.deleteDescription": "Подтвердите удаление встречи «{title}»?",

  "dashboard.monthFinance": "Финансы за текущий месяц",

  "recentFiles.title": "Последние файлы", "recentFiles.subtitle": "Ваши недавно загруженные документы", "recentFiles.all": "Все", "recentFiles.emptyTitle": "Файлы ещё не загружены", "recentFiles.emptySubtitle": "Ваши документы появятся здесь.", "recentFiles.upload": "Загрузить файл", "recentFiles.openAria": "Открыть файл {name}",

  "admin.nav.group.control": "УПРАВЛЕНИЕ", "admin.nav.overview": "Обзор", "admin.nav.users": "Пользователи", "admin.nav.usage": "Использование", "admin.nav.group.system": "СИСТЕМА", "admin.nav.integrations": "Интеграции", "admin.nav.notifications": "Уведомления", "admin.nav.files": "Файлы", "admin.nav.activity": "Журнал активности", "admin.nav.system": "Состояние системы", "admin.nav.group.setup": "НАСТРОЙКА", "admin.nav.settings": "Настройки",
  "admin.role.admin": "Администратор", "admin.role.user": "Пользователь",
  "admin.status.active": "Активен", "admin.status.blocked": "Заблокирован",
  "admin.connection.connected": "Подключено", "admin.connection.disconnected": "Не подключено", "admin.connection.error": "Ошибка",
  "admin.notif.total": "Всего", "admin.notif.pending": "Ожидание", "admin.notif.sent": "Отправлено", "admin.notif.failed": "Ошибка", "admin.notif.read": "Прочитано",
  "admin.source.upload": "Загружено", "admin.source.googleDrive": "Google Drive", "admin.source.telegram": "Telegram", "admin.source.system": "Система",
  "admin.storage.local": "Локальный диск", "admin.storage.s3": "Amazon S3",
  "admin.health.ok": "Работает", "admin.health.running": "Работает", "admin.health.unreachable": "Недоступно", "admin.health.stopped": "Остановлено",
  "admin.env.production": "Рабочая среда", "admin.env.development": "Среда разработки", "admin.env.test": "Тестовая среда",
  "admin.action.taskCreated": "Задача создана", "admin.action.taskCompleted": "Задача выполнена", "admin.action.reminderCreated": "Напоминание создано", "admin.action.meetingCreated": "Встреча создана", "admin.action.noteCreated": "Заметка создана", "admin.action.contactCreated": "Контакт создан", "admin.action.contactUpdated": "Контакт обновлён", "admin.action.contactDeleted": "Контакт удалён", "admin.action.memoryCreated": "Память создана", "admin.action.memoryUpdated": "Память обновлена", "admin.action.memoryDeleted": "Память удалена", "admin.action.financeTxCreated": "Финансовая запись создана", "admin.action.financeTxUpdated": "Финансовая запись обновлена", "admin.action.financeTxDeleted": "Финансовая запись удалена", "admin.action.financeCatCreated": "Категория финансов создана", "admin.action.financeCatUpdated": "Категория финансов обновлена", "admin.action.financeCatDeleted": "Категория финансов удалена", "admin.action.aiToolExecuted": "AI инструмент использован", "admin.action.telegramConnected": "Telegram подключён", "admin.action.telegramDisconnected": "Telegram отключён", "admin.action.telegramMessageSent": "Сообщение в Telegram отправлено", "admin.action.notificationSent": "Уведомление отправлено", "admin.action.notificationFailed": "Уведомление не доставлено", "admin.action.googleConnected": "Google подключён", "admin.action.googleDisconnected": "Google отключён", "admin.action.gcalCreated": "Событие Google Календаря создано", "admin.action.gcalUpdated": "Событие Google Календаря обновлено", "admin.action.gcalDeleted": "Событие Google Календаря удалено", "admin.action.fileUploaded": "Файл загружен", "admin.action.fileDeleted": "Файл удалён", "admin.action.pwResetRequested": "Запрошен сброс пароля", "admin.action.pwResetCompleted": "Пароль восстановлен", "admin.action.loginFailed": "Неудачный вход", "admin.action.loginSucceeded": "Вход выполнен", "admin.action.loginBlocked": "Вход заблокирован", "admin.action.registered": "Регистрация выполнена", "admin.action.registerFailed": "Ошибка регистрации", "admin.action.refreshSucceeded": "Сессия обновлена", "admin.action.logoutCompleted": "Выход выполнен", "admin.action.passwordChanged": "Пароль изменён", "admin.action.folderCreated": "Папка создана", "admin.action.folderUpdated": "Папка обновлена", "admin.action.folderDeleted": "Папка удалена", "admin.action.userBlocked": "Пользователь заблокирован", "admin.action.userUnblocked": "Пользователь разблокирован", "admin.action.roleChanged": "Роль изменена",
  "admin.entity.user": "Пользователь", "admin.entity.task": "Задача", "admin.entity.reminder": "Напоминание", "admin.entity.meeting": "Встреча", "admin.entity.note": "Заметка", "admin.entity.contact": "Контакт", "admin.entity.file": "Файл", "admin.entity.notification": "Уведомление", "admin.entity.auth": "Аутентификация", "admin.entity.memory": "Память", "admin.entity.folder": "Папка",
  "admin.noActivityYet": "Активности пока нет",
  "admin.uptime.daysHours": "{days} дн {hours} ч", "admin.uptime.hoursMinutes": "{hours} ч {minutes} мин", "admin.uptime.minutes": "{minutes} мин",
  "admin.noDataForPeriod": "За выбранный период нет реальных данных.", "admin.loadFailed": "Не удалось загрузить данные", "admin.noDynamicsForPeriod": "Нет динамики за этот период", "admin.realMetricFromDb": "Реальный показатель из базы данных",
  "admin.overview.eyebrow": "СТАТИСТИКА ПЛАТФОРМЫ", "admin.overview.title": "Добрый день, администратор", "admin.overview.description": "Операционная картина платформы Qulay AI в реальном времени.",
  "admin.item.tasks": "Задачи", "admin.item.reminders": "Напоминания", "admin.item.meetings": "Встречи", "admin.item.notes": "Заметки", "admin.item.contacts": "Контакты", "admin.item.financeTransactions": "Финансовые записи", "admin.item.filesUploaded": "Загруженные файлы", "admin.item.files": "Файлы", "admin.item.aiRequests": "AI запросы",
  "admin.kpi.totalUsers": "Всего пользователей", "admin.kpi.activeUsers": "Активные пользователи", "admin.kpi.joinedToday": "Присоединились сегодня", "admin.kpi.joinedThisMonth": "Присоединились в этом месяце", "admin.kpi.blocked": "Заблокированные", "admin.kpi.totalAiRequests": "Всего AI запросов", "admin.kpi.totalFiles": "Всего файлов", "admin.kpi.totalNotifications": "Всего уведомлений",
  "admin.chart.userGrowth": "Рост пользователей", "admin.lastNDays": "Последние {range} дней", "admin.chart.activityTrend": "Динамика активности",
  "admin.activityOverview.title": "Обзор активности", "admin.activityOverview.detail": "Объекты, созданные за выбранный период",
  "admin.connectionsSection.title": "Подключения", "admin.connectionsSection.detail": "Только общая статистика",
  "admin.mini.telegramConnected": "Telegram подключён", "admin.mini.googleConnected": "Google подключён", "admin.mini.activeReminders": "Активные напоминания", "admin.mini.upcomingMeetings": "Ближайшие встречи",
  "admin.operations.eyebrow": "ОПЕРАЦИИ", "admin.operations.title": "Держите платформу прозрачной и под контролем.", "admin.operations.body": "Используйте журнал активности для аудита, действия пользователей для контроля доступа и данные использования для будущей отчётности.", "admin.operations.openActivity": "Открыть журнал активности",
  "admin.rangeDays": "{count} дн.",
  "admin.users.eyebrow": "КАТАЛОГ", "admin.users.description": "Управляйте правами доступа, ролями и активностью пользователей платформы.", "admin.users.searchPlaceholder": "Поиск по имени или email", "admin.filter.allRoles": "Все роли", "admin.filter.allStatuses": "Все статусы", "admin.sort.createdAt": "Дата регистрации", "admin.sort.lastActivity": "Последняя активность", "admin.sort.toggleAria": "Изменить порядок сортировки", "admin.sort.asc": "По возрастанию", "admin.sort.desc": "По убыванию",
  "admin.th.user": "Пользователь", "admin.th.email": "Email", "admin.th.role": "Роль", "admin.th.status": "Статус", "admin.th.registered": "Дата регистрации", "admin.th.lastActivity": "Последняя активность", "admin.th.integrations": "Интеграции",
  "admin.viewDetails": "Подробнее", "admin.users.emptyTitle": "Пользователи не найдены", "admin.users.emptyHint": "Попробуйте выбрать другое имя, email, роль или статус.",
  "admin.backToUsers": "Вернуться к пользователям", "admin.userDetail.eyebrow": "ДЕТАЛИ ПОЛЬЗОВАТЕЛЯ", "admin.confirmBlock.title": "Заблокировать пользователя", "admin.confirmUnblock.title": "Разблокировать пользователя", "admin.confirmBlock.description": "Заблокировать пользователя {email}?", "admin.confirmUnblock.description": "Разблокировать пользователя {email}?", "admin.block": "Заблокировать", "admin.unblock": "Разблокировать", "admin.changeRole.title": "Изменить роль", "admin.changeRole.description": "Изменить роль этого пользователя на «{role}»?", "admin.changeAction": "Изменить",
  "admin.profile.eyebrow": "ПРОФИЛЬ", "admin.usageSection.eyebrow": "ИСПОЛЬЗОВАНИЕ", "admin.usageSection.title": "Обзор использования", "admin.usageSection.detail": "Статистика за всё время для этого пользователя",
  "admin.actionsCard.eyebrow": "ДЕЙСТВИЯ АДМИНИСТРАТОРА", "admin.actionsCard.title": "Управление доступом и ролью", "admin.actionsCard.detail": "Каждое действие требует подтверждения", "admin.changeRole.label": "Изменить роль",
  "admin.metadataOnly": "Только метаданные", "admin.security.eyebrow": "БЕЗОПАСНОСТЬ", "admin.security.title": "Безопасность аккаунта", "admin.sensitiveHidden": "Конфиденциальные данные скрыты", "admin.security.activeSessions": "Активные сессии", "admin.security.resetRequests": "Запросы на сброс пароля",
  "admin.recentActivity.title": "Последняя активность", "admin.sensitiveDataHidden": "Конфиденциальные данные скрыты", "admin.recentActivity.empty": "Недавней активности нет",
  "admin.connectedServices.title": "Подключённые сервисы",
  "admin.files.searchPlaceholder": "Поиск по названию файла", "admin.filter.allSources": "Все источники", "admin.filter.allStorage": "Все хранилища", "admin.filter.storageLocal": "Локальный", "admin.filter.allTypes": "Все типы", "admin.type.image": "Изображение", "admin.type.document": "Документ",
  "admin.activityPage.eyebrow": "ЖУРНАЛ АУДИТА", "admin.activityPage.description": "Действия, подлежащие аудиту; конфиденциальные значения намеренно скрыты.", "admin.activityPage.userIdPlaceholder": "ID пользователя (UUID)", "admin.activityPage.actionPlaceholder": "Тип действия (например, LOGIN)", "admin.activityPage.entityPlaceholder": "Тип объекта (например, USER)", "admin.fromDate": "От даты", "admin.toDate": "До даты", "admin.activityPage.uuidHint": "ID пользователя должен быть в формате UUID (например, 3fa85f64-5717-4562-b3fc-2c963f66afa6).",
  "admin.section.userDetail": "Детали пользователя",
  "admin.eyebrow.usage": "СТАТИСТИКА ИСПОЛЬЗОВАНИЯ", "admin.eyebrow.integrations": "ИНТЕГРАЦИИ", "admin.eyebrow.notifications": "УВЕДОМЛЕНИЯ", "admin.eyebrow.files": "ФАЙЛЫ", "admin.eyebrow.system": "СОСТОЯНИЕ СИСТЕМЫ", "admin.eyebrow.settings": "НАСТРОЙКИ",
  "admin.desc.usage": "Использование рассчитывается на основе записей AiUsage. Никакие приблизительные значения не добавляются.", "admin.desc.integrations": "Статус подключения без конфиденциальных данных и токенов.", "admin.desc.notifications": "Статус доставки, ошибки и безопасный общий мониторинг.", "admin.desc.files": "Только метаданные и объём хранения; исходный контент остаётся конфиденциальным.", "admin.desc.system": "Операционные сигналы платформы Qulay AI.", "admin.desc.settings": "Безопасные настройки платформы на основе реальных данных бэкенда.",
  "admin.usage.totalRequests": "Всего запросов", "admin.usage.inputTokens": "Входные токены", "admin.usage.outputTokens": "Выходные токены", "admin.usage.estimatedCost": "Примерная стоимость", "admin.usage.trendTitle": "Динамика использования", "admin.usage.trendDetail": "Реальные записи AiUsage", "admin.usage.providerStatusTitle": "Статус провайдера", "admin.usage.providerConnected": "Провайдер подключён", "admin.usage.providerNotConnected": "OpenAI ещё не подключён", "admin.usage.providerConnectedDetail": "{tools} вызовов инструментов · {seconds} сек. аудио", "admin.usage.providerNotConnectedDetail": "После подключения OpenAI здесь появится статистика токенов, расходов и ответов.", "admin.selectedPeriod": "Выбранный период", "admin.usage.requestsCount": "{count} запросов", "admin.usage.noUsage": "Использование AI не зафиксировано", "admin.usage.noUsageHint": "Это нейтральное состояние — фиктивное использование не отображается.", "admin.usage.topTools": "Самые используемые инструменты", "admin.usage.topToolsDetail": "Логи активности AI Tool Registry", "admin.usage.unknownTool": "Неизвестный инструмент", "admin.usage.toolExecution": "Выполнение инструмента", "admin.usage.noToolUsage": "Использование инструментов не зафиксировано",
  "admin.integrations.healthTitle": "Состояние интеграций", "admin.integrations.healthDetail": "Реальное состояние системы без секретных данных", "admin.integrations.telegramLastCheck": "Последняя проверка Telegram", "admin.neverChecked": "Ещё не проверено", "admin.integrations.telegramRecentErrors": "Недавние ошибки Telegram", "admin.integrations.calendarEnabledUsers": "Пользователи с доступом к Calendar", "admin.integrations.driveEnabledUsers": "Пользователи с доступом к Drive", "admin.integrations.warningsTitle": "Проблемные интеграции", "admin.integrations.warningsDetail": "Последние 24 часа / статус ERROR", "admin.timeUnknown": "время неизвестно", "admin.integrations.noWarnings": "Проблемных интеграций нет", "admin.integrations.allHealthy": "Подключения работают нормально.",
  "admin.connectionCard.subtitle": "Общая статистика системы",
  "admin.notifications.deliveryStatus": "Статус доставки", "admin.notifications.successRate": "Успешно {rate}%", "admin.notifications.recentFailedTitle": "Недавние неудачные уведомления", "admin.notifications.recentFailedDetail": "Контент скрыт · повторная отправка безопасно ставится в очередь", "admin.notifications.errorBadge": "ОШИБКА", "admin.notifications.attemptsCount": "{count} попыток", "admin.notifications.queued": "Поставлено в очередь", "admin.notifications.pendingRetry": "Ожидание...", "admin.notifications.resend": "Отправить повторно", "admin.notifications.noFailed": "Неудачных уведомлений нет",
  "admin.files.storageTitle": "Объём хранения", "admin.files.storageDetail": "Удалённые записи не учитываются", "admin.files.total": "Всего файлов", "admin.files.totalSize": "Общий объём", "admin.files.images": "Изображения", "admin.files.docs": "Документы", "admin.files.providerTitle": "Провайдер хранения", "admin.files.bySource": "По источнику", "admin.files.recentTitle": "Последние файлы", "admin.files.noFiles": "Файлы не загружены",
  "admin.activityView.title": "След аудита", "admin.aiTool": "AI инструмент", "admin.appSource": "Приложение", "admin.activityView.empty": "Активность не зафиксирована",
  "admin.system.uptimeInfoTitle": "Данные о времени работы", "admin.system.database": "База данных", "admin.system.dbLatency": "Задержка базы данных", "admin.system.notificationWorker": "Воркер уведомлений", "admin.system.environment": "Среда", "admin.system.uptime": "Время работы", "admin.system.migrations": "Миграции", "admin.system.migrationsManaged": "Управляется через Prisma", "admin.system.integrationsTitle": "Состояние интеграций", "admin.system.noDataExposed": "Никакие данные не раскрываются",
  "admin.noDataAvailable": "Данные недоступны.",
  "admin.settings.platformSaved": "Настройки платформы сохранены", "admin.settings.platformTitle": "Настройки платформы", "admin.settings.platformDetail": "Изменения применяются к реальной платформе", "admin.settings.platformName": "Название платформы", "admin.settings.registrationTitle": "Новая регистрация", "admin.settings.registrationHint": "Если отключено, новые пользователи не смогут создавать аккаунты.", "admin.settings.defaultStatus": "Статус по умолчанию",
  "admin.securitySection.title": "Безопасность", "admin.readonlyRealValues": "Реальные, действующие значения (только чтение)", "admin.settings.accessTokenTtl": "Срок действия access token", "admin.settings.refreshTokenTtl": "Срок действия refresh token", "admin.settings.loginAttemptsIp": "Попытки входа (IP)", "admin.perMinutes": "{max} / {window} мин.", "admin.settings.loginAttemptsEmail": "Попытки входа (email)", "admin.settings.registerAttempts": "Попытки регистрации", "admin.perMinutesIp": "{max} / {window} мин. (IP)", "admin.settings.resetAttempts": "Попытки сброса пароля", "admin.settings.globalRateLimit": "Общий лимит запросов", "admin.perSecondsIp": "{max} / {window} сек. (IP)", "admin.settings.bruteForce": "Защита от подбора пароля", "admin.bruteForceValue": "{fails} ошибок → блокировка на {lock} мин.",
  "admin.settings.workerConfigReadonly": "Конфигурация воркера (только чтение)", "admin.settings.workerStatus": "Статус воркера", "admin.settings.checkInterval": "Интервал проверки", "admin.seconds": "{count} сек.", "admin.settings.batchSize": "Размер пакета", "admin.settings.retryLimit": "Лимит повторов",
  "admin.settings.integrationsDetail": "Статус настройки без секретных данных", "admin.configured": "Настроено", "admin.notConfigured": "Не настроено",
  "admin.settings.storageTitle": "Хранилище", "admin.settings.storageDetail": "Конфигурация хранения файлов (только чтение)", "admin.settings.currentProvider": "Текущий провайдер", "admin.settings.maxFileSize": "Максимальный размер файла",
  "admin.settings.systemDetail": "Среда и статус бэкенда (только чтение)", "admin.settings.version": "Версия", "admin.unknown": "Неизвестно", "admin.settings.backendStatus": "Статус бэкенда", "admin.settings.dbStatus": "Статус базы данных",
  "admin.recordsCount": "{count} записей",
  "admin.adminPanel": "Панель администратора", "admin.backToApp": "Вернуться в приложение", "admin.toggleTheme": "Переключить тему",

  "settings.appearance.hint": "Светлый или тёмный режим", "settings.notifications.hint": "Звук, тихие часы и типы сообщений", "settings.ai.hint": "Память, ответы и контроль конфиденциальности", "agentBriefing.subtitle.short": "Утренний план, вечерний итог и проактивные советы", "settings.language.hint": "Узбекский или русский язык", "settings.integrations.hint": "Telegram, Calendar и Drive",
  "settings.notif.newTasksHint": "Уведомлять при обновлении задачи", "settings.notif.remindersHint": "Уведомлять при приближении времени напоминания", "settings.notif.meetingsHint": "Напоминать перед встречей", "settings.notif.aiRepliesLabel": "Советы AI", "settings.notif.aiRepliesHint": "Уведомлять о советах Qulay AI", "settings.notif.telegramLabel": "Уведомления Telegram", "settings.notif.telegramHint": "Отправлять на подключённый аккаунт Telegram", "settings.notif.webPushLabel": "Web push", "settings.notif.webPushHint": "Скоро будет доступно",
  "settings.backToProfile": "Вернуться в профиль",
  "common.and": "и",
  "settings.google.connectedWith": "Google {services} подключён", "settings.google.connectedNoScopes": "Аккаунт Google подключён, но нужные разрешения не найдены", "settings.google.cancelled": "Подключение Google отменено", "settings.google.oauthErrorCode": "Ошибка Google OAuth: {code}", "settings.google.finishFailed": "Не удалось завершить подключение Google", "settings.google.checkFailed": "Не удалось проверить статус подключения Google",
  "settings.notifPrefsLoadError": "Не удалось загрузить настройки уведомлений", "settings.notifPrefSaveError": "Не удалось сохранить настройку уведомлений",
  "settings.nameTooShort": "Имя должно содержать не менее 2 символов", "settings.profileSaved": "Профиль сохранён", "settings.profileSaveError": "Не удалось сохранить профиль на сервере",
  "settings.avatarNotImage": "Выберите только файл изображения", "settings.avatarTooLarge": "Размер аватара не должен превышать 2 МБ", "settings.avatarUpdated": "Аватар обновлён",
  "settings.backToSettings": "Вернуться в настройки",
  "settings.profileInfo.title": "Данные профиля", "settings.profileInfo.subtitle": "Обновите аватар, имя и информацию о себе.", "settings.avatarAlt": "Аватар {name}", "settings.changePhoto": "Сменить фото",
  "settings.firstNameLabel": "Имя", "settings.lastNameLabel": "Фамилия", "settings.emailLabel": "Email", "settings.bioLabel": "О себе", "settings.profileSettingsHint": "Профиль и настройки приложения",
  "settings.appearance.subtitle": "Выберите тему интерфейса.", "settings.themeAria": "Тема", "settings.themeLight": "Светлая", "settings.themeDark": "Тёмная",
  "settings.notifications.subtitle": "Выберите, какие сообщения вы хотите получать.",
  "settings.soundLabel": "Звук уведомлений", "settings.soundHint": "Проигрывать мягкий сигнал при важном новом сообщении.", "settings.quietHours": "Тихие часы", "settings.quietHoursHint": "В выбранное время звуковые уведомления не воспроизводятся.", "settings.quietStart": "Начало", "settings.quietEnd": "Конец",
  "settings.ai.subtitle": "Настройте, как Qulay AI отвечает и как подтверждаются действия.", "settings.replyStyleLabel": "Стиль ответа", "settings.replyStyle.professional": "Профессиональный", "settings.replyStyle.simple": "Простой", "settings.replyStyle.short": "Краткий", "settings.replyLengthLabel": "Длина ответа", "settings.replyLength.short": "Короткий", "settings.replyLength.medium": "Средний", "settings.replyLength.detailed": "Подробный",
  "settings.saveHistoryLabel": "Сохранять историю чата", "settings.saveHistoryHint": "Предыдущие чаты сохраняются в браузере и продолжаются позже.", "settings.confirmExternalLabel": "Подтверждение внешних действий", "settings.confirmExternalHint": "Перед отправкой сообщения в Telegram и других внешних действий будет запрошено подтверждение.", "settings.voiceReplyLabel": "Голосовой ответ", "settings.voiceReplyHint": "AI может озвучивать ответ в голосовом режиме.",
  "settings.integrations.subtitle": "Telegram, Google Calendar, Google Drive и WhatsApp.", "settings.connectedCount": "{count} подключено",
  "settings.logoutConfirm.title": "Хотите выйти из аккаунта?", "settings.logoutConfirm.description": "Ваша сессия и токены на устройстве будут очищены.",
  "settings.passwordUpdatedRelogin": "Ваш пароль обновлён. Войдите снова.",

  "files.loadError": "Ошибка при загрузке файлов.", "files.unsupportedType": "{name}: этот тип файла не поддерживается", "files.tooLarge": "{name}: максимальный размер {size} МБ", "files.uploaded": "{name} загружен", "files.uploadFailed": "загрузка не удалась",
  "files.deleted": "Файл удалён", "files.deleteError": "Не удалось удалить файл.", "files.openError": "Не удалось открыть файл.",
  "files.folderNameTooShort": "Название папки должно содержать не менее 2 символов", "files.folderNameDuplicate": "Папка с таким именем уже существует", "files.folderCreated": "Папка создана", "files.folderRenamed": "Название папки обновлено", "files.folderCreateError": "Не удалось создать папку.", "files.folderRenameError": "Не удалось обновить папку.",
  "files.folderDeleted": "Папка удалена", "files.folderDeleteError": "Не удалось удалить папку.", "files.fallbackName": "файл", "files.downloadError": "Не удалось скачать файл.",
  "files.eyebrow": "ВАШЕ РАБОЧЕЕ ПРОСТРАНСТВО", "files.countSuffix": "{count} файлов", "files.gridView": "Вид сеткой", "files.listView": "Вид списком", "files.collectionsEyebrow": "КОЛЛЕКЦИИ", "files.itemCount": "{count} файл(ов)", "files.inRootFolder": "{count} файлов в корневом каталоге", "files.recentEyebrow": "НЕДАВНИЕ",
  "files.uploadingProgress": "{name} загружается… {progress}%", "files.loading": "Файлы загружаются…", "files.openFileAria": "Открыть файл {name}", "files.sourceUploaded": "Загружено", "files.openActionsAria": "Открыть действия с файлом",
  "files.aiCard.title": "Работайте с PDF, Word и Excel", "files.aiCard.subtitle": "Текст загруженного документа безопасно извлекается; AI ищет по нему и отвечает на вопросы.",
  "files.closePreview": "Закрыть предпросмотр", "files.closeFolderDialog": "Закрыть окно папки", "files.newFolderHint": "Дайте папке понятное имя, чтобы держать файлы в порядке.", "files.renameFolderHint": "Новое имя должно быть уникальным в этом рабочем пространстве.", "files.folderNamePlaceholder": "Например: Договоры",
  "files.deleteFileTitle": "Удаление файла", "files.deleteFileDescription": "Удалить файл «{name}»?", "files.deleteFolderTitle": "Удаление папки", "files.deleteFolderDescription": "Папка будет удалена. Файлы внутри будут перемещены в корневой каталог. Продолжить?",

  "reminders.loadError": "Не удалось загрузить напоминания", "reminders.reactivated": "Напоминание снова активно", "reminders.completedToast": "Напоминание выполнено", "reminders.statusUpdateError": "Не удалось обновить статус напоминания", "reminders.deleteError": "Не удалось удалить напоминание", "reminders.deletedToast": "Напоминание удалено",
  "reminders.titleRequired": "Введите название напоминания", "reminders.dateTimeRequired": "Выберите дату и время", "reminders.updatedToast": "Напоминание обновлено", "reminders.createdToast": "Напоминание создано", "reminders.saveError": "Не удалось сохранить напоминание",
  "reminders.snoozedToast": "Напоминание отложено на {minutes} мин.", "reminders.snoozeError": "Не удалось отложить напоминание",
  "reminders.eyebrow": "ЛИЧНЫЕ НАПОМИНАНИЯ", "reminders.activeStat.label": "АКТИВНЫЕ НАПОМИНАНИЯ", "reminders.activeStat.hint": "Напоминания, которые пока нужно выполнить", "reminders.todayStat.label": "СЕГОДНЯ", "reminders.todayStat.hint": "Напоминания на сегодня",
  "reminders.overdueStat.hint": "Просрочено, ещё не выполнено", "reminders.doneStat.hint": "Завершённые напоминания",
  "reminders.searchAria": "Поиск по напоминаниям", "reminders.centerEyebrow": "ЦЕНТР НАПОМИНАНИЙ", "reminders.actionsAria": "Действия для {title}", "reminders.emptyHint": "Попробуйте другой фильтр или поисковый запрос.",
  "reminders.markIncomplete": "Отметить невыполненным", "reminders.markComplete": "Отметить выполненным",
  "reminders.sideEyebrow": "СЛЕДУЮЩЕЕ НАПОМИНАНИЕ", "reminders.nextTitle": "Следующее напоминание", "reminders.nextReminderMeta": "{date} · напоминание",
  "reminders.sideText": "Планируйте напоминания заранее, чтобы не забыть важные дела.", "reminders.noActiveReminder": "Активных напоминаний пока нет.", "reminders.addButton": "Добавить напоминание",
  "reminders.closeModalAria": "Закрыть окно напоминания", "reminders.editEyebrow": "РЕДАКТИРОВАНИЕ", "reminders.newEyebrow": "НОВОЕ НАПОМИНАНИЕ", "reminders.editHint": "Обновите данные напоминания.", "reminders.createHint": "Создайте новое напоминание, чтобы не забыть важное дело.",
  "reminders.descriptionAria": "Описание напоминания",
  "reminders.deleteConfirmTitle": "Удалить напоминание?", "reminders.deleteConfirmDescription": "Это действие нельзя отменить. Напоминание будет удалено навсегда.",

  "tasks.loadError": "Не удалось загрузить задачи", "tasks.reactivatedToast": "Задача снова активна", "tasks.completedToast": "Задача выполнена", "tasks.deleteError": "Не удалось удалить задачу", "tasks.deletedToast": "«{title}» удалена",
  "tasks.titleRequired": "Введите название задачи", "tasks.updatedToast": "Задача обновлена", "tasks.createdToast": "Задача создана",
  "tasks.eyebrow": "СЕГОДНЯШНЯЯ РАБОТА", "tasks.completedOfTotal": "{completed} / {total} задач", "tasks.progressSentence": "Выполнено {percent}% сегодняшних задач.",
  "tasks.searchAria": "Поиск по задачам", "tasks.listEyebrow": "ЗАДАЧИ", "tasks.allShownToast": "Показаны все задачи",
  "tasks.actionsAria": "Действия для {title}", "tasks.copyTitleSuffix": "{title} — копия", "tasks.duplicatedToast": "Задача скопирована", "tasks.duplicateError": "Не удалось скопировать задачу",
  "tasks.closeModalAria": "Закрыть окно задачи", "tasks.editEyebrow": "РЕДАКТИРОВАНИЕ", "tasks.newEyebrow": "НОВАЯ ЗАДАЧА", "tasks.editHint": "Обновите данные задачи.", "tasks.createHint": "Добавьте новую задачу в сегодняшний план.",
  "tasks.descriptionAria": "Описание задачи", "tasks.deleteConfirmTitle": "Удаление задачи", "tasks.deleteConfirmDescription": "Удалить задачу «{title}»? Это действие нельзя отменить.",

  "dashboard.friendFallback": "Друг", "dashboard.prompt.whatToday": "Что мне делать сегодня?", "dashboard.prompt.buildPlan": "Составь мой план", "dashboard.prompt.addReminder": "Добавь напоминание",
  "dashboard.openProfile": "Открыть профиль", "dashboard.welcome": "Добро пожаловать,", "dashboard.readyToday": "Готовы начать сегодняшний план?",
  "dashboard.aiAssistant": "AI ПОМОЩНИК", "dashboard.online": "ОНЛАЙН", "dashboard.howCanIHelp": "Чем я могу помочь вам сегодня?", "dashboard.readyForYourPlan": "Я готов помочь с вашим планом, задачами и идеями.",
  "dashboard.talkToAi": "Поговорить с AI", "dashboard.viewTodayPlan": "Посмотреть план на сегодня", "dashboard.aiAssistantLabel": "AI помощник",
  "dashboard.heroLine1": "Управляйте сегодняшним днём", "dashboard.heroLine2": "с помощью AI.", "dashboard.heroSubtitle": "Управляйте задачами, встречами и важными делами через одного умного помощника.",
  "dashboard.todayPlanButton": "План на сегодня", "dashboard.openAiAssistant": "Открыть AI помощника", "dashboard.readyToHelp": "Готов помочь вам сегодня.",

  "adminLogin.accessDenied": "Нет прав администратора.", "adminLogin.invalidEmail": "Введите корректный email адрес.", "adminLogin.passwordTooShort": "Пароль должен содержать не менее 8 символов.",
  "adminLogin.eyebrow": "ЗАКРЫТОЕ РАБОЧЕЕ ПРОСТРАНСТВО", "adminLogin.headlinePrefix": "Платформой", "adminLogin.headlineEmphasis": "точно", "adminLogin.headlineSuffix": "управляйте.",
  "adminLogin.showcaseText": "Следите за пользователями, использованием и состоянием системы в одном безопасном админ-центре.",
  "adminLogin.secureAccess": "Безопасный доступ администратора", "adminLogin.roleBased": "Защита рабочего пространства по ролям",
  "adminLogin.brandEyebrow": "QULAY AI ADMIN", "adminLogin.welcome": "Добро пожаловать", "adminLogin.intro": "Введите данные учётной записи для входа в панель администратора.",
  "adminLogin.note": "Только для аккаунтов с правами ADMIN", "adminLogin.backToLogin": "Вернуться на обычную страницу входа",
};

export const getLocale = (): AppLocale => getSettings().language === "Русский" ? "ru" : "uz";

const warnedMissingKeys = new Set<string>();

export const translate = (key: string, fallback: string, locale: AppLocale): string => {
  if (locale !== "ru") return fallback;
  const value = RU[key];
  if (value === undefined && import.meta.env.DEV && !warnedMissingKeys.has(key)) {
    warnedMissingKeys.add(key);
    // eslint-disable-next-line no-console
    console.warn(`[i18n] Missing Russian translation for key "${key}" — falling back to Uzbek text.`);
  }
  return value ?? fallback;
};

const interpolate = (template: string, params?: Record<string, string | number>): string => {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
};

Object.assign(RU, {
  "voiceMode.action.createMeeting": "Создать встречу", "voiceMode.action.createTask": "Создать задачу", "voiceMode.action.createReminder": "Добавить напоминание", "voiceMode.action.createNote": "Создать заметку", "voiceMode.action.newNote": "Новая заметка", "voiceMode.action.getTodayPlan": "Посмотреть план на сегодня", "voiceMode.action.preparing": "Подготовка", "voiceMode.actionCancelled": "Действие отменено",
  "voiceMode.state.error": "Ошибка голосового режима", "voiceMode.state.speaking": "Отвечаю…", "voiceMode.state.thinking": "Думаю…", "voiceMode.state.listening": "Слушаю…", "voiceMode.state.muted": "Микрофон выключен", "voiceMode.state.idle": "Можете начать говорить",
  "voiceMode.notSupported": "Этот браузер не поддерживает голосовой ввод.", "voiceMode.dialogAria": "Голосовой режим Qulay AI", "voiceMode.subtitle": "Голосовой режим · Русский", "voiceMode.closeAria": "Закрыть голосовой режим", "voiceMode.you": "Вы", "voiceMode.readyForVoiceChat": "Готов к голосовому разговору.", "voiceMode.saving": "Сохранение", "voiceMode.checkMic": "Проверить микрофон", "voiceMode.turnMicOn": "Включить микрофон", "voiceMode.turnMicOff": "Выключить микрофон", "voiceMode.turnOn": "Включить", "voiceMode.mute": "Выключить", "voiceMode.endSessionAria": "Завершить голосовой сеанс", "voiceMode.end": "Завершить", "voiceMode.switchToKeyboardAria": "Перейти к клавиатуре", "voiceMode.keyboard": "Клавиатура", "voiceMode.stopSpeakingAria": "Остановить озвучивание", "voiceMode.soundOnAria": "Звук включён", "voiceMode.soundOn": "Звук включён", "voiceMode.textOnly": "Только текст",
  "tasks.saveError": "Не удалось сохранить задачу",
  "ai.voiceStarted": "Голосовой ввод включён", "ai.messagePlaceholder": "Введите сообщение…", "ai.messageAria": "Текст сообщения для AI", "ai.stopRecording": "Остановить запись", "ai.voiceMessage": "Голосовое сообщение", "common.stop": "Остановить", "common.send": "Отправить", "ai.scrollLatest": "Перейти к новым сообщениям", "ai.quickPanelAria": "Панель быстрых действий AI", "ai.deleteChatAria": "Удалить чат «{title}»", "ai.voiceLoading": "Загрузка голосового режима",
  "mobile.homeAria": "Главная страница Qulay AI", "mobile.home": "Главная", "mobile.notifications": "Уведомления", "mobile.profile": "Профиль", "mobile.avatarAlt": "Аватар пользователя {name}", "mobile.welcome": "Добро пожаловать,", "mobile.productiveDay": "Желаем продуктивного дня ✨", "mobile.aiAssistant": "AI ПОМОЩНИК", "mobile.online": "ОНЛАЙН", "mobile.talkToAi": "Поговорите с AI", "mobile.ask": "Задайте вопрос или поручение.", "mobile.openAi": "Начать разговор", "mobile.today": "Сегодня", "mobile.more": "Подробнее", "mobile.tasks": "Задачи", "mobile.completedCount": "Выполнено: {count}", "mobile.activeReminders": "Активные напоминания", "mobile.meetings": "Встречи", "mobile.scheduledToday": "Запланировано на сегодня", "mobile.notes": "Заметки", "mobile.savedNotes": "Сохранённые заметки", "mobile.nextMeeting": "Следующая встреча", "mobile.calendar": "Календарь", "mobile.noMeeting": "На сегодня встреч нет", "mobile.minutesLeft": "Осталось {count} мин.",
  "mobile.action.plan": "План на сегодня", "mobile.action.planHint": "Посмотреть план", "mobile.action.task": "Создать задачу", "mobile.action.taskHint": "Добавить новое дело", "mobile.action.reminder": "Добавить напоминание", "mobile.action.reminderHint": "Не забыть важное",
});

Object.assign(RU, {
  "integrations.modal.close": "Закрыть окно интеграции",
  "integrations.telegram.temporaryIssue": "Временная проблема со связью с Telegram",
  "integrations.lastSuccessfulSync": "Последняя успешная синхронизация",
  "common.error": "Ошибка",
  "integrations.connectedAccount": "Подключённый аккаунт",
  "integrations.activeConnection": "Активное подключение",
  "integrations.telegram.twoFactorPassword": "Пароль двухэтапной аутентификации Telegram",
  "integrations.telegram.sessionEncrypted": "Сессия хранится на сервере Qulay AI в зашифрованном виде.",
  "integrations.google.oauthHint": "Подтвердите доступ к Calendar и Drive в окне Google OAuth.",
  "integrations.username": "Имя пользователя",
  "integrations.oauthComingSoon": "Подключение OAuth будет добавлено на следующем этапе.",
  "nav.openProfileMenu": "Открыть меню профиля",
  "nav.userAvatar": "Аватар пользователя {{name}}",
  "nav.mobile": "Мобильная навигация",
  "nav.moreMenu": "Меню «Ещё»",
  "nav.more": "Ещё",
  "nav.closeMenu": "Закрыть меню",
  "nav.additionalSections": "Дополнительные разделы",
  "nav.logoutConfirmTitle": "Выйти из аккаунта?",
  "nav.logoutConfirmDescription": "Сессия и токены на этом устройстве будут удалены.",
  "top.searchWorkspace": "Поиск по рабочему пространству",
  "top.openProfile": "Открыть профиль {{name}}",
  "top.notificationCenter": "Центр уведомлений",
  "top.markAllRead": "Отметить все как прочитанные",
  "ai.chat.clear": "Очистить диалог",
  "common.minimize": "Свернуть",
  "ai.chat.close": "Закрыть диалог",
  "ai.message.copied": "Скопировано",
  "ai.message.copy": "Копировать",
  "ai.message.stopReading": "Остановить чтение",
  "ai.message.readAloud": "Прочитать вслух",
  "approvals.confirmed": "Действие подтверждено",
  "approvals.rejected": "Действие отклонено",
  "approvals.eyebrow": "AI-АГЕНТ",
  "approvals.title": "Подтверждения",
  "approvals.description": "Просматривайте здесь действия, которые AI-агент запрашивает к выполнению.",
  "common.loading": "Загрузка...",
  "approvals.reject": "Отклонить",
  "approvals.confirm": "Подтвердить",
  "approvals.empty": "В этом разделе пока ничего нет.",
  "dashboard.stats.title": "Сводка за сегодня",
  "dashboard.stats.description": "Ваши сегодняшние задачи и результаты",
  "common.details": "Подробнее",
  "common.today": "Сегодня",
  "dashboard.activity.title": "Последняя активность",
  "dashboard.activity.description": "Последние записи в рабочем пространстве",
  "dashboard.activity.empty": "Активности пока нет.",
  "dashboard.todayTasks": "Задачи на сегодня",
  "common.all": "Все",
  "tasks.changeStatus": "Изменить статус задачи «{{title}}»",
  "dashboard.noTasksToday": "На сегодня задач нет.",
  "voice.listening": "Слушаю...",
  "voice.speakHint": "Говорите — текст появится автоматически",
  "voice.state": "Состояние AI: {{state}}",
  "auth.platformLoading": "Загрузка {{platform}}",
  "auth.serverUnavailable": "Не удалось подключиться к серверу.",
  "common.retry": "Повторить",
  "ai.loading": "Загрузка Qulay AI",
  "ai.workspace": "Рабочее пространство AI",
  "common.cancel": "Отмена",
  "admin.error.title": "Что-то пошло не так",
  "admin.error.description": "Не удалось загрузить страницу администратора.",
  "admin.error.back": "Вернуться на главную страницу администратора",
  "integrations.connectedToast": "Интеграция «{{name}}» подключена",
  "integrations.generic": "Интеграция",
  "integrations.saveError": "Не удалось сохранить интеграцию",
  "integrations.disconnectedToast": "Интеграция «{{name}}» отключена",
  "integrations.statusSaveError": "Не удалось сохранить состояние интеграции",
  "top.switchLanguage": "Переключить язык на {{language}}",
  "top.currentLanguage": "Текущий язык: {{language}}",
  "ai.input.placeholder": "Введите сообщение...",
  "ai.chat.dialog": "Окно диалога Qulay AI",
  "contacts.usernamePlaceholder": "имя пользователя",
  "contacts.tagsPlaceholder": "VIP, клиент, продажи",
});

export const useI18n = () => {
  const [locale, setLocale] = useState<AppLocale>(getLocale);
  useEffect(() => subscribeToWorkspaceData("settings", () => {
    const next = getLocale();
    setLocale(next);
    document.documentElement.lang = next;
  }), []);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  return useMemo(() => ({
    locale,
    t: (key: string, fallback: string, params?: Record<string, string | number>) => interpolate(translate(key, fallback, locale), params),
  }), [locale]);
};
