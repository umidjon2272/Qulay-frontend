import React,{useMemo,useState} from 'react'
import {useNavigate,useSearchParams} from 'react-router-dom'
import {ClipboardCheck,PackagePlus,AlertTriangle,Sparkles,Search,Plus,Boxes,CalendarClock,Check,Warehouse as WarehouseIcon,ArrowRightLeft} from 'lucide-react'
import {PageHeader,Card,KPI,Money,Modal,Field,Input,Select,Toast,Status,Empty} from '../components/UI'
import {useApp} from '../state/AppContext'

const stockRow=(state,warehouseId,productId)=>state.warehouseStocks.find(x=>x.warehouseId===warehouseId&&x.productId===productId)||{qty:0,reserved:0}

export default function Warehouse(){
  const {state,quickInbound,transferStock,finalizeInventory,addWarehouse}=useApp()
  const [p]=useSearchParams(),view=p.get('view')||'stock',nav=useNavigate()
  const [inbound,setInbound]=useState(false),[transfer,setTransfer]=useState(false),[inventory,setInventory]=useState(false),[newWarehouse,setNewWarehouse]=useState(false),[toast,setToast]=useState('')
  const aggregate=useMemo(()=>{
    const totalQty=state.warehouseStocks.reduce((a,x)=>a+(+x.qty||0),0)
    const value=state.warehouseStocks.reduce((a,x)=>{const product=state.products.find(p=>p.id===x.productId);return a+(+x.qty||0)*(product?.cost||0)},0)
    const low=state.products.filter(p=>p.stock<=p.minStock&&p.stock>0).length
    const expiry=state.products.filter(x=>x.trackExpiry&&x.expiry&&new Date(x.expiry)<new Date('2026-10-01')).length
    return {totalQty,value,low,expiry}
  },[state])
  return <>
    <PageHeader title="Ombor" subtitle="Qoldiq, harakat, transfer, inventarizatsiya va srok nazorati." actions={<><button className="soft-glass-btn" onClick={()=>nav(`/ai?context=warehouse&view=${view}`)}><Sparkles/> AI bilan amal</button><button className="soft-glass-btn" onClick={()=>setNewWarehouse(true)}><WarehouseIcon/> Ombor yaratish</button><button className="primary-glass-btn" onClick={()=>setInbound(true)}><PackagePlus/> Tezkor kirim</button></>}/>
    <div className="kpi-grid"><KPI label="Jami qoldiq" value={`${aggregate.totalQty.toLocaleString('uz-UZ')} birlik`} icon={<Boxes/>}/><KPI label="Ombor qiymati" value={<Money value={aggregate.value}/>} icon={<ClipboardCheck/>}/><KPI label="Kam qolgan" value={`${aggregate.low} ta`} icon={<AlertTriangle/>}/><KPI label="Sroki yaqin" value={`${aggregate.expiry} ta`} icon={<CalendarClock/>}/></div>
    {view==='stock'&&<Stock state={state}/>} {view==='movements'&&<Moves state={state}/>} {view==='transfer'&&<TransferView state={state} onNew={()=>setTransfer(true)}/>} {view==='inventory'&&<InventoryView state={state} onNew={()=>setInventory(true)}/>} {view==='expiry'&&<ExpiryView state={state}/>} 
    {inbound&&<InboundModal state={state} onClose={()=>setInbound(false)} onSave={v=>{quickInbound(v);setInbound(false);setToast('Kirim bajarildi, tanlangan ombor qoldig‘i yangilandi.')}}/>}
    {transfer&&<TransferModal state={state} onClose={()=>setTransfer(false)} onSave={v=>{transferStock(v);setTransfer(false);setToast('Transfer yakunlandi.')}}/>}
    {inventory&&<InventoryModal state={state} onClose={()=>setInventory(false)} onSave={v=>{finalizeInventory(v);setInventory(false);setToast('Inventarizatsiya yakunlandi.')}}/>}
    {newWarehouse&&<WarehouseModal state={state} onClose={()=>setNewWarehouse(false)} onSave={v=>{addWarehouse(v);setNewWarehouse(false);setToast('Yangi ombor yaratildi.')}}/>}
    <Toast message={toast} onDone={()=>setToast('')}/>
  </>
}

function Stock({state}){
  const [q,setQ]=useState(''),[warehouseId,setWarehouseId]=useState('all')
  const rows=useMemo(()=>{
    const result=[]
    for(const p of state.products){
      const targets=warehouseId==='all'?state.warehouses:state.warehouses.filter(w=>w.id===warehouseId)
      for(const w of targets){
        const s=stockRow(state,w.id,p.id)
        if((p.name+' '+p.sku+' '+p.barcode).toLowerCase().includes(q.toLowerCase())) result.push({product:p,warehouse:w,...s})
      }
    }
    return result.filter(x=>warehouseId!=='all'||x.qty>0||x.reserved>0)
  },[state,q,warehouseId])
  return <Card><div className="toolbar"><div className="mini-search"><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Mahsulot, SKU yoki barcode..."/></div><Select value={warehouseId} onChange={setWarehouseId}><option value="all">Barcha omborlar</option>{state.warehouses.map(w=><option value={w.id} key={w.id}>{w.name}</option>)}</Select></div>{rows.length?<table><thead><tr><th>Mahsulot</th><th>Ombor</th><th>Qoldiq</th><th>Band qilingan</th><th>Sotish mumkin</th><th>Tannarx</th><th>Qiymat</th><th>Holat</th></tr></thead><tbody>{rows.map(x=>{const available=Math.max(0,x.qty-(x.reserved||0));return <tr key={`${x.warehouse.id}-${x.product.id}`}><td><b>{x.product.name}</b><small>{x.product.sku}</small></td><td>{x.warehouse.name}</td><td>{x.qty} {x.product.unit}</td><td>{x.reserved||0} {x.product.unit}</td><td>{available} {x.product.unit}</td><td><Money value={x.product.cost}/></td><td><Money value={x.product.cost*x.qty}/></td><td><Status>{x.qty===0?'Tugagan':x.qty<=x.product.minStock?'Kam qoldi':'Yetarli'}</Status></td></tr>})}</tbody></table>:<Empty title="Qoldiq topilmadi" text="Qidiruv yoki ombor filtrini o‘zgartiring."/>}</Card>
}

function Moves({state}){return <Card><div className="card-title"><b>Ombor harakatlari</b><span>{state.inventoryMoves.length} ta</span></div><table><thead><tr><th>Sana</th><th>Vaqt</th><th>Turi</th><th>Mahsulot</th><th>Ombor</th><th>Miqdor</th><th>Manba</th><th>Kim</th></tr></thead><tbody>{state.inventoryMoves.map(m=><tr key={m.id}><td>{m.date}</td><td>{m.time}</td><td><Status>{m.type}</Status></td><td>{m.product}</td><td>{state.warehouses.find(w=>w.id===m.warehouseId)?.name||'—'}</td><td className={m.qty<0?'danger-text':''}>{m.qty}</td><td>{m.source}</td><td>{m.user}</td></tr>)}</tbody></table></Card>}

function TransferView({state,onNew}){return <Card><div className="card-title"><b>Omborlar orasida transfer</b><button className="primary-glass-btn compact" onClick={onNew}><Plus/> Yangi transfer</button></div>{state.transfers.length?<table><thead><tr><th>#</th><th>Qayerdan</th><th>Qayerga</th><th>Mahsulot</th><th>Miqdor</th><th>Sana</th><th>Status</th></tr></thead><tbody>{state.transfers.map(t=><tr key={t.id}><td>{t.id}</td><td>{state.warehouses.find(w=>w.id===t.from)?.name}</td><td>{state.warehouses.find(w=>w.id===t.to)?.name}</td><td>{state.products.find(p=>p.id===t.productId)?.name}</td><td>{t.qty}</td><td>{t.date}</td><td><Status>{t.status}</Status></td></tr>)}</tbody></table>:<Empty icon={<ArrowRightLeft/>} title="Transferlar hali yo‘q" text="Yangi transfer yaratib omborlar orasida mahsulot ko‘chiring." action={<button className="primary-glass-btn compact" onClick={onNew}><Plus/> Yangi transfer</button>}/>}</Card>}

function InventoryView({state,onNew}){return <Card><div className="card-title"><b>Inventarizatsiya</b><button className="primary-glass-btn compact" onClick={onNew}><Plus/> Inventarizatsiya boshlash</button></div><table><thead><tr><th>#</th><th>Ombor</th><th>Sana</th><th>Mas’ul</th><th>Progress</th><th>Farq</th><th>Status</th></tr></thead><tbody>{state.inventoryCounts.map(x=><tr key={x.id}><td>{x.id}</td><td>{state.warehouses.find(w=>w.id===x.warehouseId)?.name}</td><td>{x.date}</td><td>{x.responsible}</td><td>{x.progress}%</td><td>{x.difference}</td><td><Status>{x.status}</Status></td></tr>)}</tbody></table></Card>}

function ExpiryView({state}){const rows=state.products.filter(x=>x.trackExpiry);return <Card><div className="card-title"><b>Srok / Partiyalar</b><span>Sroki yaqin mahsulotlar avtomatik ajratiladi</span></div><table><thead><tr><th>Mahsulot</th><th>Jami qoldiq</th><th>Yaroqlilik sanasi</th><th>Qolgan kun</th><th>Holat</th></tr></thead><tbody>{rows.map(x=>{const days=Math.ceil((new Date(x.expiry)-new Date('2026-09-05'))/86400000);return <tr key={x.id}><td>{x.name}</td><td>{x.stock} {x.unit}</td><td>{x.expiry}</td><td>{days}</td><td><Status>{days<0?'Sroki o‘tgan':days<=30?'Sroki yaqin':'Yaxshi'}</Status></td></tr>})}</tbody></table></Card>}

function InboundModal({state,onClose,onSave}){
  const [warehouseId,setWarehouse]=useState(state.settings.defaultWarehouseId),[productId,setProduct]=useState(state.products[0]?.id||''),[qty,setQty]=useState(1),[reason,setReason]=useState('Tezkor kirim')
  const current=stockRow(state,warehouseId,productId),p=state.products.find(x=>x.id===productId)
  return <Modal open onClose={onClose} title="Tezkor kirim" eyebrow="OMBOR" subtitle="Tanlangan ombordagi qoldiqni real kirim movementi bilan oshiradi." footer={<><button className="secondary-glass-btn" onClick={onClose}>Bekor</button><button className="primary-glass-btn" onClick={()=>productId&&+qty>0&&onSave({warehouseId,items:[{productId,qty:+qty}],reason})}><Check/> Kirim qilish</button></>}><Field label="Ombor"><Select value={warehouseId} onChange={setWarehouse}>{state.warehouses.filter(w=>w.status==='Faol').map(w=><option value={w.id} key={w.id}>{w.name}</option>)}</Select></Field><Field label="Mahsulot"><Select value={productId} onChange={setProduct}>{state.products.filter(p=>p.active).map(p=><option value={p.id} key={p.id}>{p.name} · {stockRow(state,warehouseId,p.id).qty} {p.unit}</option>)}</Select></Field><div className="info-note"><Boxes/><span>Hozirgi qoldiq: <b>{current.qty} {p?.unit||''}</b>. Kirimdan keyin: <b>{current.qty+(+qty||0)} {p?.unit||''}</b>.</span></div><div className="form-grid two"><Field label="Miqdor"><input type="number" min="0.001" step="0.001" value={qty} onChange={e=>setQty(e.target.value)}/></Field><Field label="Sabab / manba"><Input value={reason} onChange={setReason}/></Field></div></Modal>
}

function TransferModal({state,onClose,onSave}){
  const [from,setFrom]=useState(state.warehouses[0]?.id||''),[to,setTo]=useState(state.warehouses[1]?.id||state.warehouses[0]?.id||''),[productId,setProduct]=useState(state.products[0]?.id||''),[qty,setQty]=useState(1)
  const source=stockRow(state,from,productId),product=state.products.find(p=>p.id===productId),available=Math.max(0,source.qty-(source.reserved||0)),invalid=from===to||+qty<=0||+qty>available
  return <Modal open onClose={onClose} title="Yangi transfer" eyebrow="TRANSFER" subtitle="Faqat manba ombordagi sotish mumkin qoldiq transfer qilinadi." footer={<><button className="secondary-glass-btn" onClick={onClose}>Bekor</button><button className="primary-glass-btn" disabled={invalid} onClick={()=>onSave({from,to,productId,qty:+qty})}>Transfer qilish</button></>}><div className="form-grid two"><Field label="Qayerdan"><Select value={from} onChange={setFrom}>{state.warehouses.map(w=><option value={w.id} key={w.id}>{w.name}</option>)}</Select></Field><Field label="Qayerga"><Select value={to} onChange={setTo}>{state.warehouses.map(w=><option value={w.id} key={w.id}>{w.name}</option>)}</Select></Field></div><Field label="Mahsulot"><Select value={productId} onChange={setProduct}>{state.products.filter(p=>stockRow(state,from,p.id).qty>0).map(p=><option value={p.id} key={p.id}>{p.name} · {stockRow(state,from,p.id).qty} {p.unit}</option>)}</Select></Field><div className="info-note"><Boxes/><span>Manba ombor: <b>{source.qty} {product?.unit||''}</b>, band: <b>{source.reserved||0}</b>, transfer qilish mumkin: <b>{available}</b>.</span></div><Field label="Miqdor" error={+qty>available?'Mavjud sotish mumkin qoldiqdan ko‘p.':''}><input type="number" value={qty} min="0.001" max={available} step="0.001" onChange={e=>setQty(e.target.value)}/></Field></Modal>
}

function InventoryModal({state,onClose,onSave}){
  const defaultWh=state.settings.defaultWarehouseId||state.warehouses[0]?.id||''
  const makeLines=wh=>state.products.map(p=>{const s=stockRow(state,wh,p.id);return {productId:p.id,system:s.qty,actual:s.qty}})
  const [warehouseId,setWarehouse]=useState(defaultWh),[lines,setLines]=useState(()=>makeLines(defaultWh))
  const changeWarehouse=wh=>{setWarehouse(wh);setLines(makeLines(wh))}
  return <Modal open onClose={onClose} title="Inventarizatsiya" eyebrow="SANASH" subtitle="Tanlangan omborning real qoldig‘ini tizim qoldig‘i bilan solishtiring." size="xl" footer={<><button className="secondary-glass-btn" onClick={onClose}>Bekor</button><button className="primary-glass-btn" onClick={()=>onSave({warehouseId,lines})}>Yakunlash</button></>}><Field label="Ombor"><Select value={warehouseId} onChange={changeWarehouse}>{state.warehouses.map(w=><option value={w.id} key={w.id}>{w.name}</option>)}</Select></Field><table><thead><tr><th>Mahsulot</th><th>Tizim qoldig‘i</th><th>Real</th><th>Farq</th></tr></thead><tbody>{lines.map((l,i)=>{const p=state.products.find(x=>x.id===l.productId);return <tr key={l.productId}><td>{p?.name}</td><td>{l.system} {p?.unit}</td><td><input className="small-number" type="number" min="0" step="0.001" value={l.actual} onChange={e=>setLines(ls=>ls.map((x,idx)=>idx===i?{...x,actual:+e.target.value||0}:x))}/></td><td className={l.actual-l.system<0?'danger-text':''}>{l.actual-l.system}</td></tr>})}</tbody></table></Modal>
}

function WarehouseModal({state,onClose,onSave}){const [f,setF]=useState({name:'',code:'',branchId:state.branches[0]?.id||'',type:'Asosiy',responsible:'',address:'',status:'Faol'});return <Modal open onClose={onClose} title="Yangi ombor" eyebrow="OMBOR" subtitle="Yangi ombor Mahsulot, Xarid, Kirim, Transfer va Hisobotlarda darhol ko‘rinadi." footer={<><button className="secondary-glass-btn" onClick={onClose}>Bekor</button><button className="primary-glass-btn" disabled={!f.name.trim()} onClick={()=>onSave(f)}><Check/> Ombor yaratish</button></>}><div className="form-grid two"><Field label="Nomi"><Input value={f.name} onChange={v=>setF({...f,name:v})}/></Field><Field label="Kod"><Input value={f.code} onChange={v=>setF({...f,code:v})}/></Field><Field label="Filial"><Select value={f.branchId} onChange={v=>setF({...f,branchId:v})}>{state.branches.map(b=><option value={b.id} key={b.id}>{b.name}</option>)}</Select></Field><Field label="Turi"><Select value={f.type} onChange={v=>setF({...f,type:v})}><option>Asosiy</option><option>Savdo zali</option><option>Tranzit</option><option>Boshqa</option></Select></Field><Field label="Mas’ul"><Input value={f.responsible} onChange={v=>setF({...f,responsible:v})}/></Field><Field label="Manzil"><Input value={f.address} onChange={v=>setF({...f,address:v})}/></Field></div></Modal>}
