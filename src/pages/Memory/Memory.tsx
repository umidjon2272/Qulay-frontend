import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { Brain, CheckCircle2, Download, Pencil, Plus, Search, ShieldQuestion, Trash2, X } from 'lucide-react';
import { memoryApi, type MemoryType, type UserMemory } from '../../services/api/memoryApi';
import { getApiErrorMessage } from '../../services/api/apiClient';
import { useToast } from '../../hooks/useToast';
import { useI18n } from '../../i18n/useI18n';
import '../BusinessHub.scss';

const Memory = () => {
  const { t } = useI18n();
  const labels: Record<MemoryType, string> = {
    PERSONAL: t('memory.typePersonal', 'Shaxsiy'), BUSINESS: t('memory.typeBusiness', 'Biznes'), CONTACT: t('memory.typeContact', 'Kontakt'),
    PREFERENCE: t('memory.typePreference', 'Tanlov'), DECISION: t('memory.typeDecision', 'Qaror'), GOAL: t('memory.typeGoal', 'Maqsad'), CONTEXT: t('memory.typeContext', 'Kontekst'),
  };
  const blank = { type: 'BUSINESS' as MemoryType, key: '', value: '', importance: 7 };
  const [items, setItems] = useState<UserMemory[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const requestRef = useRef<AbortController | null>(null);
  const preferenceBusy = useRef(false);
  const [editing, setEditing] = useState<UserMemory | null>(null);
  const [form, setForm] = useState(blank);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const { showToast } = useToast();
  const load = useCallback(async () => {
    requestRef.current?.abort(); const controller = new AbortController(); requestRef.current = controller; setLoading(true);
    try { const result = await memoryApi.list(search.trim(), page, controller.signal); if (!controller.signal.aborted) { setItems(result.items); setTotal(result.meta.total); if (page > Math.max(1, result.meta.totalPages)) setPage(Math.max(1, result.meta.totalPages)); } }
    catch (error) { if (!controller.signal.aborted) showToast(getApiErrorMessage(error, t('memory.loadError', 'AI xotirasini yuklab bo‘lmadi.')), 'error'); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }, [search, page, showToast, t]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 220); return () => { window.clearTimeout(timer); requestRef.current?.abort(); }; }, [load]);
  useEffect(() => { void memoryApi.getPreference().then((value) => setEnabled(value.enabled)).catch(() => undefined); }, []);
  const toggleMemory = async () => { if (preferenceBusy.current) return; preferenceBusy.current = true; try { const result = await memoryApi.setPreference(!enabled); setEnabled(result.enabled); } catch { showToast(t('memory.toggleError', 'Xotira sozlamasini saqlab bo‘lmadi'),'error'); } finally { preferenceBusy.current = false; } };
  const exportMemory = async () => { try { const data=await memoryApi.exportAll(); const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})); const a=document.createElement('a'); a.href=url; a.download='qulay-ai-xotira.json'; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000); } catch { showToast(t('memory.exportError', 'Xotirani eksport qilib bo‘lmadi.'), 'error'); } };
  const removeAll = async () => { if (!window.confirm(t('memory.confirmDeleteAll', 'DIQQAT: barcha AI xotirasi butunlay o‘chiriladi. Davom etasizmi?'))) return; try { await memoryApi.removeAll(); await load(); showToast(t('memory.allDeleted', 'Barcha xotira o‘chirildi'),'success'); } catch { showToast(t('memory.deleteError', 'Ma’lumotni o‘chirib bo‘lmadi.'), 'error'); } };
  const openCreate = () => { setEditing(null); setForm(blank); setModal(true); };
  const openEdit = (item: UserMemory) => { setEditing(item); setForm({ type:item.type, key:item.key, value:item.value, importance:item.importance }); setModal(true); };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!form.key.trim() || !form.value.trim()) return; setSaving(true);
    try { if (editing) await memoryApi.update(editing.id, { ...form, isVerified:true, confidence:100 }); else await memoryApi.create(form); showToast(editing?t('memory.updated', 'Xotira tuzatildi'):t('memory.created', 'Xotira qo‘shildi'),'success'); setModal(false); await load(); }
    catch (error) { showToast(getApiErrorMessage(error, t('memory.saveError', 'Xotirani saqlab bo‘lmadi.')), 'error'); } finally { setSaving(false); }
  };
  const remove = async (item: UserMemory) => { if (!window.confirm(t('memory.confirmForget', `“${item.key}” unutilsinmi?`))) return; try { await memoryApi.remove(item.id); await load(); showToast(t('memory.forgotten', 'Ma’lumot unutildi'),'success'); } catch (error) { showToast(getApiErrorMessage(error,t('memory.deleteError', 'Ma’lumotni o‘chirib bo‘lmadi.')),'error'); } };
  return <main className="business-page">
    <header className="business-head"><div><span className="business-head__eyebrow">QULAY AI</span><h1>{t('memory.title', 'AI xotirasi')}</h1><p>{t('memory.subtitle', 'AI siz, biznesingiz va muhim odatlar haqida nimalarni bilishini boshqaring.')}</p></div><button className="business-button" onClick={openCreate}><Plus size={17}/> {t('memory.remember', 'Eslab qolish')}</button></header>
    <div className="business-toolbar"><label className="business-search"><Search size={16}/><input value={search} onChange={(event)=>{setSearch(event.target.value);setPage(1);}} placeholder={t('memory.searchPlaceholder', 'Xotiradan qidirish...')}/></label><span className="business-badge">{total} {t('memory.countSuffix', 'ta faol xotira')}</span></div>
    <article className="business-card"><div className="settings-toggle-row"><div><strong>{t('memory.title', 'AI xotirasi')}</strong><span>{t('memory.toggleHint', 'Barcha chatlarda umumiy xotirani yoqish yoki o‘chirish.')}</span></div><button type="button" className={`settings-switch ${enabled?'is-on':''}`} onClick={()=>void toggleMemory()} role="switch" aria-checked={enabled}><i/></button></div><div className="business-form__actions"><button className="business-button business-button--ghost" onClick={()=>void exportMemory()}><Download size={15}/> {t('memory.export', 'Eksport')}</button>{items.length>0&&<button className="business-button business-button--danger" onClick={()=>void removeAll()}><Trash2 size={15}/> {t('memory.deleteAll', 'Barcha xotirani o‘chirish')}</button>}</div></article>
    <article className="business-card"><div className="business-list">{items.length ? items.map((item)=><div className="business-row" key={item.id}><span className="business-row__icon"><Brain size={18}/></span><span className="business-row__body"><strong>{item.key}</strong><span>{item.value}</span><span style={{marginTop:5}}>{labels[item.type]} · {t('memory.importance', 'Muhimlik')} {item.importance * 10}% · {item.isVerified?t('memory.verifiedByYou', 'Siz tasdiqlagansiz'):t('memory.aiSuggestion', 'AI taklifi')}</span></span><span title={item.isVerified?t('memory.verified', 'Tasdiqlangan'):t('memory.needsReview', 'Tekshirish kerak')}>{item.isVerified?<CheckCircle2 size={18} color="#159b67"/>:<ShieldQuestion size={18} color="#d49a42"/>}</span><button className="business-button business-button--ghost" style={{minHeight:34,padding:'0 10px'}} onClick={()=>openEdit(item)} aria-label={t('common.edit', 'Tahrirlash')}><Pencil size={14}/></button><button className="business-button business-button--danger" style={{minHeight:34,padding:'0 10px'}} onClick={()=>void remove(item)} aria-label={t('memory.forget', 'Unutish')}><Trash2 size={14}/></button></div>):<div className="business-empty"><Brain size={28}/><p>{t('memory.empty', 'AI xotirasi hozircha bo‘sh.')}</p></div>}</div></article>
    {total > 50 && <div className="business-toolbar"><button disabled={loading || page === 1} onClick={() => setPage(p => p - 1)}>{t('common.previous', 'Oldingi')}</button><span>{page} / {Math.ceil(total / 50)}</span><button disabled={loading || page * 50 >= total} onClick={() => setPage(p => p + 1)}>{t('common.next', 'Keyingi')}</button></div>}
    {modal&&<div className="business-modal" onMouseDown={(event)=>{if(event.target===event.currentTarget)setModal(false)}}><section className="business-modal__panel"><header className="business-modal__head"><div><span className="business-head__eyebrow">{t('memory.title', 'AI xotirasi').toUpperCase()}</span><h2>{editing?t('memory.editTitle', 'Ma’lumotni tuzatish'):t('memory.newTitle', 'Yangi ma’lumot')}</h2></div><button onClick={()=>setModal(false)}><X size={17}/></button></header><form className="business-form" onSubmit={submit}><div className="business-field"><label>{t('memory.type', 'Turi')}</label><select value={form.type} onChange={(e)=>setForm({...form,type:e.target.value as MemoryType})}>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div><div className="business-field"><label>{t('memory.importance', 'Muhimlik')}: {form.importance * 10}%</label><input type="range" min="1" max="10" value={form.importance} onChange={(e)=>setForm({...form,importance:Number(e.target.value)})}/></div><div className="business-field business-field--wide"><label>{t('memory.aboutWhat', 'Nima haqida?')}</label><input value={form.key} onChange={(e)=>setForm({...form,key:e.target.value})} placeholder={t('memory.aboutWhatPlaceholder', 'Masalan: Asosiy biznes')} required/></div><div className="business-field business-field--wide"><label>{t('memory.whatToRemember', 'AI nimani eslab qolsin?')}</label><textarea value={form.value} onChange={(e)=>setForm({...form,value:e.target.value})} placeholder={t('memory.whatToRememberPlaceholder', 'Aniq va qisqa ma’lumot yozing')} required/></div><div className="business-form__actions"><button type="button" className="business-button business-button--ghost" onClick={()=>setModal(false)}>{t('common.cancel', 'Bekor qilish')}</button><button className="business-button" disabled={saving}>{saving?t('common.saving', 'Saqlanmoqda...'):t('memory.confirmSave', 'Tasdiqlab saqlash')}</button></div></form></section></div>}
  </main>;
};
export default Memory;
