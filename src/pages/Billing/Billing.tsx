import { useEffect, useState } from 'react';
import { Bot, BriefcaseBusiness, Check, MessageCircleMore, Send, Sparkles, Zap } from 'lucide-react';
import { subscriptionApi, type Plan, type PlanTier, type SubscriptionInfo } from '../../services/api/subscriptionApi';
import { useToast } from '../../hooks/useToast';
import { useI18n } from '../../i18n/useI18n';
import '../BusinessHub.scss';

const compact = (value: number, locale: string) => new Intl.NumberFormat(locale).format(value);
const Usage = ({label,used,limit,remaining,locale,showRemaining=false}:{label:string;used:number;limit:number;remaining?:number;locale:string;showRemaining?:boolean}) => { const shown=showRemaining ? (remaining ?? Math.max(0,limit-used)) : used; const ratio=showRemaining ? shown/Math.max(1,limit) : used/Math.max(1,limit); return <div style={{marginTop:14}}><div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#8d8798'}}><span>{label}</span><strong>{compact(Math.round(shown),locale)} / {compact(limit,locale)}</strong></div><div style={{height:7,marginTop:7,borderRadius:99,background:'rgba(116,82,212,.12)',overflow:'hidden'}}><span style={{display:'block',height:'100%',width:`${Math.min(100,Math.max(0,ratio*100))}%`,background:'linear-gradient(90deg,#825bea,#b250de)',borderRadius:99}}/></div></div>; };

type TFn = (key: string, fallback: string, params?: Record<string, string | number>) => string;

const getPlanCopy = (t: TFn): Record<PlanTier, { audience: string; description: string; bullets: string[] }> => ({
  STARTER: { audience: t('billing.plan.starter.audience', 'Shaxsiy foydalanish'), description: t('billing.plan.starter.description', 'Kundalik AI yordamchi uchun.'), bullets: [t('billing.plan.starter.feature.chat', 'AI chat'), t('billing.plan.starter.feature.tasks', 'Vazifalar va eslatmalar'), 'Google Calendar'] },
  PRO: { audience: t('billing.plan.pro.audience', 'Faol foydalanuvchi'), description: t('billing.plan.pro.description', 'Ish jarayonlarini AI bilan bog‘lash uchun.'), bullets: [t('billing.plan.pro.feature.starter', 'Starter imkoniyatlari'), 'Google Calendar / Google Drive', t('billing.plan.pro.feature.telegram', 'Telegram integratsiyasi')] },
  BUSINESS: { audience: t('billing.plan.business.audience', 'Biznes egasi'), description: t('billing.plan.business.description', 'Biznes ma’lumotlari bilan ishlaydigan AI.'), bullets: [t('billing.plan.business.feature.pro', 'Pro imkoniyatlari'), 'Bito ERP', t('billing.plan.business.feature.analytics', 'Ombor, savdo va tahlil savollari')] },
  SALES_AI: { audience: t('billing.plan.sales.audience', 'Sotuv uchun'), description: t('billing.plan.sales.description', 'Mijozlar bilan ishlaydigan AI sotuvchi.'), bullets: [t('billing.plan.sales.feature.business', 'Business imkoniyatlari'), t('billing.plan.sales.feature.telegram', 'Telegram AI sotuvchi'), t('billing.plan.sales.feature.bito', 'Bito ERP orqali real narx va qoldiq'), t('billing.plan.sales.feature.comingSoon', 'WhatsApp / Instagram — tez kunda')] },
});

const planIcon = (tier: PlanTier) => tier === 'SALES_AI' ? <Send size={16}/> : tier === 'BUSINESS' ? <BriefcaseBusiness size={16}/> : tier === 'PRO' ? <Bot size={16}/> : <MessageCircleMore size={16}/>;

const Billing = () => {
  const { t, locale } = useI18n();
  const dateLocale = locale === 'ru' ? 'ru-RU' : 'uz-UZ';
  const [plans,setPlans]=useState<Plan[]>([]);
  const [mine,setMine]=useState<SubscriptionInfo|null>(null);
  const [requesting,setRequesting]=useState<PlanTier|null>(null);
  const {showToast}=useToast();
  const planCopy = getPlanCopy(t);

  const load = () => Promise.all([subscriptionApi.plans(),subscriptionApi.mine()]).then(([p,m])=>{setPlans(p);setMine(m);});
  useEffect(()=>{void load().catch(()=>showToast(t('billing.loadError','Tariflarni yuklab bo‘lmadi.'),'error'));},[showToast, t]);

  const choosePlan = async (tier: PlanTier) => {
    if (requesting) return;
    setRequesting(tier);
    try {
      await subscriptionApi.requestPlan(tier);
      await load();
      showToast(t('billing.requestSuccess', 'Tarif so‘rovi adminga yuborildi. Tasdiqlangach obuna 1 oyga faollashadi.'), 'success');
    } catch {
      showToast(t('billing.requestError', 'Tarif so‘rovini yuborib bo‘lmadi.'), 'error');
    } finally {
      setRequesting(null);
    }
  };

  const active = mine?.canUseAi === true;
  const pendingTier = mine?.pendingRequest?.tier;
  return <main className="business-page">
    <header className="business-head"><div><span className="business-head__eyebrow">{t('billing.eyebrow', 'TARIF VA LIMITLAR')}</span><h1>{t('billing.title', 'Qulay AI tariflari')}</h1><p>{t('billing.subtitle', 'Tarifni tanlang. Admin tasdiqlagach obuna 1 oyga faollashadi va AI kreditlari ishlatilgan sari kamayadi.')}</p></div>{mine?.pendingRequest&&<span className="business-badge"><Sparkles size={13}/> {t('billing.pendingApproval', 'Admin tasdig‘i kutilmoqda')} · {planCopy[mine.pendingRequest.tier]?.audience}</span>}</header>

    {mine&&<section className="business-split">
      <article className="business-card"><h2>{active ? t('billing.currentUsage', 'Joriy foydalanish') : t('billing.subscriptionStatus', 'Obuna holati')}</h2>{active ? <><Usage label={t('billing.remainingAiCredits', 'Qolgan AI kreditlari')} locale={dateLocale} showRemaining {...mine.usage.aiCredits}/><Usage label={t('billing.toolActions', 'Agent amallari')} locale={dateLocale} {...mine.usage.toolActions}/><Usage label={t('billing.voiceMinutes', 'Ovozli daqiqalar')} locale={dateLocale} {...mine.usage.voiceMinutes}/></> : <div style={{paddingTop:14,color:'var(--text-secondary)',lineHeight:1.65}}>{t('billing.inactiveUsageHint', 'AI’dan foydalanish uchun quyidagi tariflardan birini tanlang. So‘rov admin tomonidan tasdiqlanmaguncha AI krediti sarflanmaydi.')}</div>}</article>
      <article className="business-card"><span className="business-card__label"><Zap size={16}/> {active ? t('billing.activePlan', 'Faol tarif') : t('billing.aiAccessStatus', 'AI kirish holati')}</span><strong className="business-card__value">{active ? mine.plan.name : t('billing.noActiveSubscription', 'Faol obuna yo‘q')}</strong><p style={{color:'var(--text-secondary)',lineHeight:1.6}}>{active && mine.currentPeriodEnd ? t('billing.activeUntil', 'Obuna {date} gacha faol. Tarif tugasa ma’lumotlaringiz o‘chmaydi.', { date: new Date(mine.currentPeriodEnd).toLocaleDateString(dateLocale) }) : pendingTier ? t('billing.pendingPlanSentence', '{plan} tarifi tanlangan. Admin tasdig‘i kutilmoqda.', { plan: planCopy[pendingTier].audience }) : t('billing.choosePlanHint', 'Tarif tanlang va admin tasdig‘idan keyin Qulay AI’dan foydalanishni boshlang.')}</p></article>
    </section>}

    <section className="business-grid" style={{marginTop:14}}>{plans.map((plan)=>{
      const copy=planCopy[plan.tier];
      const isActive=active&&mine?.effectiveTier===plan.tier;
      const isPending=pendingTier===plan.tier;
      return <article className="business-card" key={plan.tier} style={isActive||isPending?{outline:'2px solid #825bea'}:undefined}>
        <span className="business-card__label">{planIcon(plan.tier)} {plan.name}{plan.tier==='BUSINESS'&&<small style={{marginLeft:8}}>{t('billing.popular', 'OMMABOP')}</small>}</span>
        <strong className="business-card__value">{compact(plan.monthlyPrice,dateLocale)} {plan.currency}<small style={{fontSize:13,fontWeight:600}}> {t('billing.perMonthShort', '/ oy')}</small></strong>
        <p style={{color:'var(--text-secondary)',margin:'8px 0 0'}}>{copy.audience} · {copy.description}</p>
        <div className="business-list" style={{marginTop:14}}>
          <span><Check size={14}/> {t('billing.monthlyAiCredits', 'Oyiga {count} AI kredit', { count: compact(plan.limits.aiCreditsPerMonth,dateLocale) })}</span>
          <span><Check size={14}/> {t('billing.voiceMinutesCount', '{count} ovozli daqiqa', { count: compact(plan.limits.voiceMinutesPerMonth,dateLocale) })}</span>
          {copy.bullets.map((bullet)=><span key={bullet}><Check size={14}/> {bullet}</span>)}
        </div>
        <button className="business-button business-button--ghost" style={{width:'100%',marginTop:18}} disabled={isActive||isPending||Boolean(requesting)} onClick={()=>void choosePlan(plan.tier)}>{isActive?t('billing.activePlan', 'Faol tarif'):isPending?t('billing.pendingApproval', 'Admin tasdig‘i kutilmoqda'):requesting===plan.tier?t('billing.sending', 'Yuborilmoqda...'):t('billing.choosePlan', 'Tarifni tanlash')}</button>
      </article>;
    })}</section>
    <p style={{marginTop:16,color:'var(--text-secondary)',fontSize:12}}>{t('billing.creditDisclaimer', 'Kredit — QULAY AI ichidagi foydalanish limiti. Texnik tokenlar foydalanuvchiga ko‘rsatilmaydi. WhatsApp va Instagram sotuv kanallari hozircha faol emas.')}</p>
  </main>;
};
export default Billing;
