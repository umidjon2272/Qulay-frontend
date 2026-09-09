import React,{useMemo,useState} from 'react'
import {useNavigate,useSearchParams} from 'react-router-dom'
import {Plus,ShoppingCart,Sparkles,PackageCheck,Undo2,Search,Truck,Clock3,AlertTriangle,Boxes} from 'lucide-react'
import {PageHeader,Card,KPI,Money,Modal,Field,Input,Select,Status,Toast,Empty,Toggle} from '../components/UI'
import {useApp} from '../state/AppContext'

const stockFor=(state,warehouseId,productId)=>state.warehouseStocks?.find(x=>x.warehouseId===warehouseId&&x.productId===productId)?.qty||0
const whName=(state,id)=>state.warehouses.find(w=>w.id===id)?.name||id||'—'
const num=v=>Math.max(0,Number(v)||0)

export default function Purchases(){
  const {state,createPurchase,receivePurchase,returnToSupplier}=useApp()
  const [p]=useSearchParams(),view=p.get('view')||'all',nav=useNavigate()
  const [show,setShow]=useState(false),[returnOpen,setReturnOpen]=useState(false),[toast,setToast]=useState('')
  const total=state.purchases.reduce((a,x)=>a+x.amount,0)
  const pending=state.purchases.filter(x=>x.receiptStatus!=='Qabul qilindi').length
  return <>
    <PageHeader title="Xaridlar" subtitle="Supplierdan tovar olish, qabul qilish va qaytarish." actions={<><button className="soft-glass-btn" onClick={()=>nav(`/ai?context=purchases&view=${view}`)}><Sparkles/> AI xarid tayyorlasin</button><button className="primary-glass-btn" onClick={()=>setShow(true)}><Plus/> Yangi xarid</button></>}/>
    <div className="kpi-grid">
      <KPI label="Jami xarid" value={<Money value={total}/>} icon={<ShoppingCart/>}/>
      <KPI label="Kutilayotgan qabul" value={`${pending} ta`} icon={<Clock3/>}/>
      <KPI label="Supplier qarzi" value={<Money value={state.supplierDebts.reduce((a,x)=>a+Math.max(0,x.amount-x.paid),0)}/>} icon={<Truck/>}/>
      <KPI label="Qaytarishlar" value={`${state.supplierReturns.length} ta`} icon={<Undo2/>}/>
    </div>
    {view==='all'&&<PurchaseList state={state}/>} 
    {view==='receiving'&&<Receiving state={state} receivePurchase={receivePurchase} toast={m=>setToast(m)}/>} 
    {view==='returns'&&<Returns state={state} onNew={()=>setReturnOpen(true)}/>} 
    {show&&<PurchaseModal state={state} onClose={()=>setShow(false)} onSave={v=>{createPurchase(v);setShow(false);setToast(v.receiveNow?'Xarid yaratildi va omborga qabul qilindi.':'Xarid yaratildi. Qabul qilish bo‘limida qabul qilishingiz mumkin.')}}/>}
    {returnOpen&&<ReturnModal state={state} onClose={()=>setReturnOpen(false)} onSave={v=>{returnToSupplier(v);setReturnOpen(false);setToast('Supplierga qaytarish yakunlandi.')}}/>}
    <Toast message={toast} onDone={()=>setToast('')}/>
  </>
}

function PurchaseList({state}){
  const [q,setQ]=useState(''),[receipt,setReceipt]=useState('Barchasi'),[warehouse,setWarehouse]=useState('Barchasi')
  const data=state.purchases.filter(x=>{
    const text=(x.id+' '+x.supplier).toLowerCase().includes(q.toLowerCase())
    const receiptOk=receipt==='Barchasi'||x.receiptStatus===receipt
    const whOk=warehouse==='Barchasi'||x.warehouseId===warehouse
    return text&&receiptOk&&whOk
  })
  return <Card>
    <div className="toolbar">
      <div className="mini-search"><Search/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="PO raqami yoki supplier..."/></div>
      <Select value={receipt} onChange={setReceipt}><option>Barchasi</option><option>Kutilmoqda</option><option>Qisman qabul</option><option>Qabul qilindi</option></Select>
      <Select value={warehouse} onChange={setWarehouse}><option value="Barchasi">Barcha omborlar</option>{state.warehouses.map(w=><option value={w.id} key={w.id}>{w.name}</option>)}</Select>
    </div>
    <div className="responsive-table"><table><thead><tr><th>#</th><th>Supplier</th><th>Sana</th><th>Ombor</th><th>Mahsulot</th><th>Summa</th><th>Qabul</th><th>To‘lov</th></tr></thead><tbody>{data.map(x=><tr key={x.id}><td><b>{x.id}</b></td><td>{x.supplier}</td><td>{x.date}</td><td>{whName(state,x.warehouseId)}</td><td>{x.items?.length||0} xil</td><td><Money value={x.amount}/></td><td><Status>{x.receiptStatus}</Status></td><td><Status>{x.paymentStatus}</Status></td></tr>)}</tbody></table>{!data.length&&<Empty title="Xarid topilmadi" text="Qidiruv yoki filtrni o‘zgartiring."/>}</div>
  </Card>
}

function Receiving({state,receivePurchase,toast}){
  const rows=state.purchases.filter(x=>x.receiptStatus!=='Qabul qilindi')
  const [selected,setSelected]=useState(null)
  return <Card>
    <div className="card-title"><div><b>Qabul qilish</b><span>Kelgan real miqdorni kiriting. Qisman qabul ham qo‘llab-quvvatlanadi.</span></div></div>
    {!rows.length&&<Empty icon={<PackageCheck/>} title="Kutilayotgan qabul yo‘q" text="Barcha xaridlar to‘liq qabul qilingan."/>}
    {rows.map(p=>{
      const received=(p.receivedItems||[]).reduce((a,x)=>a+(+x.qty||0),0)
      const ordered=(p.items||[]).reduce((a,x)=>a+(+x.qty||0),0)
      return <div className="receiving-card" key={p.id}>
        <div><b>{p.id} · {p.supplier}</b><small>{whName(state,p.warehouseId)} · {received}/{ordered} birlik qabul qilingan · <Money value={p.amount}/></small></div>
        <Status>{p.receiptStatus}</Status>
        <button className="primary-glass-btn compact" onClick={()=>setSelected(p)}><PackageCheck/> Qabul qilish</button>
      </div>
    })}
    {selected&&<ReceiveModal state={state} purchase={selected} onClose={()=>setSelected(null)} onSave={lines=>{receivePurchase(selected.id,lines);setSelected(null);toast(`${selected.id} bo‘yicha qabul saqlandi.`)}}/>}
  </Card>
}

function ReceiveModal({state,purchase,onClose,onSave}){
  const rows=(purchase.items||[]).map(i=>{
    const received=purchase.receivedItems?.find(r=>r.productId===i.productId)?.qty||0
    const remaining=Math.max(0,i.qty-received)
    return {...i,received,remaining,actual:remaining}
  })
  const [lines,setLines]=useState(rows),[error,setError]=useState('')
  const changed=lines.filter(x=>num(x.actual)>0)
  const totalActual=changed.reduce((a,x)=>a+num(x.actual),0)
  const submit=()=>{
    const invalid=lines.some(x=>num(x.actual)>x.remaining)
    if(invalid)return setError('Qabul miqdori qolgan buyurtma miqdoridan oshmasligi kerak.')
    if(!changed.length)return setError('Kamida bitta mahsulot uchun qabul miqdorini kiriting.')
    onSave(changed.map(x=>({productId:x.productId,qty:num(x.actual)})))
  }
  return <Modal open onClose={onClose} title={`${purchase.id} · Qabul qilish`} eyebrow="GOODS RECEIPT" subtitle={`${purchase.supplier} → ${whName(state,purchase.warehouseId)}`} size="xl" footer={<><button className="secondary-glass-btn" onClick={onClose}>Bekor</button><button className="primary-glass-btn" onClick={submit}><PackageCheck/> {lines.every(x=>num(x.actual)>=x.remaining)?'To‘liq qabul qilish':'Qisman qabul qilish'}</button></>}>
    <div className="receipt-summary"><span>Buyurtma: <b>{lines.reduce((a,x)=>a+x.qty,0)}</b></span><span>Oldin qabul: <b>{lines.reduce((a,x)=>a+x.received,0)}</b></span><span>Hozir: <b>{totalActual}</b></span></div>
    <div className="responsive-table"><table><thead><tr><th>Mahsulot</th><th>Buyurtma</th><th>Qabul qilingan</th><th>Qolgan</th><th>Hozir qabul</th></tr></thead><tbody>{lines.map((x,i)=>{const product=state.products.find(p=>p.id===x.productId);return <tr key={x.productId}><td><b>{product?.name||x.productId}</b></td><td>{x.qty}</td><td>{x.received}</td><td>{x.remaining}</td><td><Input type="number" min="0" max={x.remaining} value={x.actual} onChange={v=>setLines(ls=>ls.map((r,idx)=>idx===i?{...r,actual:v}:r))}/></td></tr>})}</tbody></table></div>
    {error&&<div className="inline-alert danger"><AlertTriangle/><span>{error}</span></div>}
  </Modal>
}

function Returns({state,onNew}){
  return <Card><div className="card-title"><div><b>Supplierga qaytarishlar</b><span>Ombordan supplierga qaytarilgan mahsulotlar tarixi.</span></div><button className="primary-glass-btn compact" onClick={onNew}><Plus/> Supplierga qaytarish</button></div>
    <div className="responsive-table"><table><thead><tr><th>#</th><th>Supplier</th><th>Xarid</th><th>Ombor</th><th>Mahsulot</th><th>Qty</th><th>Sabab</th><th>Summa</th><th>Status</th></tr></thead><tbody>{state.supplierReturns.map(r=><tr key={r.id}><td>{r.id}</td><td>{state.suppliers.find(s=>s.id===r.supplierId)?.name}</td><td>{r.purchaseId}</td><td>{whName(state,r.warehouseId)}</td><td>{state.products.find(p=>p.id===r.productId)?.name}</td><td>{r.qty}</td><td>{r.reason}</td><td><Money value={r.amount}/></td><td><Status>{r.status}</Status></td></tr>)}</tbody></table>{!state.supplierReturns.length&&<Empty icon={<Undo2/>} title="Qaytarish yo‘q" text="Supplierga qaytarish yaratilmagan." action={<button className="primary-glass-btn compact" onClick={onNew}><Plus/> Yangi qaytarish</button>}/>}</div>
  </Card>
}

function PurchaseModal({state,onClose,onSave}){
  const [supplierId,setSupplier]=useState(state.suppliers[0]?.id||'')
  const [warehouseId,setWarehouse]=useState(state.settings.defaultWarehouseId||state.warehouses[0]?.id||'')
  const [lines,setLines]=useState([]),[receiveNow,setReceiveNow]=useState(false),[error,setError]=useState('')
  const available=state.supplierProducts.filter(x=>x.supplierId===supplierId&&x.status!=='Arxiv').map(l=>({...state.products.find(p=>p.id===l.productId),link:l})).filter(x=>x.id)
  const toggle=x=>setLines(ls=>ls.some(i=>i.productId===x.id)?ls.filter(i=>i.productId!==x.id):[...ls,{productId:x.id,name:x.name,qty:Math.max(1,x.link.moq||1),price:x.link.purchasePrice}])
  const total=lines.reduce((a,x)=>a+num(x.qty)*num(x.price),0)
  const submit=()=>{if(!supplierId)return setError('Supplier tanlang.');if(!warehouseId)return setError('Qabul omborini tanlang.');if(!lines.length)return setError('Kamida bitta mahsulot tanlang.');onSave({supplierId,items:lines,total,warehouseId,receiveNow})}
  return <Modal open onClose={onClose} title="Yangi xarid" eyebrow="PURCHASE ORDER" subtitle="Supplier tanlanganda shu supplierga bog‘langan mahsulotlar va oxirgi/default kelish narxlari chiqadi." size="xl" footer={<><button className="secondary-glass-btn" onClick={onClose}>Bekor</button><button className="primary-glass-btn" onClick={submit}><ShoppingCart/> Xaridni yaratish</button></>}>
    <div className="form-grid two"><Field label="Supplier"><Select value={supplierId} onChange={v=>{setSupplier(v);setLines([])}}>{state.suppliers.filter(s=>s.status!=='Arxiv').map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</Select></Field><Field label="Qabul ombori"><Select value={warehouseId} onChange={setWarehouse}>{state.warehouses.filter(w=>w.status!=='Arxiv').map(w=><option value={w.id} key={w.id}>{w.name}</option>)}</Select></Field></div>
    <Toggle checked={receiveNow} onChange={setReceiveNow} label="Darhol qabul qilish" description="Yoqilsa xarid yaratilishi bilan mahsulotlar tanlangan omborga kirim bo‘ladi."/>
    <div className="purchase-product-grid">{available.map(x=><button type="button" className={lines.some(i=>i.productId===x.id)?'selected':''} onClick={()=>toggle(x)} key={x.id}><b>{x.name}</b><small>Kelish narxi: <Money value={x.link.purchasePrice}/> · MOQ {x.link.moq||1} · {x.link.leadTime||0} kun</small></button>)}</div>
    {!available.length&&<Empty icon={<AlertTriangle/>} title="Supplierga mahsulot bog‘lanmagan" text="Yetkazib beruvchilar → Mahsulotlar bo‘limidan mavjud mahsulotni bog‘lang yoki shu supplier ichidan yangi mahsulot yarating."/>}
    {lines.length>0&&<div className="purchase-lines">{lines.map((l,i)=><div key={l.productId}><span><b>{l.name}</b></span><Input type="number" min="1" value={l.qty} onChange={v=>setLines(ls=>ls.map((x,idx)=>idx===i?{...x,qty:Math.max(1,Number(v)||1)}:x))}/><Input type="number" min="0" value={l.price} onChange={v=>setLines(ls=>ls.map((x,idx)=>idx===i?{...x,price:num(v)}:x))}/><b><Money value={l.qty*l.price}/></b></div>)}<div className="total-row"><span>Jami</span><b><Money value={total}/></b></div></div>}
    {error&&<div className="inline-alert danger"><AlertTriangle/><span>{error}</span></div>}
  </Modal>
}

function ReturnModal({state,onClose,onSave}){
  const [supplierId,setSupplier]=useState(state.suppliers[0]?.id||'')
  const supplierPurchases=state.purchases.filter(p=>p.supplierId===supplierId&&p.receiptStatus!=='Kutilmoqda')
  const [purchaseId,setPurchase]=useState(supplierPurchases[0]?.id||'')
  const purchase=state.purchases.find(p=>p.id===purchaseId)
  const products=(purchase?.items||[]).map(i=>({line:i,product:state.products.find(p=>p.id===i.productId)})).filter(x=>x.product)
  const [productId,setProduct]=useState(products[0]?.product.id||'')
  const [qty,setQty]=useState(1),[reason,setReason]=useState('Brak'),[error,setError]=useState('')
  const warehouseId=purchase?.warehouseId||state.settings.defaultWarehouseId
  const stock=stockFor(state,warehouseId,productId)
  const resetPurchase=id=>{setPurchase(id);const pur=state.purchases.find(p=>p.id===id);setProduct(pur?.items?.[0]?.productId||'');setQty(1)}
  const submit=()=>{const amount=num(qty);if(!purchaseId||!productId)return setError('Xarid va mahsulot tanlang.');if(amount<=0)return setError('Qaytarish miqdorini kiriting.');if(amount>stock)return setError(`Tanlangan omborda faqat ${stock} birlik mavjud.`);onSave({supplierId,purchaseId,productId,qty:amount,reason,warehouseId})}
  return <Modal open onClose={onClose} title="Supplierga qaytarish" eyebrow="RETURN TO SUPPLIER" subtitle="Faqat tanlangan xaridda qabul qilingan mahsulotlardan va ombordagi mavjud qoldiqdan qaytarish mumkin." size="lg" footer={<><button className="secondary-glass-btn" onClick={onClose}>Bekor</button><button className="danger-glass-btn" onClick={submit}><Undo2/> Qaytarish</button></>}>
    <div className="form-grid two">
      <Field label="Supplier"><Select value={supplierId} onChange={v=>{setSupplier(v);const pur=state.purchases.find(p=>p.supplierId===v&&p.receiptStatus!=='Kutilmoqda');resetPurchase(pur?.id||'')}}>{state.suppliers.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</Select></Field>
      <Field label="Xarid"><Select value={purchaseId} onChange={resetPurchase}><option value="">Tanlang</option>{supplierPurchases.map(p=><option value={p.id} key={p.id}>{p.id} · {p.date}</option>)}</Select></Field>
      <Field label="Mahsulot"><Select value={productId} onChange={v=>{setProduct(v);setQty(1)}}><option value="">Tanlang</option>{products.map(({product})=><option value={product.id} key={product.id}>{product.name}</option>)}</Select></Field>
      <Field label="Ombor"><Input value={whName(state,warehouseId)} readOnly/></Field>
      <Field label="Mavjud qoldiq"><Input value={`${stock} birlik`} readOnly/></Field>
      <Field label="Qaytarish miqdori"><Input type="number" min="1" max={stock} value={qty} onChange={setQty}/></Field>
      <Field label="Sabab"><Select value={reason} onChange={setReason}><option>Brak</option><option>Noto‘g‘ri mahsulot</option><option>Ortiqcha kelgan</option><option>Srok muammosi</option><option>Boshqa</option></Select></Field>
    </div>
    {error&&<div className="inline-alert danger"><AlertTriangle/><span>{error}</span></div>}
  </Modal>
}
