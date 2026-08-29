import { useEffect, useState } from 'react';
import { Bot, Check, Database, FileText, Sparkles, Zap } from 'lucide-react';
import { subscriptionApi, type Plan, type SubscriptionInfo } from '../../services/api/subscriptionApi';
import { getApiErrorMessage } from '../../services/api/apiClient';
import { useToast } from '../../hooks/useToast';
import '../BusinessHub.scss';

const compact = (value:number) => new Intl.NumberFormat('uz-UZ').format(value);
const Usage = ({label,used,limit}:{label:string;used:number;limit:number}) => <div style={{marginTop:14}}><div style={{display:'flex',justifyContent:'space-between',fontSize:12,color:'#8d8798'}}><span>{label}</span><strong>{compact(Math.round(used))} / {compact(limit)}</strong></div><div style={{height:7,marginTop:7,borderRadius:99,background:'rgba(116,82,212,.12)',overflow:'hidden'}}><span style={{display:'block',height:'100%',width:`${Math.min(100,used/Math.max(1,limit)*100)}%`,background:'linear-gradient(90deg,#825bea,#b250de)',borderRadius:99}}/></div></div>;

const Billing = () => {
  const [plans,setPlans]=useState<Plan[]>([]); const [mine,setMine]=useState<SubscriptionInfo|null>(null); const {showToast}=useToast();
  useEffect(()=>{void Promise.all([subscriptionApi.plans(),subscriptionApi.mine()]).then(([p,m])=>{setPlans(p);setMine(m)}).catch((error)=>showToast(getApiErrorMessage(error,'Tariflarni yuklab bo‘lmadi.'),'error'));},[showToast]);
  return <main className="business-page"><header className="business-head"><div><span className="business-head__eyebrow">TARIF VA LIMITLAR</span><h1>Qulay AI tariflari</h1><p>AI xabarlar, agent amallari, fayllar va uzoq muddatli xotira limiti.</p></div>{mine?.trialActive&&<span className="business-badge"><Sparkles size={13}/> PRO sinov · {mine.trialEndsAt?new Date(mine.trialEndsAt).toLocaleDateString('uz-UZ'):''} gacha</span>}</header>
  {mine&&<section className="business-split"><article className="business-card"><h2>Joriy foydalanish</h2><Usage label="AI xabarlari" {...mine.usage.aiMessages}/><Usage label="Agent amallari" {...mine.usage.toolActions}/><Usage label="Fayllar" {...mine.usage.files}/><Usage label="Xotira" {...mine.usage.memories}/><Usage label="Saqlash (MB)" {...mine.usage.storageMb}/></article><article className="business-card"><span className="business-card__label"><Zap size={16}/> Faol imkoniyat</span><strong className="business-card__value">{mine.effectiveTier}</strong><p style={{color:'#8d8798',lineHeight:1.6}}>AI har qanday yozish amalidan oldin sizdan tasdiq so‘raydi. Tarif tugasa ma’lumotlaringiz o‘chmaydi.</p></article></section>}
  <section className="business-grid" style={{marginTop:14}}>{plans.map((plan)=><article className="business-card" key={plan.tier} style={mine?.effectiveTier===plan.tier?{outline:'2px solid #825bea'}:undefined}><span className="business-card__label">{plan.tier==='BUSINESS'?<Database size={16}/>:plan.tier==='PRO'?<Bot size={16}/>:<FileText size={16}/>} {plan.name}</span><strong className="business-card__value">{plan.monthlyPriceUzs?`${compact(plan.monthlyPriceUzs)} so‘m`:'Bepul'}</strong><div className="business-list" style={{marginTop:14}}><span><Check size={14}/> Oyiga {compact(plan.limits.aiMessagesPerMonth)} AI xabar</span><span><Check size={14}/> {compact(plan.limits.toolActionsPerMonth)} agent amali</span><span><Check size={14}/> {compact(plan.limits.files)} fayl · {compact(plan.limits.storageMb)} MB</span><span><Check size={14}/> {compact(plan.limits.memories)} xotira</span></div><button className="business-button business-button--ghost" style={{width:'100%',marginTop:18}} disabled>Payme / Click tez kunda</button></article>)}</section>
  </main>;
};
export default Billing;
