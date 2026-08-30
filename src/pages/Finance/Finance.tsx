import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowDownLeft, ArrowUpRight, Landmark, Plus, Target, Trash2, TrendingUp, WalletCards, X } from 'lucide-react';
import { financeApi, type FinanceBudget, type FinanceBudgetStatus, type FinanceCurrency, type FinanceForecast, type FinanceSummary, type FinanceTransaction, type FinanceType, type FinanceAccount, type FinanceCategory } from '../../services/api/financeApi';
import { getApiErrorMessage } from '../../services/api/apiClient';
import { useToast } from '../../hooks/useToast';
import { subscribeToWorkspaceData } from '../../services/workspaceEvents';
import { useI18n } from '../../i18n/useI18n';
import '../BusinessHub.scss';

const money = (value: string | number, currency: FinanceCurrency, dateLocale: string) => new Intl.NumberFormat(dateLocale, { maximumFractionDigits: currency === 'UZS' ? 0 : 2 }).format(Number(value || 0)) + (currency === 'UZS' ? ' so‘m' : ' $');
const monthPeriod = () => { const now = new Date(); return { from: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(), to: new Date(now.getTime() + 60_000).toISOString() }; };

const Finance = () => {
  const { t, locale } = useI18n();
  const dateLocale = locale === 'ru' ? 'ru-RU' : 'uz-UZ';
  const fmt = useCallback((value: string | number, currency: FinanceCurrency) => money(value, currency, dateLocale), [dateLocale]);
  const [view, setView] = useState<'overview' | 'budgets'>('overview');
  const [currency, setCurrency] = useState<FinanceCurrency>('UZS');
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [accounts, setAccounts] = useState<FinanceAccount[]>([]);
  const [categories, setCategories] = useState<FinanceCategory[]>([]);
  const [modal, setModal] = useState<FinanceType | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', amount: '', description: '', categoryId: '', accountId: '' });
  const [budgets, setBudgets] = useState<FinanceBudget[]>([]);
  const [budgetStatus, setBudgetStatus] = useState<FinanceBudgetStatus | null>(null);
  const [forecast, setForecast] = useState<FinanceForecast | null>(null);
  const [budgetModal, setBudgetModal] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ categoryId: '', amount: '' });
  const { showToast } = useToast();

  const load = useCallback(async () => {
    const period = monthPeriod();
    try {
      const [nextSummary, nextTransactions, nextAccounts, nextCategories] = await Promise.all([
        financeApi.summary(period.from, period.to, currency), financeApi.transactions(currency), financeApi.accounts(currency), financeApi.categories(),
      ]);
      setSummary(nextSummary); setTransactions(nextTransactions.items); setAccounts(nextAccounts); setCategories(nextCategories);
    } catch (error) { showToast(getApiErrorMessage(error, t('finance.loadError', 'Moliya ma’lumotlarini yuklab bo‘lmadi.')), 'error'); }
  }, [currency, showToast, t]);

  const loadBudgets = useCallback(async () => {
    try {
      const [nextBudgets, status, nextForecast] = await Promise.all([
        financeApi.budgets(), financeApi.budgetStatus(currency), financeApi.forecast(currency),
      ]);
      setBudgets(nextBudgets); setBudgetStatus(status); setForecast(nextForecast);
    } catch (error) { showToast(getApiErrorMessage(error, t('finance.budgetLoadError', 'Budjet ma’lumotlarini yuklab bo‘lmadi.')), 'error'); }
  }, [currency, showToast, t]);

  useEffect(() => { void load(); return subscribeToWorkspaceData('finance', () => void load()); }, [load]);
  useEffect(() => { if (view === 'budgets') void loadBudgets(); }, [view, loadBudgets]);
  const availableCategories = useMemo(() => categories.filter((item) => !modal || item.type === modal || item.type === 'BOTH'), [categories, modal]);

  const submitBudget = async (event: FormEvent) => {
    event.preventDefault();
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    if (Number(budgetForm.amount) <= 0) return;
    try {
      await financeApi.createBudget({ categoryId: budgetForm.categoryId || undefined, currency, monthKey, amount: budgetForm.amount });
      showToast(t('finance.budgetSaved', 'Budjet saqlandi'), 'success'); setBudgetModal(false); setBudgetForm({ categoryId: '', amount: '' }); await loadBudgets();
    } catch (error) { showToast(getApiErrorMessage(error, t('finance.budgetSaveError', 'Budjetni saqlab bo‘lmadi.')), 'error'); }
  };
  const removeBudget = async (id: string) => {
    if (!window.confirm(t('finance.confirmDeleteBudget', 'Bu budjet o‘chirilsinmi?'))) return;
    try { await financeApi.deleteBudget(id); await loadBudgets(); showToast(t('finance.budgetDeleted', 'Budjet o‘chirildi'), 'success'); }
    catch (error) { showToast(getApiErrorMessage(error, t('finance.budgetDeleteError', 'Budjetni o‘chirib bo‘lmadi.')), 'error'); }
  };

  const open = (type: FinanceType) => { setForm({ title: '', amount: '', description: '', categoryId: '', accountId: accounts.find((item) => item.isDefault)?.id ?? accounts[0]?.id ?? '' }); setModal(type); };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!modal || !form.title.trim() || Number(form.amount) <= 0) return;
    setSaving(true);
    try {
      await financeApi.createTransaction({ type: modal, title: form.title.trim(), amount: form.amount, description: form.description.trim() || undefined, currency, transactionDate: new Date().toISOString(), categoryId: form.categoryId || undefined, accountId: form.accountId || undefined });
      showToast(modal === 'INCOME' ? t('finance.incomeSaved', 'Daromad saqlandi') : t('finance.expenseSaved', 'Xarajat saqlandi'), 'success'); setModal(null); await load();
    } catch (error) { showToast(getApiErrorMessage(error, t('finance.transactionSaveError', 'Yozuvni saqlab bo‘lmadi.')), 'error'); } finally { setSaving(false); }
  };
  const remove = async (id: string) => { if (!window.confirm(t('finance.confirmDeleteTransaction', 'Bu moliyaviy yozuv o‘chirilsinmi?'))) return; await financeApi.deleteTransaction(id); await load(); };

  return <main className="business-page">
    <header className="business-head"><div><span className="business-head__eyebrow">{t('finance.eyebrow', 'MOLIYA')}</span><h1>{t('finance.title', 'Foyda va zarar')}</h1><p>{t('finance.subtitle', 'Daromad, xarajat va biznes natijangiz bir joyda.')}</p></div><div style={{display:'flex',gap:8}}><button className="business-button business-button--ghost" onClick={() => open('EXPENSE')}><ArrowDownLeft size={17}/> {t('finance.expense', 'Xarajat')}</button><button className="business-button" onClick={() => open('INCOME')}><Plus size={17}/> {t('finance.income', 'Daromad')}</button></div></header>
    <div className="business-toolbar">
      <div className="business-tabs"><button className={currency==='UZS'?'is-active':''} onClick={()=>setCurrency('UZS')}>UZS</button><button className={currency==='USD'?'is-active':''} onClick={()=>setCurrency('USD')}>USD</button></div>
      <div className="business-tabs"><button className={view==='overview'?'is-active':''} onClick={()=>setView('overview')}>{t('finance.overview', 'Umumiy')}</button><button className={view==='budgets'?'is-active':''} onClick={()=>setView('budgets')}>{t('finance.budgets', 'Budjetlar')}</button></div>
    </div>

    {view === 'overview' ? <>
      <section className="business-grid">
        <article className="business-card business-card--income"><span className="business-card__label"><ArrowUpRight size={16}/> {t('finance.income', 'Daromad')}</span><strong className="business-card__value">{fmt(summary?.totalIncome ?? 0,currency)}</strong></article>
        <article className="business-card business-card--expense"><span className="business-card__label"><ArrowDownLeft size={16}/> {t('finance.expense', 'Xarajat')}</span><strong className="business-card__value">{fmt(summary?.totalExpense ?? 0,currency)}</strong></article>
        <article className="business-card business-card--profit"><span className="business-card__label"><Landmark size={16}/> {t('finance.netProfit', 'Sof foyda')}</span><strong className="business-card__value">{fmt(summary?.netProfit ?? 0,currency)}</strong></article>
      </section>
      <section className="business-split" style={{marginTop:14}}>
        <article className="business-card"><h2>{t('finance.recentTransactions', 'Oxirgi operatsiyalar')}</h2><div className="business-list" style={{marginTop:14}}>{transactions.length ? transactions.map((item)=><div className="business-row" key={item.id}><span className="business-row__icon">{item.type==='INCOME'?<ArrowUpRight size={18}/>:<ArrowDownLeft size={18}/>}</span><span className="business-row__body"><strong>{item.title}</strong><span>{item.category?.name ?? t('finance.noCategory', 'Kategoriyasiz')} · {item.account?.name ?? t('finance.noAccount', 'Hisob tanlanmagan')} · {new Date(item.transactionDate).toLocaleDateString(dateLocale)}</span></span><strong className={`business-row__amount ${item.type==='INCOME'?'is-income':'is-expense'}`}>{item.type==='INCOME'?'+':'−'} {fmt(item.amount,item.currency)}</strong><button className="business-button business-button--danger" style={{padding:'0 10px',minHeight:34}} onClick={()=>void remove(item.id)} aria-label={t('common.delete', 'O‘chirish')}><Trash2 size={14}/></button></div>) : <div className="business-empty">{t('finance.noTransactions', 'Hozircha moliyaviy yozuv yo‘q.')}</div>}</div></article>
        <article className="business-card"><h2>{t('finance.accounts', 'Hisoblar')}</h2><div className="business-list" style={{marginTop:14}}>{accounts.map((account)=><div className="business-row" key={account.id}><span className="business-row__icon"><WalletCards size={17}/></span><span className="business-row__body"><strong>{account.name}</strong><span>{account.type}{account.isDefault?` · ${t('finance.defaultAccount', 'Asosiy')}`:''}</span></span><strong className="business-row__amount">{fmt(account.balance,currency)}</strong></div>)}</div></article>
      </section>
    </> : <>
      <section className="business-grid" style={{gridTemplateColumns:'1fr'}}>
        <article className="business-card">
          <span className="business-card__label"><TrendingUp size={16}/> {t('finance.forecastLabel', 'Oy oxirigacha taxminiy balans')} <span className="business-badge">{t('finance.forecastBadge', 'bu taxmin')}</span></span>
          {forecast?.insufficientData ? (
            <p style={{marginTop:10,color:'#96909d'}}>{t('finance.insufficientData', 'Ma’lumot yetarli emas — taxmin qilish uchun shu oyda kamida 3 kunlik moliyaviy yozuv kerak.')}</p>
          ) : forecast ? (
            <>
              <strong className="business-card__value">{fmt(forecast.forecastEndOfMonth ?? 0, currency)}</strong>
              <p style={{marginTop:6,color:'#96909d',fontSize:12}}>{forecast.monthKey} · {currency} · {t('finance.dailyAverage', 'kunlik o‘rtacha')} {fmt(forecast.dailyAverageNet ?? 0, currency)}</p>
            </>
          ) : null}
        </article>
      </section>
      <section className="business-card" style={{marginTop:14}}>
        <div className="business-toolbar" style={{margin:0}}>
          <h2>{t('finance.budgets', 'Budjetlar')} ({budgetStatus?.monthKey ?? ''})</h2>
          <button className="business-button" onClick={()=>setBudgetModal(true)}><Plus size={16}/> {t('finance.addBudget', 'Budjet qo‘shish')}</button>
        </div>
        <div className="business-list" style={{marginTop:14}}>
          {budgets.filter((b)=>b.currency===currency).length ? budgets.filter((b)=>b.currency===currency).map((budget) => {
            const status = budgetStatus?.items.find((item) => item.id === budget.id);
            return (
              <div className="business-row" key={budget.id}>
                <span className="business-row__icon"><Target size={17}/></span>
                <span className="business-row__body">
                  <strong>{budget.category?.name ?? t('finance.overallBudget', 'Umumiy budjet')}</strong>
                  <span>{status ? `${fmt(status.spent, currency)} / ${fmt(status.budgeted, currency)} (${status.percentUsed}%)` : `${fmt(budget.amount, currency)}`}{status?.isOverBudget ? ` · ${t('finance.overBudget', 'Oshib ketdi')}` : status?.isNearLimit ? ` · ${t('finance.nearLimit', 'Chegaraga yaqin')}` : ''}</span>
                </span>
                <button className="business-button business-button--danger" style={{padding:'0 10px',minHeight:34}} onClick={()=>void removeBudget(budget.id)} aria-label={t('common.delete', 'O‘chirish')}><Trash2 size={14}/></button>
              </div>
            );
          }) : <div className="business-empty">{t('finance.noBudgets', 'Bu oy uchun budjet belgilanmagan.')}</div>}
        </div>
      </section>
    </>}

    {modal && <div className="business-modal" onMouseDown={(e)=>{if(e.target===e.currentTarget)setModal(null)}}><section className="business-modal__panel"><header className="business-modal__head"><div><span className="business-head__eyebrow">{t('finance.newEntryEyebrow', 'YANGI YOZUV')}</span><h2>{modal==='INCOME'?t('finance.income', 'Daromad'):t('finance.expense', 'Xarajat')} {t('finance.addSuffix', 'qo‘shish')}</h2></div><button onClick={()=>setModal(null)}><X size={17}/></button></header><form className="business-form" onSubmit={submit}><div className="business-field business-field--wide"><label>{t('finance.name', 'Nomi')}</label><input value={form.title} onChange={(e)=>setForm({...form,title:e.target.value})} placeholder={modal==='INCOME'?t('finance.incomePlaceholder', 'Masalan: Mahsulot savdosi'):t('finance.expensePlaceholder', 'Masalan: Reklama xarajati')} required/></div><div className="business-field"><label>{t('finance.amount', 'Miqdor')} ({currency})</label><input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e)=>setForm({...form,amount:e.target.value})} required/></div><div className="business-field"><label>{t('finance.account', 'Hisob')}</label><select value={form.accountId} onChange={(e)=>setForm({...form,accountId:e.target.value})}><option value="">{t('finance.automatic', 'Avtomatik')}</option>{accounts.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="business-field"><label>{t('finance.category', 'Kategoriya')}</label><select value={form.categoryId} onChange={(e)=>setForm({...form,categoryId:e.target.value})}><option value="">{t('finance.noCategory', 'Kategoriyasiz')}</option>{availableCategories.map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div><div className="business-field business-field--wide"><label>{t('finance.description', 'Izoh')}</label><textarea value={form.description} onChange={(e)=>setForm({...form,description:e.target.value})}/></div><div className="business-form__actions"><button type="button" className="business-button business-button--ghost" onClick={()=>setModal(null)}>{t('common.cancel', 'Bekor qilish')}</button><button className="business-button" disabled={saving}>{saving?t('common.saving', 'Saqlanmoqda...'):t('common.save', 'Saqlash')}</button></div></form></section></div>}

    {budgetModal && <div className="business-modal" onMouseDown={(e)=>{if(e.target===e.currentTarget)setBudgetModal(false)}}><section className="business-modal__panel"><header className="business-modal__head"><div><span className="business-head__eyebrow">{t('finance.newBudgetEyebrow', 'YANGI BUDJET')}</span><h2>{t('finance.addBudget', 'Budjet qo‘shish')}</h2></div><button onClick={()=>setBudgetModal(false)}><X size={17}/></button></header><form className="business-form" onSubmit={submitBudget}>
      <div className="business-field"><label>{t('finance.category', 'Kategoriya')}</label><select value={budgetForm.categoryId} onChange={(e)=>setBudgetForm({...budgetForm,categoryId:e.target.value})}><option value="">{t('finance.overallBudgetOption', 'Umumiy (barcha xarajatlar)')}</option>{categories.filter((c)=>c.type!=='INCOME').map((item)=><option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
      <div className="business-field"><label>{t('finance.amount', 'Miqdor')} ({currency})</label><input type="number" min="0.01" step="0.01" value={budgetForm.amount} onChange={(e)=>setBudgetForm({...budgetForm,amount:e.target.value})} required/></div>
      <div className="business-form__actions"><button type="button" className="business-button business-button--ghost" onClick={()=>setBudgetModal(false)}>{t('common.cancel', 'Bekor qilish')}</button><button className="business-button">{t('common.save', 'Saqlash')}</button></div>
    </form></section></div>}
  </main>;
};
export default Finance;
