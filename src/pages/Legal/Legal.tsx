import { Link } from "react-router-dom";
import { useI18n } from "../../i18n/useI18n";
import "./Legal.scss";

type Props = { kind: "privacy" | "terms" };

const content = {
  uz: {
    privacy: { title: "Maxfiylik siyosati", intro: "Qulay AI sizning shaxsiy va biznes ma’lumotlaringizni xizmatni ishlatish, xavfsiz saqlash va siz so‘ragan amallarni bajarish uchun qayta ishlaydi.", sections: [["Qanday ma’lumotlar", "Akkaunt ma’lumotlari, AI suhbatlari, siz yaratgan vazifa va moliyaviy yozuvlar hamda ixtiyoriy ulangan Google va Telegram ma’lumotlari."], ["Google ma’lumotlari", "Google Calendar va Drive ma’lumotlari faqat siz bergan ruxsat doirasida ishlatiladi. Qulay AI bu ma’lumotlarni reklama uchun sotmaydi."], ["Boshqaruv", "Integratsiyalarni istalgan payt uzishingiz, AI xotirasini ko‘rishingiz, tuzatishingiz, eksport yoki o‘chirishingiz mumkin."], ["Aloqa", "Maxfiylik bo‘yicha savollar uchun ilovada ko‘rsatilgan qo‘llab-quvvatlash emailiga murojaat qiling."]] },
    terms: { title: "Foydalanish shartlari", intro: "Qulay AI — vazifalar, kalendar, fayllar va moliyaviy yozuvlarni boshqarishga yordam beradigan yordamchi xizmat.", sections: [["Foydalanuvchi mas’uliyati", "Akkauntingiz xavfsizligi va AI tasdiqlash oynalarida qabul qilgan amallaringiz uchun siz javobgarsiz."], ["AI javoblari", "AI xato qilishi mumkin. Muhim moliyaviy, huquqiy yoki biznes qarorlarini mustaqil tekshiring."], ["Tarif va limitlar", "Tarif nomi, narxi va foydalanish limitlari ilovada ko‘rsatiladi. Avtomatik to‘lov integratsiyasi yoqilmaguncha tarif administrator tomonidan faollashtiriladi."], ["Xizmat", "Xavfsizlik, texnik xizmat yoki qonuniy talab sabab xizmat vaqtincha cheklanishi mumkin."]] },
  },
  ru: {
    privacy: { title: "Политика конфиденциальности", intro: "Qulay AI обрабатывает ваши личные и деловые данные для предоставления сервиса, безопасного хранения и выполнения запрошенных действий.", sections: [["Какие данные", "Данные аккаунта, переписка с ИИ, задачи, финансовые записи и данные добровольно подключённых Google и Telegram."], ["Данные Google", "Данные Google Calendar и Drive используются только в рамках выданного вами разрешения и не продаются для рекламы."], ["Управление", "Вы можете отключить интеграции, просмотреть, исправить, экспортировать или удалить память ИИ."], ["Связь", "По вопросам конфиденциальности обратитесь на email поддержки, указанный в приложении."]] },
    terms: { title: "Условия использования", intro: "Qulay AI помогает управлять задачами, календарём, файлами и финансовыми записями.", sections: [["Ответственность пользователя", "Вы отвечаете за безопасность аккаунта и действия, подтверждённые в интерфейсе ИИ."], ["Ответы ИИ", "ИИ может ошибаться. Проверяйте важные финансовые, юридические и деловые решения."], ["Тарифы и лимиты", "Название, цена и лимиты тарифа отображаются в приложении. Пока автоматическая оплата не подключена, тариф активирует администратор."], ["Сервис", "Доступ может быть временно ограничен из-за безопасности, обслуживания или требований закона."]] },
  },
} as const;

const Legal = ({ kind }: Props) => {
  const { locale } = useI18n();
  const page = content[locale === "ru" ? "ru" : "uz"][kind];
  return <main className="legal-page"><article><Link to="/">Qulay AI</Link><h1>{page.title}</h1><p>{page.intro}</p>{page.sections.map(([title, text]) => <section key={title}><h2>{title}</h2><p>{text}</p></section>)}<small>31.08.2026</small></article></main>;
};

export default Legal;
