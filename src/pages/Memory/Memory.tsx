import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Brain, CheckCircle2, Download, Pencil, Plus, Search, ShieldQuestion, Trash2, X } from 'lucide-react';
import { memoryApi, type MemoryType, type UserMemory } from '../../services/api/memoryApi';
import { getApiErrorMessage } from '../../services/api/apiClient';
import { useToast } from '../../hooks/useToast';
import '../BusinessHub.scss';

const labels: Record<MemoryType, string> = { PERSONAL:'Shaxsiy', BUSINESS:'Biznes', CONTACT:'Kontakt', PREFERENCE:'Tanlov', DECISION:'Qaror', GOAL:'Maqsad', CONTEXT:'Kontekst' };
const blank = { type: 'BUSINESS' as MemoryType, key: '', value: '', importance: 7 };

const Memory = () => {
  const [items, setItems] = useState<UserMemory[]>([]);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<UserMemory | null>(null);
  const [form, setForm] = useState(blank);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(true);
  const { showToast } = useToast();
  const load = useCallback(async () => { try { setItems((await memoryApi.list(search.trim())).items); } catch (error) { showToast(getApiErrorMessage(error, 'AI xotirasini yuklab bo‘lmadi.'), 'error'); } }, [search, showToast]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 220); return () => window.clearTimeout(timer); }, [load]);
  useEffect(() => { void memoryApi.getPreference().then((value) => setEnabled(value.enabled)).catch(() => undefined); }, []);
  const toggleMemory = async () => { const next=!enabled; setEnabled(next); try { await memoryApi.setPreference(next); } catch { setEnabled(!next); showToast('Xotira sozlamasini saqlab bo‘lmadi','error'); } };
  const exportMemory = async () => { const data=await memoryApi.exportAll(); const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})); const a=document.createElement('a'); a.href=url; a.download='qulay-ai-xotira.json'; a.click(); URL.revokeObjectURL(url); };
  const removeAll = async () => { if (!window.confirm('DIQQAT: barcha AI xotirasi butunlay o‘chiriladi. Davom etasizmi?')) return; await memoryApi.removeAll(); await load(); showToast('Barcha xotira o‘chirildi','success'); };
  const openCreate = () => { setEditing(null); setForm(blank); setModal(true); };
  const openEdit = (item: UserMemory) => { setEditing(item); setForm({ type:item.type, key:item.key, value:item.value, importance:item.importance }); setModal(true); };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!form.key.trim() || !form.value.trim()) return; setSaving(true);
    try { if (editing) await memoryApi.update(editing.id, { ...form, isVerified:true, confidence:100 }); else await memoryApi.create(form); showToast(editing?'Xotira tuzatildi':'Xotira qo‘shildi','success'); setModal(false); await load(); }
    catch (error) { showToast(getApiErrorMessage(error, 'Xotirani saqlab bo‘lmadi.'), 'error'); } finally { setSaving(false); }
  };
  const remove = async (item: UserMemory) => { if (!window.confirm(`“${item.key}” unutilsinmi?`)) return; try { await memoryApi.remove(item.id); await load(); showToast('Ma’lumot unutildi','success'); } catch (error) { showToast(getApiErrorMessage(error,'Ma’lumotni o‘chirib bo‘lmadi.'),'error'); } };
  return <main className="business-page">
    <header className="business-head"><div><span className="business-head__eyebrow">QULAY AI</span><h1>AI xotirasi</h1><p>AI siz, biznesingiz va muhim odatlar haqida nimalarni bilishini boshqaring.</p></div><button className="business-button" onClick={openCreate}><Plus size={17}/> Eslab qolish</button></header>
    <div className="business-toolbar"><label className="business-search"><Search size={16}/><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Xotiradan qidirish..."/></label><span className="business-badge">{items.length} ta faol xotira</span></div>
    <article className="business-card"><div className="settings-toggle-row"><div><strong>AI xotirasi</strong><span>Barcha chatlarda umumiy xotirani yoqish yoki o‘chirish.</span></div><button type="button" className={`settings-switch ${enabled?'is-on':''}`} onClick={()=>void toggleMemory()} role="switch" aria-checked={enabled}><i/></button></div><div className="business-form__actions"><button className="business-button business-button--ghost" onClick={()=>void exportMemory()}><Download size={15}/> Eksport</button>{items.length>0&&<button className="business-button business-button--danger" onClick={()=>void removeAll()}><Trash2 size={15}/> Barcha xotirani o‘chirish</button>}</div></article>
    <article className="business-card"><div className="business-list">{items.length ? items.map((item)=><div className="business-row" key={item.id}><span className="business-row__icon"><Brain size={18}/></span><span className="business-row__body"><strong>{item.key}</strong><span>{item.value}</span><span style={{marginTop:5}}>{labels[item.type]} · Muhimlik {item.importance * 10}% · {item.isVerified?'Siz tasdiqlagansiz':'AI taklifi'}</span></span><span title={item.isVerified?'Tasdiqlangan':'Tekshirish kerak'}>{item.isVerified?<CheckCircle2 size={18} color="#159b67"/>:<ShieldQuestion size={18} color="#d49a42"/>}</span><button className="business-button business-button--ghost" style={{minHeight:34,padding:'0 10px'}} onClick={()=>openEdit(item)} aria-label="Tahrirlash"><Pencil size={14}/></button><button className="business-button business-button--danger" style={{minHeight:34,padding:'0 10px'}} onClick={()=>void remove(item)} aria-label="Unutish"><Trash2 size={14}/></button></div>):<div className="business-empty"><Brain size={28}/><p>AI xotirasi hozircha bo‘sh.</p></div>}</div></article>
    {modal&&<div className="business-modal" onMouseDown={(event)=>{if(event.target===event.currentTarget)setModal(false)}}><section className="business-modal__panel"><header className="business-modal__head"><div><span className="business-head__eyebrow">AI XOTIRASI</span><h2>{editing?'Ma’lumotni tuzatish':'Yangi ma’lumot'}</h2></div><button onClick={()=>setModal(false)}><X size={17}/></button></header><form className="business-form" onSubmit={submit}><div className="business-field"><label>Turi</label><select value={form.type} onChange={(e)=>setForm({...form,type:e.target.value as MemoryType})}>{Object.entries(labels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></div><div className="business-field"><label>Muhimlik: {form.importance * 10}%</label><input type="range" min="1" max="10" value={form.importance} onChange={(e)=>setForm({...form,importance:Number(e.target.value)})}/></div><div className="business-field business-field--wide"><label>Nima haqida?</label><input value={form.key} onChange={(e)=>setForm({...form,key:e.target.value})} placeholder="Masalan: Asosiy biznes" required/></div><div className="business-field business-field--wide"><label>AI nimani eslab qolsin?</label><textarea value={form.value} onChange={(e)=>setForm({...form,value:e.target.value})} placeholder="Aniq va qisqa ma’lumot yozing" required/></div><div className="business-form__actions"><button type="button" className="business-button business-button--ghost" onClick={()=>setModal(false)}>Bekor qilish</button><button className="business-button" disabled={saving}>{saving?'Saqlanmoqda...':'Tasdiqlab saqlash'}</button></div></form></section></div>}
  </main>;
};
export default Memory;
