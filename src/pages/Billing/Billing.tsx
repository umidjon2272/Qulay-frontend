import { useEffect, useState } from 'react';
import { Bot, BriefcaseBusiness, Check, MessageCircleMore, Send, Sparkles, Zap } from 'lucide-react';
import { subscriptionApi, type Plan, type PlanTier, type SubscriptionInfo } from '../../services/api/subscriptionApi';
import { getApiErrorMessage } from '../../services/api/apiClient';
import { useToast } from '../../hooks/useToast';
import { useI18n } from '../../i18n/useI18n';
import '../BusinessHub.scss';

const compact = (value: number, locale: string) => new Intl.NumberFormat(locale).format(value);
const Usage = ({label,used,limit,remaining,locale,showRemaining=false}:{label:string;used:number;limit:number;remaining?:number;locale:string;showRemaining?:boolean}) => { const shown=showRemaining ? (remaining ?? Math.max(0,limit-used)) : used; const ratio=showRemaining ? shown/Math.max(1,limit) : used/Math.max(1,limit); return <div style={{marginTop:14}}><div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#8d8798'}}><span>{label}</span><strong>{compact(Math.round(shown),locale)} / {compact(limit,locale)}</strong></div><div style={{height:7,marginTop:7,borderRadius:99,background:'rgba(116,82,212,.12)',overflow:'hidden'}}><span style={{display:'block',height:'100%',width:`${Math.min(100,Math.max(0,ratio*100))}%`,background:'linear-gradient(90deg,#825bea,#b250de)',borderRadius:99}}/></div></div>; };

const planCopy: Record<PlanTier, { audience: string; description: string; bullets: string[] }> = {
  STARTER: { audience: 'Shaxsiy foydalanish', description: 'Kundalik AI yordamchi uchun.', bullets: ['AI chat', 'Vazifalar va eslatmalar', 'Calendar'] },
  PRO: { audience: 'Faol foydalanuvchi', description: 'Ish jarayonlarini AI bilan bog‘lash uchun.', bullets: ['Start imkoniyatlari', 'Google Calendar / Drive', 'Telegram integratsiyasi'] },
  BUSINESS: { audience: 'Biznes egasi', description: 'Biznes ma’lumotlari bilan ishlaydigan AI.', bullets: ['Pro imkoniyatlari', 'Bito ERP', 'Ombor, savdo va analytics savollari'] },
  SALES_AI: { audience: 'Sotuv uchun', description: 'Mijozlar bilan ishlaydigan AI sotuvchi.', bullets: ['Business imkoniyatlari', 'Telegram AI sotuvchi', 'Bito orqali real narx va qoldiq', 'WhatsApp / Instagram — tez kunda'] },
};

const planIcon = (tier: PlanTier) => tier === 'SALES_AI' ? <Send size={16}/> : tier === 'BUSINESS' ? <BriefcaseBusiness size={16}/> : tier === 'PRO' ? <Bot size={16}/> : <MessageCircleMore size={16}/>;

const Billing = () => {
  const { t, locale } = useI18n();
  const dateLocale = locale === 'ru' ? 'ru-RU' : 'uz-UZ';
  const [plans,setPlans]=useState<Plan[]>([]);
  const [mine,setMine]=useState<SubscriptionInfo|null>(null);
  const [requesting,setRequesting]=useState<PlanTier|null>(null);
  const {showToast}=useToast();

  const load = () => Promise.all([subscriptionApi.plans(),subscriptionApi.mine()]).then(([p,m])=>{setPlans(p);setMine(m);});
  useEffect(()=>{void load().catch((error)=>showToast(getApiErrorMessage(error,t('billing.loadError','Tariflarni yuklab bo‘lmadi.')),'error'));},[showToast, t]);

  const choosePlan = async (tier: PlanTier) => {
    if (requesting) return;
    setRequesting(tier);
    try {
      await subscriptionApi.requestPlan(tier);
      await load();
      showToast('Tarif so‘rovi adminga yuborildi. Tasdiqlangach obuna 1 oyga faollashadi.', 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error, 'Tarif so‘rovini yuborib bo‘lmadi.'), 'error');
    } finally {
      setRequesting(null);
    }
  };

  const active = mine?.canUseAi === true;
  const pendingTier = mine?.pendingRequest?.tier;
  return <main className="business-page">
    <header className="business-head"><div><span className="business-head__eyebrow">TARIF VA LIMITLAR</span><h1>Qulay AI tariflari</h1><p>Tarifni tanlang. Admin tasdiqlagach obuna 1 oyga faollashadi va AI kreditlari ishlatilgan sari kamayadi.</p></div>{mine?.pendingRequest&&<span className="business-badge"><Sparkles size={13}/> Admin tasdig‘i kutilmoqda · {planCopy[mine.pendingRequest.tier]?.audience}</span>}</header>

    {mine&&<section className="business-split">
      <article className="business-card"><h2>{active ? 'Joriy foydalanish' : 'Obuna holati'}</h2>{active ? <><Usage label="Qolgan AI kreditlari" locale={dateLocale} showRemaining {...mine.usage.aiCredits}/><Usage label="Agent amallari" locale={dateLocale} {...mine.usage.toolActions}/><Usage label="Ovozli daqiqalar" locale={dateLocale} {...mine.usage.voiceMinutes}/></> : <div style={{paddingTop:14,color:'var(--text-secondary)',lineHeight:1.65}}>AI’dan foydalanish uchun quyidagi tariflardan birini tanlang. So‘rov admin tomonidan tasdiqlanmaguncha AI krediti sarflanmaydi.</div>}</article>
      <article className="business-card"><span className="business-card__label"><Zap size={16}/> {active ? 'Faol tarif' : 'AI kirish holati'}</span><strong className="business-card__value">{active ? mine.plan.name : 'Faol obuna yo‘q'}</strong><p style={{color:'var(--text-secondary)',lineHeight:1.6}}>{active && mine.currentPeriodEnd ? `Obuna ${new Date(mine.currentPeriodEnd).toLocaleDateString(dateLocale)} gacha faol. Tarif tugasa ma’lumotlaringiz o‘chmaydi.` : pendingTier ? `${planCopy[pendingTier].audience} tarifi tanlangan. Admin tasdig‘i kutilmoqda.` : 'Tarif tanlang va admin tasdig‘idan keyin Qulay AI’dan foydalanishni boshlang.'}</p></article>
    </section>}

    <section className="business-grid" style={{marginTop:14}}>{plans.map((plan)=>{
      const copy=planCopy[plan.tier];
      const isActive=active&&mine?.effectiveTier===plan.tier;
      const isPending=pendingTier===plan.tier;
      return <article className="business-card" key={plan.tier} style={isActive||isPending?{outline:'2px solid #825bea'}:undefined}>
        <span className="business-card__label">{planIcon(plan.tier)} {plan.name}{plan.tier==='BUSINESS'&&<small style={{marginLeft:8}}>OMMABOP</small>}</span>
        <strong className="business-card__value">{compact(plan.monthlyPrice,dateLocale)} {plan.currency}<small style={{fontSize:13,fontWeight:600}}> / oy</small></strong>
        <p style={{color:'var(--text-secondary)',margin:'8px 0 0'}}>{copy.audience} · {copy.description}</p>
        <div className="business-list" style={{marginTop:14}}>
          <span><Check size={14}/> Oyiga {compact(plan.limits.aiCreditsPerMonth,dateLocale)} AI kredit</span>
          <span><Check size={14}/> {compact(plan.limits.voiceMinutesPerMonth,dateLocale)} ovozli daqiqa</span>
          {copy.bullets.map((bullet)=><span key={bullet}><Check size={14}/> {bullet}</span>)}
        </div>
        <button className="business-button business-button--ghost" style={{width:'100%',marginTop:18}} disabled={isActive||isPending||Boolean(requesting)} onClick={()=>void choosePlan(plan.tier)}>{isActive?'Faol tarif':isPending?'Admin tasdig‘i kutilmoqda':requesting===plan.tier?'Yuborilmoqda...':'Tarifni tanlash'}</button>
      </article>;
    })}</section>
    <p style={{marginTop:16,color:'var(--text-secondary)',fontSize:12}}>Kredit — QULAY AI ichidagi foydalanish limiti. Texnik tokenlar userga ko‘rsatilmaydi. WhatsApp va Instagram sotuv kanallari hozircha faol emas.</p>
  </main>;
};
export default Billing;
