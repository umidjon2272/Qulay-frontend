import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowDownLeft, ArrowUpRight, Landmark, Plus, Trash2, WalletCards, X } from 'lucide-react';
import { financeApi, type FinanceCurrency, type FinanceSummary, type FinanceTransaction, type FinanceType, type FinanceAccount, type FinanceCategory } from '../../services/api/financeApi';
import { getApiErrorMessage } from '../../services/api/apiClient';
import { useToast } from '../../hooks/useToast';
import { subscribeToWorkspaceData } from '../../services/workspaceEvents';
import '../BusinessHub.scss';

const money = (value: string | number, currency: FinanceCurrency) => new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: currency === 'UZS' ? 0 : 2 }).format(Number(value || 0)) + (currency === 'UZS' ? ' so‘m' : ' $');
const monthPeriod = () => { const now = new Date(); return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), to: new Date(now.getTime() + 60_000).toISOString() }; };

const Finance = () => {
  const [currency, setCurrency] = useState<FinanceCurrency>('UZS');
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [modal, setModal] = useState<FinanceType | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', amount: '', description: '', categoryId: '', accountId: '' });
  const { showToast } = useToast();

  const load = useCallback(async () => {
    const period = monthPeriod();
    try {
      const [nextSummary, nextTransactions, nextAccounts, nextCategories] = await Promise.all([
        financeApi.summary(period.from, period.to, currency), financeApi.transactions(currency), financeApi.accounts(currency), financeApi.categories(),
      ]);
      setSummary(nextSummary); setTransactions(nextTransactions.items); setAccounts(nextAccounts); setCategories(nextCategories);
    } catch (error) { showToast(getApiErrorMessage(error, 'Moliya ma’lumotlarini yuklab bo‘lmadi.'), 'error'); }
  }, [currency, showToast]);

  useEffect(() => { void load(); return subscribeToWorkspaceData('finance', () => void load()); }, [load]);
  const availableCategories = useMemo(() => categories.filter((item) => !modal || item.type === modal || item.type === 'BOTH'), [categories, modal]);

  const open = (type: FinanceType) => { setForm({ title: '', amount: '', description: '', categoryId: '', accountId: accounts.find((item) => item.isDefault)?.id ?? accounts[0]?.id ?? '' }); setModal(type); };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!modal || !form.title.trim() || Number(form.amount) <= 0) return;
    setSaving(true);
    try {
      await financeApi.createTransaction({ type: modal, title: form.title.trim(), amount: form.amount, description: form.description.trim() || undefined, currency, transactionDate: new Date().toISOString(), categoryId: form.categoryId || undefined, accountId: form.accountId || undefined });
      showToast(modal === 'INCOME' ? 'Daromad saqlandi' : 'Xarajat saqlandi', 'success'); setModal(null); await load();
    } catch (error) { showToast(getApiErrorMessage(error, 'Yozuvni saqlab bo‘lmadi.'), 'error'); } finally { setSaving(false); }
  };
  const remove = async (id: string) => { if (!window.confirm('Bu moliyaviy yozuv o‘chirilsinmi?')) return; await financeApi.deleteTransaction(id); await load(); };

  return <main className="business-page">
    <header className="business-head"><div><span className="business-head__eyebrow">MOLIYA</span><h1>Foyda va zarar</h1><p>Daromad, xarajat va biznes natijangiz bir joyda.</p></div><div style={{display:'flex',gap:8}}><button className="business-button business-button--ghost" onClick={() => open('EXPENSE')}><ArrowDownLeft size={17}/> Xarajat</button><button className="business-button" onClick={() => open('INCOME')}><Plus size={17}/> Daromad</button></div></header>
    <div className="business-toolbar"><div className="business-tabs"><button className={currency==='UZS'?'is-active':''} onClick={()=>setCurrency('UZS')}>UZS</button><button className={currency==='USD'?'is-active':''} onClick={()=>setCurrency('USD')}>USD</button></div><span className="business-badge">Joriy oy</span></div>
    <section className="business-grid">
      <article className="business-card business-card--income"><span className="business-card__label"><ArrowUpRight size={16}/> Daromad</span><strong className="business-card__value">{money(summary?.totalIncome ?? 0,currency)}</strong></article>
      <article className="business-card business-card--expense"><span className="business-card__label"><ArrowDownLeft size={16}/> Xarajat</span><strong className="business-card__value">{money(summary?.totalExpense ?? 0,currency)}</strong></article>
      <article className="business-card business-card--profit"><span className="business-card__label"><Landmark size={16}/> Sof foyda</span><strong className="business-card__value">{money(summary?.netProfit ?? 0,currency)}</strong></article>
    </section>
    <section className="business-split" style={{marginTop:14}}>
      <article className="business-card"><h2>Oxirgi operatsiyalar</h2><div className="business-list" style={{marginTop:14}}>{transactions.length ? transactions.map((item)=><div className="business-row" key={item.id}><span className="business-row__icon">{item.type==='INCOME'?<ArrowUpRight size={18}/>:<ArrowDownLeft size={18}/>}</span><span className="business-row__body"><strong>{item.title}</strong><span>{item.category?.name ?? 'Kategoriyasiz'} · {item.account?.name ?? 'Hisob tanlanmagan'} · {new Date(item.transactionDate).toLocaleDateString('uz-UZ')}</span></span><strong className={`business-row__amount ${item.type==='INCOME'?'is-income':'is-expense'}`}>{item.type==='INCOME'?'+':'−'} {money(item.amount,item.currency)}</strong><button className="business-button business-button--danger" style={{padding:'0 10px',minHeight:34}} onClick={()=>void remove(item.id)} aria-label="O‘chirish"><Trash2 size={14}/></button></div>) : <div className="business-empty">Hozircha moliyaviy yozuv yo‘q.</div>}</div></article>
      <article className="business-card"><h2>Hisoblar</h2><div className="business-list" style={{marginTop:14}}>{accounts.map((account)=><div className="business-row" key={account.id}><span className="business-row__icon"><WalletCards size={17}/></span><span className="business-row__body"><strong>{account.name}</strong><span>{account.type}{account.isDefault?' · Asosiy':''}</span></span><strong className="business-row__amount">{money(account.balance,currency)}</strong></div>)}</div></article>
    </section>
    {modal && <div className="business-modal" onMouseDown={(e)=>{if(e.target===e.currentTarget)setModal(null)}}><section className="business-modal__panel"><header className="business-modal__head"><div><span className="business-head__eyebrow">YANGI YOZUV</span><h2>{modal==='INCOME'?'Daromad':'Xarajat'} qo‘shish</h2></div><button onClick={()=>setModal(null)}><X size={17}/></button></header><form className="business-form" onSubmit={submit}><div className="business-field business-field--wide"><label>Nomi</label><input value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} placeholder={modal==='INCOME'?'Masalan: Mahsulot savdosi':'Masalan: Reklama xarajati'} required/></div><div className="business-field"><label>Miqdor ({currency})</label><input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e)=>setForm({...form,amount:e.target.value})} required/></div><div className="business-field"><label>Hisob</label><select value={form.accountId} onChange={(e)=>setForm({...form,accountId:e.target.value})}><option value="">Avtomatik</option>{accounts.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="business-field"><label>Kategoriya</label><select value={form.categoryId} onChange={(e)=>setForm({...form,categoryId:e.target.value})}><option value="">Kategoriyasiz</option>{availableCategories.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="business-field business-field--wide"><label>Izoh</label><textarea value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/></div><div className="business-form__actions"><button type="button" className="business-button business-button--ghost" onClick={()=>setModal(null)}>Bekor qilish</button><button className="business-button" disabled={saving}>{saving?'Saqlanmoqda...':'Saqlash'}</button></div></form></section></div>}
  </main>;
};
export default Finance;
