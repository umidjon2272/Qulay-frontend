import React,{useMemo,useState} from 'react'
import {Sparkles,Send,Plus,Search,BarChart3,Boxes,WalletCards,Users,ShoppingCart} from 'lucide-react'
import {useSearchParams} from 'react-router-dom'
import {useApp} from '../state/AppContext'

const contextLabels={dashboard:'Boshqaruv paneli',sales:'Savdo',products:'Mahsulotlar',warehouse:'Ombor',purchases:'Xaridlar',customers:'Mijozlar',suppliers:'Yetkazib beruvchilar',finance:'Moliya',reports:'Hisobotlar',employees:'Xodimlar'}

export default function AiWorkspace(){
 const {state,useCredit,currentEmployee,can}=useApp(); const [params]=useSearchParams();const context=params.get('context')||'dashboard'
 const [q,setQ]=useState(''),[historyQuery,setHistoryQuery]=useState(''),[msgs,setMsgs]=useState(()=>[{role:'ai',text:`Salom, ${currentEmployee?.name||'User'}! ${contextLabels[context]||'ZENIX'} kontekstida savol bering. Men faqat sizga ruxsat berilgan ma’lumotlardan foydalanaman.`}])
 const histories=useMemo(()=>['Bugungi savdo tahlili','Ombor qoldig‘i','Qarzdorlik holati','Supplier xaridlari'].filter(x=>x.toLowerCase().includes(historyQuery.toLowerCase())),[historyQuery])
 const newChat=()=>{setMsgs([{role:'ai',text:`Yangi chat ochildi. ${contextLabels[context]||'ZENIX'} bo‘yicha nimani tahlil qilay?`}]);setQ('')}
 const sendText=text=>{const t=(text??q).trim();if(!t||state.aiCredits<=0)return;setQ('');useCredit(1);setMsgs(m=>[...m,{role:'user',text:t},{role:'ai',text:answer(t,state,can,context)}])}
 return <div className="ai-workspace">
  <aside className="ai-history liquid-card"><button className="primary-glass-btn" onClick={newChat}><Plus/> Yangi chat</button><div className="mini-search"><Search size={16}/><input value={historyQuery} onChange={e=>setHistoryQuery(e.target.value)} placeholder="Chat qidirish..."/></div>{histories.map(x=><button className="ai-history-row" key={x} onClick={()=>sendText(x)}>{x}</button>)}</aside>
  <section className="ai-main liquid-card"><div className="ai-work-head"><div><Sparkles/><span><b>ZENIX AI</b><small>{contextLabels[context]||'Umumiy'} · {state.aiCredits} kredit</small></span></div></div>
    <div className="ai-context-actions">{can('sales')&&<button onClick={()=>sendText('Bugungi savdoni tahlil qil')}><BarChart3/> Savdo</button>}{can('warehouse')&&<button onClick={()=>sendText('Kam qolgan mahsulotlarni ko‘rsat')}><Boxes/> Ombor</button>}{(can('finance')||can('customers'))&&<button onClick={()=>sendText('Qarzdorlik holatini tahlil qil')}><WalletCards/> Qarz</button>}{can('customers')&&<button onClick={()=>sendText('Eng faol mijozlarni ko‘rsat')}><Users/> Mijozlar</button>}{can('purchases')&&<button onClick={()=>sendText('Kutilayotgan xaridlarni ko‘rsat')}><ShoppingCart/> Xaridlar</button>}</div>
    <div className="ai-chat-body">{msgs.map((m,i)=><div key={i} className={`msg ${m.role}`}>{m.text}</div>)}</div>
    <div className="ai-work-input"><textarea value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendText()}}} placeholder={state.aiCredits?'ZENIX AI ga yozing...':'Demo kredit tugadi'}/><button onClick={()=>sendText()} disabled={!q.trim()||state.aiCredits<=0}><Send/></button></div>
  </section>
 </div>
}

function answer(text,state,can,context){
 const q=text.toLowerCase();
 const salesTotal=state.sales.reduce((a,x)=>a+(+x.amount||0),0),customerDebt=state.customerDebts.reduce((a,d)=>a+Math.max(0,(+d.amount||0)-(+d.paid||0)),0),supplierDebt=state.supplierDebts.reduce((a,d)=>a+Math.max(0,(+d.amount||0)-(+d.paid||0)),0)
 if((q.includes('savdo')||context==='sales')&&can('sales'))return `Jami savdo ${salesTotal.toLocaleString('uz-UZ')} so‘m, ${state.sales.length} ta chek. O‘rtacha chek ${Math.round(salesTotal/Math.max(1,state.sales.length)).toLocaleString('uz-UZ')} so‘m.`
 if((q.includes('kam')||q.includes('ombor')||context==='warehouse')&&(can('warehouse')||can('products'))){const rows=state.products.filter(p=>p.stock<=p.minStock);return rows.length?`E’tibor kerak: ${rows.map(p=>`${p.name} — ${p.stock} ${p.unit}`).join(', ')}.`:'Kam qolgan mahsulot yo‘q.'}
 if((q.includes('qarz')||q.includes('overdue'))&&(can('finance')||can('customers')||can('suppliers')))return `Mijozlardan olinadigan qarz ${customerDebt.toLocaleString('uz-UZ')} so‘m. Supplierlarga to‘lanadigan qarz ${supplierDebt.toLocaleString('uz-UZ')} so‘m.`
 if((q.includes('mijoz')||context==='customers')&&can('customers')){const top=[...state.customers].sort((a,b)=>b.total-a.total).slice(0,3);return `Eng faol mijozlar: ${top.map(c=>`${c.name} — ${Number(c.total||0).toLocaleString('uz-UZ')} so‘m`).join('; ')}.`}
 if((q.includes('xarid')||context==='purchases')&&can('purchases')){const pending=state.purchases.filter(p=>p.receiptStatus!=='Qabul qilindi');return pending.length?`${pending.length} ta xarid hali to‘liq qabul qilinmagan: ${pending.map(p=>p.id).join(', ')}.`:'Barcha xaridlar qabul qilingan.'}
 if((q.includes('supplier')||context==='suppliers')&&can('suppliers'))return `${state.suppliers.length} ta supplier mavjud. Supplier majburiyatlari ${supplierDebt.toLocaleString('uz-UZ')} so‘m.`
 return 'Bu savol uchun sizga ruxsat berilgan ZENIX ma’lumotlaridan qisqa tahlil tayyorlay olaman. Savdo, ombor, qarz, mijoz yoki xarid bo‘yicha aniqroq so‘rang.'
}
