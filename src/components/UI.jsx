import React,{useEffect,useMemo,useRef,useState} from 'react'
import {Search,Filter,MoreHorizontal,X,Check,ChevronDown,Info,AlertTriangle,Trash2} from 'lucide-react'

export const money=n=>Number(n||0).toLocaleString('uz-UZ')+' so‘m'
export const Money=({value})=><>{money(value)}</>
export const PageHeader=({title,subtitle,actions,breadcrumb})=><div className="page-head"><div>{breadcrumb&&<span className="page-breadcrumb">{breadcrumb}</span>}<h1>{title}</h1><p>{subtitle}</p></div><div className="page-actions">{actions}</div></div>
export const Card=({children,className='',onClick})=><section className={`card liquid-card ${className}`} onClick={onClick}>{children}</section>
export const KPI=({label,value,delta,icon,tone='blue',onClick,sub})=><Card className={`kpi tone-${tone} ${onClick?'clickable':''}`} onClick={onClick}><div className="kpi-icon">{icon}</div><div className="kpi-copy"><span>{label}</span><strong>{value}</strong>{sub&&<em>{sub}</em>}{delta&&<small className={String(delta).trim().startsWith('-')?'down':'up'}>{delta}</small>}</div></Card>
export const Tabs=({items,active,onChange})=><div className="tabs">{items.map(x=>{const value=typeof x==='string'?x:x.value;const label=typeof x==='string'?x:x.label;return <button className={active===value?'active':''} key={value} onClick={()=>onChange(value)}>{label}</button>})}</div>
export const SearchBox=({value,onChange,placeholder='Qidirish...',className=''})=><div className={`mini-search ${className}`}><Search size={16}/><input value={value??''} onChange={e=>onChange?.(e.target.value)} placeholder={placeholder}/></div>
export function Select({value,onChange,children,className='',label,disabled,placeholder='Tanlang',...rest}){
  const [open,setOpen]=useState(false)
  const ref=useRef(null)
  const options=useMemo(()=>React.Children.toArray(children).filter(React.isValidElement).map((child,i)=>({
    key:child.key??i,
    value:child.props.value??child.props.children,
    label:child.props.children,
    disabled:!!child.props.disabled,
  })),[children])
  const selected=options.find(o=>String(o.value)===String(value))
  useEffect(()=>{if(!open)return;const close=e=>{if(!ref.current?.contains(e.target))setOpen(false)};const key=e=>{if(e.key==='Escape')setOpen(false)};document.addEventListener('mousedown',close);window.addEventListener('keydown',key);return()=>{document.removeEventListener('mousedown',close);window.removeEventListener('keydown',key)}},[open])
  return <div className={`custom-select-wrap ${className}`} ref={ref} {...rest}>
    {label&&<span>{label}</span>}
    <button type="button" className={`custom-select-trigger ${open?'open':''}`} disabled={disabled} onClick={()=>!disabled&&setOpen(v=>!v)} aria-expanded={open}>
      <span className={!selected?'placeholder':''}>{selected?.label??placeholder}</span><ChevronDown size={15}/>
    </button>
    {open&&<div className="custom-select-menu liquid-panel" role="listbox">{options.map(o=><button type="button" role="option" aria-selected={String(o.value)===String(value)} disabled={o.disabled} className={String(o.value)===String(value)?'selected':''} key={o.key} onClick={()=>{onChange?.(o.value);setOpen(false)}}><span>{o.label}</span>{String(o.value)===String(value)&&<Check size={14}/>}</button>)}</div>}
  </div>
}
export const Field=({label,children,hint,error,className=''})=><div className={`field ${className}`}><span>{label}</span>{children}{hint&&<small>{hint}</small>}{error&&<small className="field-error">{error}</small>}</div>
export const Toggle=({checked,onChange,label,description,disabled})=><label className={`toggle-row ${disabled?'disabled':''}`}><span><b>{label}</b>{description&&<small>{description}</small>}</span><button type="button" className={`switch ${checked?'on':''}`} onClick={()=>!disabled&&onChange?.(!checked)} aria-pressed={checked}><i/></button></label>
export const Toolbar=({placeholder='Qidirish...',query,onQuery,children,onFilter})=><div className="toolbar"><SearchBox value={query} onChange={onQuery} placeholder={placeholder}/>{children}<button className="soft-glass-btn compact" onClick={onFilter}><Filter size={16}/> Filtr</button></div>
export const Empty=({title='Ma’lumot yo‘q',text='Hozircha yozuv mavjud emas.',icon,action})=><div className="empty">{icon}<b>{title}</b><span>{text}</span>{action}</div>
export const More=({onClick})=><button className="icon-ghost" onClick={onClick}><MoreHorizontal size={18}/></button>
export const Status=({children,tone})=>{const t=tone||((String(children).toLowerCase().includes('to‘lan')||String(children).toLowerCase().includes('bajar')||String(children).toLowerCase().includes('faol')||String(children).toLowerCase().includes('yakun'))?'success':(String(children).toLowerCase().includes('muddati')||String(children).toLowerCase().includes('bekor')||String(children).toLowerCase().includes('xato'))?'danger':(String(children).toLowerCase().includes('kutil')||String(children).toLowerCase().includes('qisman')||String(children).toLowerCase().includes('nasiya')||String(children).toLowerCase().includes('kam'))?'warn':'neutral');return <span className={`status ${t}`}>{children}</span>}

export function Modal({open=true,onClose,title,eyebrow,subtitle,children,footer,size='md',danger=false}){
  useEffect(()=>{if(!open)return;const f=e=>e.key==='Escape'&&onClose?.();window.addEventListener('keydown',f);return()=>window.removeEventListener('keydown',f)},[open,onClose])
  if(!open)return null
  return <div className="modal-wrap" onMouseDown={e=>e.target===e.currentTarget&&onClose?.()}><section className={`entity-modal liquid-panel size-${size} ${danger?'danger-modal':''}`}><div className="modal-head"><div>{eyebrow&&<span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button type="button" className="modal-close" onClick={onClose}><X/></button></div><div className="modal-body">{children}</div>{footer&&<div className="modal-actions">{footer}</div>}</section></div>
}

export function Drawer({open=true,onClose,title,eyebrow,subtitle,children,actions,size='md'}){
  if(!open)return null
  return <div className="drawer-overlay" onMouseDown={e=>e.target===e.currentTarget&&onClose?.()}><aside className={`drawer liquid-panel drawer-${size}`}><div className="drawer-head"><div>{eyebrow&&<span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div><button onClick={onClose}><X/></button></div><div className="drawer-body">{children}</div>{actions&&<div className="drawer-actions">{actions}</div>}</aside></div>
}

export function Confirm({open,onClose,onConfirm,title='Tasdiqlaysizmi?',text='Bu amalni davom ettirmoqchimisiz?',confirmText='Tasdiqlash',danger=false}){
  return <Modal open={open} onClose={onClose} title={title} eyebrow={danger?'XAVFLI AMAL':'TASDIQLASH'} danger={danger} footer={<><button className="secondary-glass-btn" onClick={onClose}>Bekor</button><button className={danger?'danger-glass-btn':'primary-glass-btn'} onClick={()=>{onConfirm?.();onClose?.()}}>{danger?<Trash2/>:<Check/>}{confirmText}</button></>}><div className="confirm-copy">{danger?<AlertTriangle/>:<Info/>}<p>{text}</p></div></Modal>
}

export function Toast({message,tone='success',onDone}){
  useEffect(()=>{if(!message)return;const t=setTimeout(()=>onDone?.(),2400);return()=>clearTimeout(t)},[message,onDone])
  if(!message)return null
  return <div className={`toast toast-${tone}`}><Check size={17}/><span>{message}</span></div>
}

export function Table({columns,rows,keyField='id',onRowClick,empty='Ma’lumot topilmadi'}){
  return <div className="responsive-table"><table><thead><tr>{columns.map(c=><th key={c.key||c.label} className={c.className||''}>{c.label}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={r[keyField]??i} onClick={()=>onRowClick?.(r)} className={onRowClick?'click-row':''}>{columns.map(c=><td key={c.key||c.label} className={c.className||''}>{c.render?c.render(r):r[c.key]}</td>)}</tr>)}</tbody></table>{!rows.length&&<div className="table-empty"><Search/><b>{empty}</b><span>Qidiruv yoki filtrlarni o‘zgartiring.</span></div>}</div>
}

export function NumberInput({value,onChange,min,max,step=1,placeholder,...rest}){return <input type="number" value={value??''} min={min} max={max} step={step} placeholder={placeholder} onChange={e=>onChange?.(e.target.value)} {...rest}/>} 
export function Input({value,onChange,placeholder,type='text',required,autoFocus,...rest}){return <input type={type} value={value??''} onChange={e=>onChange?.(e.target.value)} placeholder={placeholder} required={required} autoFocus={autoFocus} {...rest}/>} 
export const SectionTitle=({title,subtitle,actions})=><div className="section-title"><div><h3>{title}</h3>{subtitle&&<p>{subtitle}</p>}</div>{actions&&<div>{actions}</div>}</div>
export const StatList=({items})=><div className="stat-list">{items.map(([label,value,tone],i)=><div key={i}><span>{label}</span><b className={tone||''}>{value}</b></div>)}</div>

export function Segmented({items,value,onChange}){return <div className="segmented">{items.map(x=>{const v=typeof x==='string'?x:x.value;const l=typeof x==='string'?x:x.label;return <button key={v} className={value===v?'active':''} onClick={()=>onChange?.(v)}>{l}</button>})}</div>}

export function FileButton({onFile,label='Fayl tanlash',accept='.csv,.xlsx,.xls,.json'}){const ref=useRef();return <><input ref={ref} type="file" accept={accept} hidden onChange={e=>onFile?.(e.target.files?.[0])}/><button type="button" className="soft-glass-btn" onClick={()=>ref.current?.click()}>{label}</button></>}
