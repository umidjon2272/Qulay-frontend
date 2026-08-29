import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { Building2, CalendarClock, Mail, Phone, Plus, Search, Trash2, UserRound, X } from 'lucide-react';
import { contactsApi, type Contact } from '../../services/api/contactsApi';
import { getApiErrorMessage } from '../../services/api/apiClient';
import { useToast } from '../../hooks/useToast';
import '../BusinessHub.scss';

const blank = { firstName: '', lastName: '', phone: '', email: '', telegramUsername: '', company: '', position: '', relationship: '', birthday: '', nextFollowUpAt: '', notes: '', tags: '' };

const Contacts = () => {
  const [items, setItems] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Contact | null>(null);
  const [form, setForm] = useState(blank);
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const { showToast } = useToast();

  const load = useCallback(async () => {
    try { setItems((await contactsApi.list(search.trim())).items); }
    catch (error) { showToast(getApiErrorMessage(error, 'Kontaktlarni yuklab bo‘lmadi.'), 'error'); }
  }, [search, showToast]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 220); return () => window.clearTimeout(timer); }, [load]);

  const openCreate = () => { setSelected(null); setForm(blank); setModal(true); };
  const openEdit = (contact: Contact) => {
    setSelected(contact);
    setForm({
      firstName: contact.firstName, lastName: contact.lastName ?? '', phone: contact.phone ?? '', email: contact.email ?? '',
      telegramUsername: contact.telegramUsername ?? '', company: contact.company ?? '', position: contact.position ?? '',
      relationship: contact.relationship ?? '', birthday: contact.birthday?.slice(0, 10) ?? '',
      nextFollowUpAt: contact.nextFollowUpAt ? new Date(contact.nextFollowUpAt).toISOString().slice(0, 16) : '',
      notes: contact.notes ?? '', tags: contact.tags.join(', '),
    });
    setModal(true);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault(); if (!form.firstName.trim()) return;
    setSaving(true);
    const payload = {
      firstName: form.firstName.trim(), lastName: form.lastName.trim() || undefined, phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined, telegramUsername: form.telegramUsername.trim().replace(/^@/, '') || undefined,
      company: form.company.trim() || undefined, position: form.position.trim() || undefined,
      relationship: form.relationship.trim() || undefined, birthday: form.birthday || undefined,
      nextFollowUpAt: form.nextFollowUpAt ? new Date(form.nextFollowUpAt).toISOString() : undefined,
      notes: form.notes.trim() || undefined, tags: form.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
    };
    try {
      if (selected) await contactsApi.update(selected.id, payload); else await contactsApi.create(payload);
      showToast(selected ? 'Kontakt yangilandi' : 'Kontakt saqlandi', 'success'); setModal(false); await load();
    } catch (error) { showToast(getApiErrorMessage(error, 'Kontaktni saqlab bo‘lmadi.'), 'error'); }
    finally { setSaving(false); }
  };
  const remove = async (contact: Contact) => {
    if (!window.confirm(`“${contact.displayName}” o‘chirilsinmi?`)) return;
    try { await contactsApi.remove(contact.id); await load(); showToast('Kontakt o‘chirildi', 'success'); }
    catch (error) { showToast(getApiErrorMessage(error, 'Kontaktni o‘chirib bo‘lmadi.'), 'error'); }
  };
  const followUps = useMemo(() => items.filter((item) => item.nextFollowUpAt).sort((a, b) => String(a.nextFollowUpAt).localeCompare(String(b.nextFollowUpAt))).slice(0, 5), [items]);

  return <main className="business-page">
    <header className="business-head"><div><span className="business-head__eyebrow">ALOQALAR</span><h1>Kontaktlar</h1><p>Odamlar, kompaniyalar va muhim suhbatlarni AI eslab turadi.</p></div><button className="business-button" onClick={openCreate}><Plus size={17}/> Kontakt qo‘shish</button></header>
    <div className="business-toolbar"><label className="business-search"><Search size={16}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ism, telefon yoki kompaniya..."/></label><span className="business-badge">{items.length} ta kontakt</span></div>
    <section className="business-split">
      <article className="business-card"><h2>Barcha kontaktlar</h2><div className="business-list" style={{marginTop:14}}>{items.length ? items.map((contact) => <div className="business-row" key={contact.id} onDoubleClick={() => openEdit(contact)}><span className="business-row__icon"><UserRound size={18}/></span><span className="business-row__body"><strong>{contact.displayName}</strong><span>{[contact.position, contact.company, contact.phone].filter(Boolean).join(' · ') || 'Qo‘shimcha ma’lumot yo‘q'}</span></span><button className="business-button business-button--ghost" style={{minHeight:34,padding:'0 10px'}} onClick={() => openEdit(contact)}>Tahrirlash</button><button className="business-button business-button--danger" style={{minHeight:34,padding:'0 10px'}} onClick={() => void remove(contact)} aria-label="O‘chirish"><Trash2 size={14}/></button></div>) : <div className="business-empty">Kontakt topilmadi.</div>}</div></article>
      <article className="business-card"><h2>Keyingi aloqalar</h2><div className="business-list" style={{marginTop:14}}>{followUps.length ? followUps.map((contact) => <div className="business-row" key={contact.id}><span className="business-row__icon"><CalendarClock size={17}/></span><span className="business-row__body"><strong>{contact.displayName}</strong><span>{new Date(contact.nextFollowUpAt!).toLocaleString('uz-UZ')}</span></span></div>) : <div className="business-empty">Rejalashtirilgan aloqa yo‘q.</div>}</div></article>
    </section>
    {modal && <div className="business-modal" onMouseDown={(event) => { if (event.target === event.currentTarget) setModal(false); }}><section className="business-modal__panel"><header className="business-modal__head"><div><span className="business-head__eyebrow">KONTAKT</span><h2>{selected ? 'Kontaktni tahrirlash' : 'Yangi kontakt'}</h2></div><button onClick={() => setModal(false)}><X size={17}/></button></header><form className="business-form" onSubmit={submit}>
      <div className="business-field"><label>Ism</label><input value={form.firstName} onChange={(e)=>setForm({...form,firstName:e.target.value})} required/></div><div className="business-field"><label>Familiya</label><input value={form.lastName} onChange={(e)=>setForm({...form,lastName:e.target.value})}/></div>
      <div className="business-field"><label><Phone size={12}/> Telefon</label><input value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})}/></div><div className="business-field"><label><Mail size={12}/> Email</label><input type="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})}/></div>
      <div className="business-field"><label>Telegram</label><input value={form.telegramUsername} onChange={(e)=>setForm({...form,telegramUsername:e.target.value})} placeholder="username"/></div><div className="business-field"><label><Building2 size={12}/> Kompaniya</label><input value={form.company} onChange={(e)=>setForm({...form,company:e.target.value})}/></div>
      <div className="business-field"><label>Lavozim</label><input value={form.position} onChange={(e)=>setForm({...form,position:e.target.value})}/></div><div className="business-field"><label>Aloqa turi</label><input value={form.relationship} onChange={(e)=>setForm({...form,relationship:e.target.value})} placeholder="Mijoz, hamkor..."/></div>
      <div className="business-field"><label>Tug‘ilgan sana</label><input type="date" value={form.birthday} onChange={(e)=>setForm({...form,birthday:e.target.value})}/></div><div className="business-field"><label>Qayta bog‘lanish</label><input type="datetime-local" value={form.nextFollowUpAt} onChange={(e)=>setForm({...form,nextFollowUpAt:e.target.value})}/></div>
      <div className="business-field business-field--wide"><label>Teglar (vergul bilan)</label><input value={form.tags} onChange={(e)=>setForm({...form,tags:e.target.value})} placeholder="vip, mijoz, savdo"/></div><div className="business-field business-field--wide"><label>Izoh</label><textarea value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})}/></div>
      <div className="business-form__actions"><button type="button" className="business-button business-button--ghost" onClick={()=>setModal(false)}>Bekor qilish</button><button className="business-button" disabled={saving}>{saving?'Saqlanmoqda...':'Saqlash'}</button></div>
    </form></section></div>}
  </main>;
};

export default Contacts;
