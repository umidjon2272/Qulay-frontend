import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

const AppContext = createContext(null)

const nowDate='05.09.2026'
const nowIso='2026-09-05T12:00:00.000Z'
const id=(p='id')=>`${p}-${Math.random().toString(36).slice(2,9)}-${Date.now().toString(36).slice(-5)}`
const clone=v=>JSON.parse(JSON.stringify(v))
const money=n=>Number(n||0)
const clockMinutes=t=>{if(!t)return 0;const [h,m]=String(t).split(':').map(Number);return (h||0)*60+(m||0)}
const parseLocalDate=value=>{const v=String(value||'').trim();if(!v)return null;if(/^\d{2}\.\d{2}\.\d{4}$/.test(v)){const [d,m,y]=v.split('.').map(Number);return new Date(y,m-1,d)}if(/^\d{4}-\d{2}-\d{2}$/.test(v)){const [y,m,d]=v.split('-').map(Number);return new Date(y,m-1,d)}const x=new Date(v);return Number.isNaN(x.getTime())?null:x}
const ageDays=value=>{const d=parseLocalDate(value);if(!d)return 0;const now=new Date();const today=new Date(now.getFullYear(),now.getMonth(),now.getDate());return Math.max(0,Math.floor((today-d)/86400000))}
const actorName=s=>s.employees?.find(e=>e.id===s.settings?.currentEmployeeId)?.name||'User'

export function hasRolePermission(role,module,action='view'){
  if(!role)return false
  const permissions=role.permissions||{}
  if(permissions.all===true)return true
  const raw=permissions[module]
  if(raw===true)return true
  if(raw===false||raw==null)return false
  if(typeof raw==='string'){
    if(action==='view')return ['read','limited','receiving','shift','true'].includes(raw)||raw.length>0
    if(raw==='receiving')return ['view','create','edit','approve'].includes(action)
    if(raw==='limited')return ['view','create','print'].includes(action)
    if(raw==='read')return action==='view'
    return false
  }
  if(typeof raw==='object')return raw[action]===true||(action==='view'&&raw.view===true)
  return false
}

const seed = {
  meta:{version:'3.0.0-final',seededAt:nowIso},
  company:{name:'ZENIX Savdo',legalName:'ZENIX Business',phone:'+998 90 000 00 00',email:'info@zenix.uz',taxId:'',address:'Toshkent, O‘zbekiston',website:'',businessType:'Savdo',status:'Faol'},
  branches:[
    {id:'b1',name:'Asosiy filial',code:'ASO',address:'Toshkent',phone:'+998 90 100 00 01',manager:'Umid',workStart:'09:00',workEnd:'20:00',defaultWarehouseId:'w1',defaultRegisterId:'r1',defaultPriceType:'retail',status:'Faol'},
  ],
  warehouses:[
    {id:'w1',name:'Asosiy ombor',code:'OMB-01',branchId:'b1',type:'Asosiy',responsible:'Akmal',address:'Toshkent',status:'Faol',negativeStock:false,reservation:true,expiryTracking:true},
    {id:'w2',name:'Savdo zali',code:'OMB-02',branchId:'b1',type:'Savdo zali',responsible:'Sardor',address:'Toshkent',status:'Faol',negativeStock:false,reservation:true,expiryTracking:false},
  ],
  warehouseStocks:[
    {warehouseId:'w1',productId:'p1',qty:180,reserved:8},{warehouseId:'w2',productId:'p1',qty:14,reserved:0},
    {warehouseId:'w1',productId:'p2',qty:40,reserved:3},{warehouseId:'w2',productId:'p2',qty:3,reserved:0},
    {warehouseId:'w1',productId:'p3',qty:230,reserved:10},{warehouseId:'w2',productId:'p3',qty:15,reserved:0},
    {warehouseId:'w1',productId:'p4',qty:30,reserved:1},{warehouseId:'w2',productId:'p4',qty:2,reserved:0},
    {warehouseId:'w1',productId:'p5',qty:400,reserved:25},{warehouseId:'w2',productId:'p5',qty:20,reserved:0},
    {warehouseId:'w1',productId:'p6',qty:65,reserved:4},{warehouseId:'w2',productId:'p6',qty:5,reserved:0},
  ],
  registers:[
    {id:'r1',name:'Kassa 1',code:'K01',branchId:'b1',currency:'UZS',balance:2300000,responsible:'Sardor',status:'Faol'},
    {id:'r2',name:'Kassa 2',code:'K02',branchId:'b1',currency:'UZS',balance:850000,responsible:'Umid',status:'Faol'},
  ],
  accounts:[
    {id:'a1',name:'Asosiy bank',type:'Bank',provider:'Kapitalbank',currency:'UZS',balance:21650000,branchId:'b1',status:'Faol'},
    {id:'a2',name:'QR hisob',type:'Elektron',provider:'QR',currency:'UZS',balance:1450000,branchId:'b1',status:'Faol'},
  ],
  paymentMethods:[
    {id:'pm1',name:'Naqd',type:'cash',enabled:true,posVisible:true,accountType:'register'},
    {id:'pm2',name:'Karta',type:'card',enabled:true,posVisible:true,accountId:'a1'},
    {id:'pm3',name:'QR',type:'qr',enabled:true,posVisible:true,accountId:'a2'},
    {id:'pm4',name:'Nasiya',type:'credit',enabled:true,posVisible:true},
  ],
  categories:[
    {id:'cat1',name:'Ichimliklar',parentId:''},{id:'cat2',name:'Qahva',parentId:'cat5'},
    {id:'cat3',name:'Elektronika',parentId:''},{id:'cat4',name:'Meva',parentId:'cat5'},
    {id:'cat5',name:'Oziq-ovqat',parentId:''}
  ],
  brands:['Coca-Cola','Pepsi','Nestle','Samsung','Mahalliy','Universal'],
  units:['dona','kg','litr','qop','quti','metr'],
  priceTypes:[
    {id:'retail',name:'Chakana',status:'Faol'},{id:'wholesale',name:'Ulgurji',status:'Faol'},
    {id:'vip',name:'VIP',status:'Faol'},{id:'promo',name:'Promo',status:'Faol'}
  ],
  products:[
    {id:'p1',name:'Coca-Cola 1.5L',category:'Ichimliklar',brand:'Coca-Cola',unit:'dona',sku:'PRD-0001',barcode:'544900000001',cost:9000,price:13000,wholesale:11800,vip:12000,promo:12500,stock:194,reserved:8,minStock:30,warehouseId:'w1',trackExpiry:true,expiry:'2026-11-15',active:true,image:''},
    {id:'p2',name:'Pepsi 1.5L',category:'Ichimliklar',brand:'Pepsi',unit:'dona',sku:'PRD-0002',barcode:'544900000002',cost:8500,price:12000,wholesale:10800,vip:11200,promo:11500,stock:43,reserved:3,minStock:50,warehouseId:'w1',trackExpiry:true,expiry:'2026-12-10',active:true,image:''},
    {id:'p3',name:'Nestle Nescafe 3in1',category:'Qahva',brand:'Nestle',unit:'dona',sku:'PRD-0003',barcode:'544900000003',cost:3200,price:4500,wholesale:4100,vip:4200,promo:4300,stock:245,reserved:10,minStock:50,warehouseId:'w1',trackExpiry:true,expiry:'2027-01-05',active:true,image:''},
    {id:'p4',name:'Samsung A15',category:'Elektronika',brand:'Samsung',unit:'dona',sku:'PRD-0004',barcode:'880000000004',cost:1650000,price:1990000,wholesale:1880000,vip:1920000,promo:1950000,stock:32,reserved:1,minStock:5,warehouseId:'w1',trackExpiry:false,expiry:'',active:true,image:''},
    {id:'p5',name:'Olma (kg)',category:'Meva',brand:'Mahalliy',unit:'kg',sku:'PRD-0005',barcode:'290000000005',cost:9000,price:13000,wholesale:11500,vip:12000,promo:12500,stock:420,reserved:25,minStock:60,warehouseId:'w1',trackExpiry:true,expiry:'2026-09-12',active:true,image:''},
    {id:'p6',name:'Universal un 50kg',category:'Oziq-ovqat',brand:'Universal',unit:'qop',sku:'PRD-0006',barcode:'290000000006',cost:112000,price:128000,wholesale:120000,vip:123000,promo:125000,stock:70,reserved:4,minStock:20,warehouseId:'w1',trackExpiry:true,expiry:'2027-02-18',active:true,image:''},
  ],
  customerGroups:[
    {id:'g1',name:'Oddiy',priceType:'retail',bonusRate:1,creditLimit:1000000,dueDays:7,discount:0,status:'Faol'},
    {id:'g2',name:'Doimiy',priceType:'retail',bonusRate:3,creditLimit:3000000,dueDays:15,discount:2,status:'Faol'},
    {id:'g3',name:'VIP',priceType:'vip',bonusRate:5,creditLimit:10000000,dueDays:30,discount:3,status:'Faol'},
    {id:'g4',name:'Ulgurji',priceType:'wholesale',bonusRate:1,creditLimit:20000000,dueDays:30,discount:0,status:'Faol'},
  ],
  customers:[
    {id:'c1',name:'Azizbek M.',phone:'+998 90 111 22 33',type:'Jismoniy',group:'VIP',priceType:'vip',bonusBalance:84000,bonusEnabled:true,earnBonus:true,bonusRate:5,debt:0,creditLimit:10000000,total:18400000,lastPurchase:'05.09.2026',status:'Faol',note:''},
    {id:'c2',name:'Baraka savdo',phone:'+998 91 444 55 66',type:'Kompaniya',group:'Ulgurji',priceType:'wholesale',bonusBalance:32000,bonusEnabled:true,earnBonus:false,bonusRate:1,debt:2300000,creditLimit:20000000,total:35200000,lastPurchase:'05.09.2026',status:'Faol',note:''},
    {id:'c3',name:'Dilshod A.',phone:'+998 93 777 88 99',type:'Jismoniy',group:'Oddiy',priceType:'retail',bonusBalance:15000,bonusEnabled:true,earnBonus:true,bonusRate:1,debt:800000,creditLimit:1000000,total:7300000,lastPurchase:'05.09.2026',status:'Faol',note:''},
  ],
  customerDebts:[
    {id:'cd1',customerId:'c2',source:'S-1039',amount:2300000,paid:0,dueDate:'15.09.2026',status:'Faol',createdAt:'05.09.2026',note:'Nasiya savdo'},
    {id:'cd2',customerId:'c3',source:'MANUAL',amount:800000,paid:0,dueDate:'12.09.2026',status:'Faol',createdAt:'04.09.2026',note:'Qo‘lda qo‘shilgan'},
  ],
  bonusTransactions:[
    {id:'bt1',customerId:'c1',type:'Earned',amount:25000,date:'05.09.2026',reason:'Savdo S-1042',user:'Umid'},
    {id:'bt2',customerId:'c2',type:'Manual Add',amount:10000,date:'03.09.2026',reason:'Loyalty kampaniya',user:'Umid'},
  ],
  suppliers:[
    {id:'s1',name:'Makro Distribution',contact:'Javohir',phone:'+998 90 123 45 67',email:'sales@makro.uz',taxId:'309001122',address:'Toshkent',currency:'UZS',paymentTerms:'30 kun',dueDays:30,creditLimit:30000000,leadTime:2,minimumOrder:1000000,defaultWarehouseId:'w1',status:'Faol',note:''},
    {id:'s2',name:'Baraka Trade',contact:'Sanjar',phone:'+998 93 765 43 21',email:'baraka@example.uz',taxId:'309009988',address:'Toshkent',currency:'UZS',paymentTerms:'15 kun',dueDays:15,creditLimit:15000000,leadTime:3,minimumOrder:500000,defaultWarehouseId:'w1',status:'Faol',note:''},
  ],
  supplierProducts:[
    {id:'sp1',supplierId:'s1',productId:'p1',supplierSku:'MK-COLA15',supplierBarcode:'',purchasePrice:8800,moq:24,pack:'quti 12',leadTime:2,currency:'UZS',primary:true,status:'Faol'},
    {id:'sp2',supplierId:'s1',productId:'p2',supplierSku:'MK-PEPSI15',supplierBarcode:'',purchasePrice:8300,moq:24,pack:'quti 12',leadTime:2,currency:'UZS',primary:true,status:'Faol'},
    {id:'sp3',supplierId:'s1',productId:'p3',supplierSku:'MK-NES3',supplierBarcode:'',purchasePrice:3100,moq:50,pack:'blok',leadTime:2,currency:'UZS',primary:true,status:'Faol'},
    {id:'sp4',supplierId:'s2',productId:'p1',supplierSku:'BR-COLA',supplierBarcode:'',purchasePrice:8700,moq:48,pack:'quti 12',leadTime:4,currency:'UZS',primary:false,status:'Faol'},
    {id:'sp5',supplierId:'s2',productId:'p5',supplierSku:'BR-OLMA',supplierBarcode:'',purchasePrice:8500,moq:20,pack:'kg',leadTime:1,currency:'UZS',primary:true,status:'Faol'},
  ],
  supplierDebts:[
    {id:'sd1',supplierId:'s1',source:'PUR-102',amount:7000000,paid:0,dueDate:'20.09.2026',status:'Faol',createdAt:'05.09.2026'},
    {id:'sd2',supplierId:'s2',source:'PUR-101',amount:3500000,paid:0,dueDate:'14.09.2026',status:'Faol',createdAt:'04.09.2026'},
  ],
  supplierDocuments:[
    {id:'doc1',supplierId:'s1',type:'Shartnoma',name:'2026-yil shartnoma',reference:'SH-001',date:'01.01.2026',expiry:'31.12.2026',status:'Faol'},
  ],
  sales:[
    {id:'S-1042',customerId:'c1',customer:'Azizbek M.',amount:1250000,discount:0,payments:[{method:'Naqd',amount:1250000,received:1300000}],payment:'Naqd',time:'14:32',date:'05.09.2026',status:'Bajarildi',cashier:'Umid',registerId:'r1',items:[{productId:'p1',name:'Coca-Cola 1.5L',qty:2,price:13000},{productId:'p3',name:'Nestle Nescafe 3in1',qty:3,price:4500}]},
    {id:'S-1041',customerId:'c2',customer:'Baraka savdo',amount:3450000,discount:0,payments:[{method:'Karta',amount:3450000}],payment:'Karta',time:'13:18',date:'05.09.2026',status:'Bajarildi',cashier:'Sardor',registerId:'r1',items:[{productId:'p4',name:'Samsung A15',qty:1,price:1990000}]},
    {id:'S-1040',customerId:'c3',customer:'Dilshod A.',amount:980000,discount:0,payments:[{method:'Naqd',amount:980000,received:1000000}],payment:'Naqd',time:'11:45',date:'05.09.2026',status:'Bajarildi',cashier:'Umid',registerId:'r1',items:[{productId:'p5',name:'Olma (kg)',qty:10,price:13000}]},
    {id:'S-1039',customerId:'c2',customer:'Baraka savdo',amount:2120000,discount:0,payments:[{method:'Nasiya',amount:2120000}],payment:'Nasiya',time:'10:21',date:'05.09.2026',status:'Nasiya',cashier:'Sardor',registerId:'r1',items:[{productId:'p6',name:'Universal un 50kg',qty:8,price:128000}]},
  ],
  salesReturns:[{id:'RET-021',saleId:'S-1033',customer:'Sardor',amount:185000,reason:'Mahsulot mos kelmadi',date:'05.09.2026',time:'09:45',status:'Yakunlandi'}],
  savedCarts:[],
  purchases:[
    {id:'PUR-102',supplierId:'s1',supplier:'Makro Distribution',amount:1300000,status:'Qabul qilindi',date:'05.09.2026',warehouseId:'w1',paymentStatus:'Qisman',receiptStatus:'Qabul qilindi',items:[{productId:'p1',qty:100,price:8800},{productId:'p2',qty:40,price:8300}]},
    {id:'PUR-101',supplierId:'s2',supplier:'Baraka Trade',amount:2250000,status:'Kutilmoqda',date:'04.09.2026',warehouseId:'w1',paymentStatus:'To‘lanmagan',receiptStatus:'Kutilmoqda',items:[{productId:'p5',qty:200,price:8500}]},
  ],
  supplierReturns:[{id:'SRET-01',supplierId:'s1',purchaseId:'PUR-102',productId:'p1',qty:2,amount:17600,reason:'Brak',status:'Yakunlandi',date:'05.09.2026'}],
  inventoryMoves:[
    {id:'m1',type:'Kirim',productId:'p1',product:'Coca-Cola 1.5L',qty:100,warehouseId:'w1',source:'PUR-102',time:'10:22',date:'05.09.2026',user:'Akmal'},
    {id:'m2',type:'Sotuv',productId:'p2',product:'Pepsi 1.5L',qty:-2,warehouseId:'w1',source:'S-1042',time:'11:10',date:'05.09.2026',user:'Umid'},
  ],
  transfers:[{id:'TR-001',from:'w1',to:'w2',productId:'p1',qty:12,status:'Yakunlandi',date:'04.09.2026'}],
  inventoryCounts:[{id:'INV-001',warehouseId:'w1',date:'01.09.2026',responsible:'Akmal',status:'Yakunlandi',progress:100,difference:0}],
  financeTransactions:[
    {id:'FT-001',date:'05.09.2026',time:'14:32',type:'Kirim',category:'Savdo',counterparty:'Azizbek M.',account:'Kassa 1',method:'Naqd',amount:1250000,source:'S-1042',user:'Umid',status:'Completed'},
    {id:'FT-002',date:'05.09.2026',time:'13:18',type:'Kirim',category:'Savdo',counterparty:'Baraka savdo',account:'Asosiy bank',method:'Karta',amount:3450000,source:'S-1041',user:'Sardor',status:'Completed'},
    {id:'FT-003',date:'05.09.2026',time:'09:30',type:'Chiqim',category:'Transport',counterparty:'Logistika',account:'Kassa 1',method:'Naqd',amount:350000,source:'EXP-003',user:'Umid',status:'Completed'},
  ],
  expenseCategories:['Ijara','Maosh','Reklama','Transport','Kommunal','Soliq','Bank komissiyasi','Boshqa'],
  roles:[
    {id:'role-admin',name:'Administrator',preset:true,permissions:{all:true},scope:'all'},
    {id:'role-manager',name:'Manager',preset:true,permissions:{sales:true,products:true,warehouse:true,purchases:true,customers:true,suppliers:true,finance:true,reports:true,employees:'read'},scope:'branch'},
    {id:'role-cashier',name:'Kassir',preset:true,permissions:{pos:true,sales:true,customers:'limited',bonus:'read',returns:'limited',shift:true},scope:'register'},
    {id:'role-warehouse',name:'Omborchi',preset:true,permissions:{warehouse:true,products:'read',inventory:true,transfer:true,purchases:'receiving'},scope:'warehouse'},
  ],
  employees:[
    {id:'e1',name:'Umid',phone:'+998 90 000 11 22',login:'umid',roleId:'role-admin',role:'Administrator',branchId:'b1',warehouseId:'w1',registerId:'r2',position:'Administrator',sales:12450000,shift:'Ishda',salaryType:'Oylik + foiz',baseSalary:6000000,commission:1,status:'Faol',lastActivity:'17:10'},
    {id:'e2',name:'Sardor',phone:'+998 90 000 22 33',login:'sardor',roleId:'role-cashier',role:'Kassir',branchId:'b1',warehouseId:'w2',registerId:'r1',position:'Kassir',sales:8200000,shift:'Ishda',salaryType:'Savdodan 2%',baseSalary:0,commission:2,status:'Faol',lastActivity:'17:06'},
    {id:'e3',name:'Akmal',phone:'+998 90 000 33 44',login:'akmal',roleId:'role-warehouse',role:'Omborchi',branchId:'b1',warehouseId:'w1',registerId:'',position:'Omborchi',sales:0,shift:'Ishda',salaryType:'Oylik',baseSalary:4500000,commission:0,status:'Faol',lastActivity:'16:48'},
  ],
  shifts:[
    {id:'sh1',employeeId:'e2',employee:'Sardor',registerId:'r1',register:'Kassa 1',branchId:'b1',openedAt:'09:04',scheduledStart:'09:00',openingCash:500000,sales:8200000,cashIn:0,cashOut:0,refunds:0,expectedCash:2730000,actualCash:null,difference:null,status:'Ochiq'},
  ],
  attendance:[
    {id:'at1',employeeId:'e1',date:'05.09.2026',checkIn:'08:58',checkOut:'',scheduledStart:'09:00',scheduledEnd:'18:00',status:'Ishda'},
    {id:'at2',employeeId:'e2',date:'05.09.2026',checkIn:'09:04',checkOut:'',scheduledStart:'09:00',scheduledEnd:'18:00',status:'Kechikdi'},
    {id:'at3',employeeId:'e3',date:'05.09.2026',checkIn:'09:00',checkOut:'',scheduledStart:'09:00',scheduledEnd:'18:00',status:'Ishda'},
  ],
  payroll:[
    {id:'pay1',employeeId:'e1',employee:'Umid',period:'Sentabr 2026',base:6000000,commission:124500,bonus:250000,deduction:0,total:6374500,status:'Qoralama'},
    {id:'pay2',employeeId:'e2',employee:'Sardor',period:'Sentabr 2026',base:0,commission:164000,bonus:100000,deduction:0,total:264000,status:'Qoralama'},
  ],
  activity:[
    {id:'act1',date:'05.09.2026',time:'17:06',employee:'Sardor',module:'Savdo',action:'Savdo yaratdi',entity:'S-1041',severity:'info',reason:''},
    {id:'act2',date:'05.09.2026',time:'16:48',employee:'Akmal',module:'Ombor',action:'Kirim qildi',entity:'PUR-102',severity:'info',reason:''},
  ],
  notifications:[
    {id:'n1',type:'stock',title:'Pepsi 1.5L kam qoldi',text:'43 dona qoldi, minimum 50 dona.',severity:'warning',read:false,date:'05.09.2026'},
    {id:'n2',type:'shift',title:'Sardor smenani kech ochdi',text:'4 daqiqa kechikish.',severity:'info',read:false,date:'05.09.2026'},
  ],
  settings:{
    currentEmployeeId:'e1',accent:'#4D8DFF',theme:'light',background:'ocean-blue',radius:22,font:'Inter',fontSize:'standard',density:'comfortable',glass:72,blur:24,animations:true,sidebarDensity:'standard',tableDensity:'standard',companyName:'ZENIX Savdo',language:'UZ',currency:'UZS',timezone:'Asia/Tashkent',dateFormat:'DD.MM.YYYY',timeFormat:'24',defaultBranchId:'b1',defaultWarehouseId:'w1',defaultRegisterId:'r1',
    pos:{defaultCustomer:'Chakana mijoz',defaultPriceType:'retail',splitPayment:true,creditEnabled:true,bonusEnabled:true,bonusMaxPercent:30,customerRequired:false,maxCashierDiscount:10,managerDiscountThreshold:10,floorPrice:true,manualPrice:true,saveCart:true,unknownBarcode:'create',autoFocus:true,fullscreen:false,returnDays:14,receiptRequired:false,shiftRequired:true,openingCashRequired:true,lateAlertMinutes:5,earlyCloseApproval:true,autoPrint:false,receiptWidth:'80',shortcuts:true,rounding:1},
    finance:{multiCurrency:true,customerDueDays:15,supplierDueDays:30,partialPayment:true,advance:true,reconciliation:true,monthClose:false,attachmentThreshold:5000000},
    product:{skuAuto:true,skuPrefix:'PRD-',barcodeAuto:true,barcodeType:'EAN-13',duplicateBarcodeBlock:true,defaultUnit:'dona',defaultWarehouseId:'w1',minStockDefault:10,negativeStock:false,batchTracking:false,expiryTracking:true,serialTracking:false,imageRequired:false},
    purchase:{approval:true,approvalThreshold:5000000,defaultWarehouseId:'w1',partialReceipt:true,overReceiptTolerance:5,duplicateInvoiceBlock:true,priceVarianceWarning:10,attachmentRequired:false},
    customer:{defaultGroup:'Oddiy',phoneRequired:true,duplicatePhoneBlock:true,defaultPriceType:'retail',creditLimit:1000000,dueDays:15,loyaltyEnabled:true,bonusRate:1,bonusMaxPercent:30,bonusExpiryDays:365,manualBonusPermission:'manager',manualDebtPermission:'manager'},
    employee:{firstLoginPasswordChange:true,lateThreshold:5,earlyCloseApproval:true,individualOverride:true},
    notifications:{lowStock:true,outOfStock:true,expiry:true,customerOverdue:true,supplierOverdue:true,purchaseDelay:true,priceIncrease:true,inventoryDiff:true,shiftLate:true,shiftEarly:true,cashDiff:true,largeDiscount:true,refundSpike:true,failedPayment:true,contractExpiry:true,suspicious:true,digest:'immediate',quietHours:false},
    ai:{enabled:true,mode:'action',confirmActions:true,sales:true,finance:true,warehouse:true,debt:true,employees:true,reorder:true},
  },
  aiCredits:20
}

function hydrate(raw){
  const base=clone(seed)
  if(!raw) return base
  try{
    const parsed=JSON.parse(raw)
    if(parsed?.meta?.version==='3.0.0-final') return {...base,...parsed,settings:{...base.settings,...parsed.settings,pos:{...base.settings.pos,...parsed.settings?.pos},finance:{...base.settings.finance,...parsed.settings?.finance},product:{...base.settings.product,...parsed.settings?.product},purchase:{...base.settings.purchase,...parsed.settings?.purchase},customer:{...base.settings.customer,...parsed.settings?.customer},employee:{...base.settings.employee,...parsed.settings?.employee},notifications:{...base.settings.notifications,...parsed.settings?.notifications},ai:{...base.settings.ai,...parsed.settings?.ai}}}
  }catch{}
  return base
}

export function AppProvider({children}){
  const [state,setState]=useState(()=>hydrate(localStorage.getItem('zenix-final-state')))
  useEffect(()=>localStorage.setItem('zenix-final-state',JSON.stringify(state)),[state])

  const activity=(s,action,module='Tizim',entity='',severity='info',reason='')=>({...s,activity:[{id:id('act'),date:new Date().toLocaleDateString('uz-UZ'),time:new Date().toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'}),employee:(s.employees.find(e=>e.id===s.settings?.currentEmployeeId)?.name||'Umid'),module,action,entity,severity,reason},...s.activity].slice(0,500)})
  const nextSku=products=>`${state.settings.product.skuPrefix||'PRD-'}${String(products.length+1).padStart(4,'0')}`
  const internalBarcode=()=>`290${String(Date.now()).slice(-10)}`.slice(0,13)
  const stockKey=(warehouseId,productId)=>`${warehouseId}::${productId}`
  const getWarehouseStock=(s,warehouseId,productId)=>s.warehouseStocks.find(x=>x.warehouseId===warehouseId&&x.productId===productId)||{warehouseId,productId,qty:0,reserved:0}
  const setWarehouseQty=(stocks,warehouseId,productId,qty,reserved)=>{const next=[...stocks];const idx=next.findIndex(x=>x.warehouseId===warehouseId&&x.productId===productId);const prev=idx>=0?next[idx]:{warehouseId,productId,qty:0,reserved:0};const row={...prev,qty:Math.max(0,+qty||0),reserved:Math.max(0,reserved===undefined?prev.reserved:+reserved||0)};if(idx>=0)next[idx]=row;else next.push(row);return next}
  const changeWarehouseQty=(stocks,warehouseId,productId,delta)=>{const row=stocks.find(x=>x.warehouseId===warehouseId&&x.productId===productId);return setWarehouseQty(stocks,warehouseId,productId,(row?.qty||0)+(+delta||0),row?.reserved||0)}
  const syncProductStock=(products,warehouseStocks)=>products.map(p=>{const rows=warehouseStocks.filter(x=>x.productId===p.id);return {...p,stock:rows.reduce((a,x)=>a+(+x.qty||0),0),reserved:rows.reduce((a,x)=>a+(+x.reserved||0),0)}})
  const dueDateAfter=(days)=>{const d=new Date();d.setDate(d.getDate()+(+days||0));return d.toLocaleDateString('uz-UZ')}
  const normalizeDateDisplay=value=>{if(!value)return '';if(/^\d{4}-\d{2}-\d{2}$/.test(value)){const [y,m,d]=value.split('-');return `${d}.${m}.${y}`}return value}
  const changeRegisterBalance=(registers,registerId,delta)=>registers.map(r=>r.id===registerId?{...r,balance:(+r.balance||0)+(+delta||0)}:r)
  const changeAccountBalance=(accounts,accountId,delta)=>accounts.map(a=>a.id===accountId?{...a,balance:(+a.balance||0)+(+delta||0)}:a)
  const changeBalanceByName=(s,name,delta)=>{const register=s.registers.find(r=>r.name===name);if(register)return {registers:changeRegisterBalance(s.registers,register.id,delta),accounts:s.accounts};const account=s.accounts.find(a=>a.name===name);if(account)return {registers:s.registers,accounts:changeAccountBalance(s.accounts,account.id,delta)};return {registers:s.registers,accounts:s.accounts}}

  const addProduct=payload=>{let created=null;setState(s=>{const normalizedName=(payload.name||'').trim().toLowerCase();const duplicate=s.products.find(p=>(payload.barcode&&p.barcode===payload.barcode)||(normalizedName&&p.name.trim().toLowerCase()===normalizedName));if(duplicate){created=duplicate;return s}const warehouseId=payload.warehouseId||s.settings.product.defaultWarehouseId||s.settings.defaultWarehouseId;created={id:id('p'),sku:payload.sku||`${s.settings.product.skuPrefix||'PRD-'}${String(s.products.length+1).padStart(4,'0')}`,barcode:payload.barcode||internalBarcode(),active:true,reserved:0,wholesale:payload.wholesale||payload.price,vip:payload.vip||payload.price,promo:payload.promo||payload.price,...payload,warehouseId,stock:+payload.stock||0,cost:+payload.cost||0,price:+payload.price||0,minStock:+payload.minStock||s.settings.product.minStockDefault};let warehouseStocks=s.warehouseStocks;if(created.stock>0)warehouseStocks=setWarehouseQty(warehouseStocks,warehouseId,created.id,created.stock,0);const products=syncProductStock([created,...s.products],warehouseStocks);return activity({...s,products,warehouseStocks},'Mahsulot yaratdi','Mahsulotlar',created.sku)});return created}
  const updateProduct=(productId,patch)=>setState(s=>activity({...s,products:s.products.map(p=>p.id===productId?{...p,...patch}:p)},'Mahsulotni tahrirladi','Mahsulotlar',productId))
  const archiveProduct=productId=>updateProduct(productId,{active:false})
  const bulkUpdateProducts=(ids,patch)=>setState(s=>activity({...s,products:s.products.map(p=>ids.includes(p.id)?{...p,...patch}:p)},`${ids.length} ta mahsulot bulk yangilandi`,'Mahsulotlar'))
  const addCategory=(name,parentId='')=>setState(s=>({...s,categories:[...s.categories,{id:id('cat'),name,parentId}]}))
  const addBrand=name=>setState(s=>s.brands.includes(name)?s:{...s,brands:[...s.brands,name]})
  const addPriceType=name=>setState(s=>({...s,priceTypes:[...s.priceTypes,{id:id('price'),name,status:'Faol'}]}))

  const addWarehouse=payload=>setState(s=>activity({...s,warehouses:[...s.warehouses,{id:id('w'),status:'Faol',negativeStock:false,reservation:true,expiryTracking:false,...payload}]},'Ombor yaratdi','Ombor',payload.name))
  const addBranch=payload=>setState(s=>activity({...s,branches:[...s.branches,{id:id('b'),status:'Faol',...payload}]},'Filial yaratdi','Sozlamalar',payload.name))
  const quickInbound=({warehouseId,items,reason='Tezkor kirim'})=>setState(s=>{if(!warehouseId||!items?.length)return s;let warehouseStocks=s.warehouseStocks;const valid=items.filter(x=>x.productId&&+x.qty>0);for(const x of valid)warehouseStocks=changeWarehouseQty(warehouseStocks,warehouseId,x.productId,+x.qty);const products=syncProductStock(s.products,warehouseStocks);const date=new Date().toLocaleDateString('uz-UZ'),time=new Date().toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'});const moves=[...valid.map(x=>{const p=s.products.find(p=>p.id===x.productId);return {id:id('m'),type:'Kirim',productId:x.productId,product:p?.name||'',qty:+x.qty,warehouseId,source:'MANUAL',time,date,user:actorName(s),reason}}),...s.inventoryMoves];return activity({...s,warehouseStocks,products,inventoryMoves:moves},'Tezkor kirim','Ombor',warehouseId)})
  const transferStock=({from,to,productId,qty})=>setState(s=>{const amount=+qty||0;if(!from||!to||from===to||!productId||amount<=0)return s;const source=getWarehouseStock(s,from,productId);const available=Math.max(0,(source.qty||0)-(source.reserved||0));if(available<amount)return s;let warehouseStocks=changeWarehouseQty(s.warehouseStocks,from,productId,-amount);warehouseStocks=changeWarehouseQty(warehouseStocks,to,productId,amount);const products=syncProductStock(s.products,warehouseStocks);const tr={id:`TR-${String(s.transfers.length+1).padStart(3,'0')}`,from,to,productId,qty:amount,status:'Yakunlandi',date:new Date().toLocaleDateString('uz-UZ')};const product=s.products.find(x=>x.id===productId);const time=new Date().toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'});const moves=[{id:id('m'),type:'Transfer chiqim',productId,product:product?.name||'',qty:-amount,warehouseId:from,source:tr.id,time,date:tr.date,user:actorName(s)},{id:id('m'),type:'Transfer kirim',productId,product:product?.name||'',qty:amount,warehouseId:to,source:tr.id,time,date:tr.date,user:actorName(s)},...s.inventoryMoves];return activity({...s,warehouseStocks,products,transfers:[tr,...s.transfers],inventoryMoves:moves},'Omborlar orasida transfer','Ombor',tr.id)})
  const finalizeInventory=({warehouseId,lines,responsible=''})=>setState(s=>{responsible=responsible||actorName(s);if(!warehouseId||!lines?.length)return s;let warehouseStocks=s.warehouseStocks;let difference=0;const date=new Date().toLocaleDateString('uz-UZ'),time=new Date().toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'});const moves=[];for(const line of lines){const before=getWarehouseStock({...s,warehouseStocks},warehouseId,line.productId).qty||0;const actual=Math.max(0,+line.actual||0);const delta=actual-before;difference+=delta;warehouseStocks=setWarehouseQty(warehouseStocks,warehouseId,line.productId,actual);if(delta!==0){const product=s.products.find(p=>p.id===line.productId);moves.push({id:id('m'),type:'Inventarizatsiya',productId:line.productId,product:product?.name||'',qty:delta,warehouseId,source:'INVENTORY',time,date,user:responsible,reason:'Real qoldiq bo‘yicha adjustment'})}}const products=syncProductStock(s.products,warehouseStocks);const inv={id:`INV-${String(s.inventoryCounts.length+1).padStart(3,'0')}`,warehouseId,date,responsible,status:'Yakunlandi',progress:100,difference};return activity({...s,warehouseStocks,products,inventoryMoves:[...moves,...s.inventoryMoves],inventoryCounts:[inv,...s.inventoryCounts]},'Inventarizatsiyani yakunladi','Ombor',inv.id)})

  const addCustomer=payload=>{setState(s=>{if(s.settings.customer.duplicatePhoneBlock&&payload.phone&&s.customers.some(c=>c.phone===payload.phone))return s;const group=s.customerGroups.find(g=>g.name===(payload.group||s.settings.customer.defaultGroup));const c={id:id('c'),type:'Jismoniy',group:group?.name||'Oddiy',priceType:group?.priceType||s.settings.customer.defaultPriceType,bonusBalance:+payload.bonusBalance||0,bonusEnabled:payload.bonusEnabled??s.settings.customer.loyaltyEnabled,earnBonus:payload.earnBonus??true,bonusRate:+payload.bonusRate||group?.bonusRate||s.settings.customer.bonusRate,debt:0,creditLimit:+payload.creditLimit||group?.creditLimit||s.settings.customer.creditLimit,total:0,lastPurchase:'',status:'Faol',note:'',...payload};return activity({...s,customers:[c,...s.customers]},'Mijoz yaratdi','Mijozlar',c.name)})}
  const updateCustomer=(customerId,patch)=>setState(s=>activity({...s,customers:s.customers.map(c=>c.id===customerId?{...c,...patch}:c)},'Mijozni tahrirladi','Mijozlar',customerId))
  const adjustBonus=({customerId,amount,type='add',reason=''})=>setState(s=>{const delta=(type==='deduct'?-1:1)*Math.abs(+amount||0);const customers=s.customers.map(c=>c.id===customerId?{...c,bonusBalance:Math.max(0,c.bonusBalance+delta)}:c);const tx={id:id('bt'),customerId,type:type==='deduct'?'Manual Deduct':'Manual Add',amount:Math.abs(delta),date:new Date().toLocaleDateString('uz-UZ'),reason,user:actorName(s)};return activity({...s,customers,bonusTransactions:[tx,...s.bonusTransactions]},`${type==='deduct'?'Bonus ayirdi':'Bonus qo‘shdi'}`,'Mijozlar',customerId,'info',reason)})
  const addCustomerDebt=({customerId,amount,dueDate,note=''})=>setState(s=>{const c=s.customers.find(x=>x.id===customerId);if(!c||+amount<=0)return s;const d={id:id('cd'),customerId,source:'MANUAL',amount:+amount,paid:0,dueDate:normalizeDateDisplay(dueDate),status:'Faol',createdAt:new Date().toLocaleDateString('uz-UZ'),note};const customers=s.customers.map(x=>x.id===customerId?{...x,debt:x.debt+ +amount}:x);return activity({...s,customers,customerDebts:[d,...s.customerDebts]},'Qarz qo‘shdi','Mijozlar',c.name,'warning',note)})
  const receiveCustomerPayment=({customerId,amount,method='Naqd',account='Kassa 1',note=''})=>setState(s=>{let remaining=+amount||0;if(remaining<=0)return s;const c=s.customers.find(c=>c.id===customerId);if(!c)return s;const debts=s.customerDebts.map(d=>{if(d.customerId!==customerId||remaining<=0||d.amount-d.paid<=0)return d;const apply=Math.min(remaining,d.amount-d.paid);remaining-=apply;const paid=d.paid+apply;return {...d,paid,status:paid>=d.amount?'To‘langan':'Qisman to‘langan'}});const applied=(+amount||0)-remaining;if(applied<=0)return s;const customers=s.customers.map(x=>x.id===customerId?{...x,debt:Math.max(0,x.debt-applied)}:x);const bal=changeBalanceByName(s,account,applied);const date=new Date().toLocaleDateString('uz-UZ'),time=new Date().toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'});const ft={id:id('ft'),date,time,type:'Kirim',category:'Mijoz qarzi to‘lovi',counterparty:c.name,account,method,amount:applied,source:'DEBT',user:actorName(s),status:'Completed',note};const shifts=s.shifts.map(sh=>sh.status==='Ochiq'&&s.registers.find(r=>r.id===sh.registerId)?.name===account&&method==='Naqd'?{...sh,cashIn:(sh.cashIn||0)+applied,expectedCash:(sh.expectedCash||0)+applied}:sh);return activity({...s,...bal,shifts,customerDebts:debts,customers,financeTransactions:[ft,...s.financeTransactions]},'Qarz to‘lovi qabul qilindi','Moliya',c.name)})
  const addCustomerGroup=payload=>setState(s=>({...s,customerGroups:[...s.customerGroups,{id:id('g'),status:'Faol',...payload,bonusRate:+payload.bonusRate||0,creditLimit:+payload.creditLimit||0,dueDays:+payload.dueDays||0,discount:+payload.discount||0}]}))

  const addSupplier=payload=>setState(s=>{if(payload.taxId&&s.suppliers.some(x=>x.taxId===payload.taxId))return s;const sup={id:id('s'),status:'Faol',currency:'UZS',paymentTerms:'30 kun',dueDays:30,leadTime:2,minimumOrder:0,creditLimit:0,...payload};return activity({...s,suppliers:[sup,...s.suppliers]},'Supplier yaratdi','Yetkazib beruvchilar',sup.name)})
  const updateSupplier=(supplierId,patch)=>setState(s=>activity({...s,suppliers:s.suppliers.map(x=>x.id===supplierId?{...x,...patch}:x)},'Supplierni tahrirladi','Yetkazib beruvchilar',supplierId))
  const linkSupplierProduct=payload=>setState(s=>{const exists=s.supplierProducts.some(x=>x.supplierId===payload.supplierId&&x.productId===payload.productId);if(exists)return s;return activity({...s,supplierProducts:[{id:id('sp'),status:'Faol',currency:'UZS',primary:false,...payload,purchasePrice:+payload.purchasePrice||0,moq:+payload.moq||0,leadTime:+payload.leadTime||0},...s.supplierProducts]},'Supplierga mahsulot bog‘ladi','Yetkazib beruvchilar',payload.supplierId)})
  const addSupplierDocument=payload=>setState(s=>({...s,supplierDocuments:[{id:id('doc'),status:'Faol',...payload},...s.supplierDocuments]}))
  const paySupplier=({supplierId,amount,method='Bank',account='Asosiy bank',note=''})=>setState(s=>{let remaining=+amount||0;if(remaining<=0)return s;const sup=s.suppliers.find(x=>x.id===supplierId);if(!sup)return s;const debts=s.supplierDebts.map(d=>{if(d.supplierId!==supplierId||remaining<=0||d.amount-d.paid<=0)return d;const a=Math.min(remaining,d.amount-d.paid);remaining-=a;const paid=d.paid+a;return {...d,paid,status:paid>=d.amount?'To‘langan':'Qisman to‘langan'}});const applied=(+amount||0)-remaining;if(applied<=0)return s;const bal=changeBalanceByName(s,account,-applied);const date=new Date().toLocaleDateString('uz-UZ'),time=new Date().toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'});const ft={id:id('ft'),date,time,type:'Chiqim',category:'Supplier to‘lovi',counterparty:sup.name,account,method,amount:applied,source:'SUPPLIER',user:actorName(s),status:'Completed',note};const shifts=s.shifts.map(sh=>sh.status==='Ochiq'&&s.registers.find(r=>r.id===sh.registerId)?.name===account&&method==='Naqd'?{...sh,cashOut:(sh.cashOut||0)+applied,expectedCash:(sh.expectedCash||0)-applied}:sh);return activity({...s,...bal,shifts,supplierDebts:debts,financeTransactions:[ft,...s.financeTransactions]},'Supplierga to‘lov qildi','Moliya',sup.name)})

  const createPurchase=({supplierId,supplier,items,total,warehouseId='w1',receiveNow=false})=>setState(s=>{const valid=(items||[]).filter(x=>(x.productId||x.id)&&+x.qty>0);if(!valid.length)return s;const sup=s.suppliers.find(x=>x.id===supplierId)||s.suppliers.find(x=>x.name===supplier);const purchaseItems=valid.map(x=>({productId:x.productId||x.id,qty:+x.qty||1,price:+x.price||+x.cost||0}));const purchase={id:`PUR-${100+s.purchases.length+1}`,supplierId:sup?.id||supplierId,supplier:sup?.name||supplier||'Supplier',amount:+total||purchaseItems.reduce((a,x)=>a+(+x.qty||0)*(+x.price||0),0),status:receiveNow?'Qabul qilindi':'Kutilmoqda',date:new Date().toLocaleDateString('uz-UZ'),warehouseId,paymentStatus:'To‘lanmagan',receiptStatus:receiveNow?'Qabul qilindi':'Kutilmoqda',items:purchaseItems,receivedItems:receiveNow?purchaseItems.map(x=>({productId:x.productId,qty:x.qty})):[]};let warehouseStocks=s.warehouseStocks,moves=s.inventoryMoves;if(receiveNow){for(const x of purchase.items)warehouseStocks=changeWarehouseQty(warehouseStocks,warehouseId,x.productId,x.qty);const date=purchase.date,time=new Date().toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'});moves=[...purchase.items.map(x=>({id:id('m'),type:'Kirim',productId:x.productId,product:s.products.find(p=>p.id===x.productId)?.name||'',qty:x.qty,warehouseId,source:purchase.id,time,date,user:actorName(s)})),...moves]}let products=syncProductStock(s.products,warehouseStocks).map(p=>{const row=purchase.items.find(x=>x.productId===p.id);return row?{...p,cost:row.price||p.cost}:p});const debt={id:id('sd'),supplierId:sup?.id||supplierId,source:purchase.id,amount:purchase.amount,paid:0,dueDate:dueDateAfter(sup?.dueDays||s.settings.finance.supplierDueDays),status:'Faol',createdAt:purchase.date};return activity({...s,warehouseStocks,products,inventoryMoves:moves,purchases:[purchase,...s.purchases],supplierDebts:[debt,...s.supplierDebts]},'Xarid yaratdi','Xaridlar',purchase.id)})
  const receivePurchase=(purchaseId,receivedLines)=>setState(s=>{const pur=s.purchases.find(x=>x.id===purchaseId);if(!pur||pur.receiptStatus==='Qabul qilindi')return s;const previous=pur.receivedItems||[];const requested=(receivedLines?.length?receivedLines:pur.items.map(i=>({productId:i.productId,qty:Math.max(0,i.qty-(previous.find(r=>r.productId===i.productId)?.qty||0))}))).filter(x=>+x.qty>0);if(!requested.length)return s;const actual=[];for(const line of requested){const ordered=pur.items.find(i=>i.productId===line.productId)?.qty||0;const already=previous.find(i=>i.productId===line.productId)?.qty||0;const allowed=Math.max(0,ordered-already);const qty=Math.min(allowed,+line.qty||0);if(qty>0)actual.push({productId:line.productId,qty})}if(!actual.length)return s;let warehouseStocks=s.warehouseStocks;for(const x of actual)warehouseStocks=changeWarehouseQty(warehouseStocks,pur.warehouseId,x.productId,x.qty);let products=syncProductStock(s.products,warehouseStocks).map(p=>{const row=pur.items.find(x=>x.productId===p.id);return row?{...p,cost:row.price||p.cost}:p});const merged=pur.items.map(i=>({productId:i.productId,qty:(previous.find(r=>r.productId===i.productId)?.qty||0)+(actual.find(r=>r.productId===i.productId)?.qty||0)}));const complete=pur.items.every(i=>(merged.find(r=>r.productId===i.productId)?.qty||0)>=i.qty);const receiptStatus=complete?'Qabul qilindi':'Qisman qabul';const purchases=s.purchases.map(x=>x.id===purchaseId?{...x,status:receiptStatus,receiptStatus,receivedItems:merged}:x);const date=new Date().toLocaleDateString('uz-UZ'),time=new Date().toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'});const moves=[...actual.map(x=>({id:id('m'),type:'Kirim',productId:x.productId,product:s.products.find(p=>p.id===x.productId)?.name||'',qty:x.qty,warehouseId:pur.warehouseId,source:purchaseId,time,date,user:actorName(s),reason:complete?'Xarid to‘liq qabul':'Xarid qisman qabul'})),...s.inventoryMoves];return activity({...s,warehouseStocks,products,purchases,inventoryMoves:moves},complete?'Xaridni to‘liq qabul qildi':'Xaridni qisman qabul qildi','Xaridlar',purchaseId)})
  const returnToSupplier=({supplierId,purchaseId,productId,qty,reason,warehouseId})=>setState(s=>{const p=s.products.find(x=>x.id===productId);const pur=s.purchases.find(x=>x.id===purchaseId);const wh=warehouseId||pur?.warehouseId||s.settings.defaultWarehouseId;const amountQty=+qty||0;const stock=getWarehouseStock(s,wh,productId);if(!p||amountQty<=0||(stock.qty||0)<amountQty)return s;const link=s.supplierProducts.find(x=>x.supplierId===supplierId&&x.productId===productId);const purchaseLine=pur?.items?.find(x=>x.productId===productId);const amount=(purchaseLine?.price||link?.purchasePrice||p.cost)*amountQty;let warehouseStocks=changeWarehouseQty(s.warehouseStocks,wh,productId,-amountQty);const products=syncProductStock(s.products,warehouseStocks);const r={id:`SRET-${String(s.supplierReturns.length+1).padStart(2,'0')}`,supplierId,purchaseId,productId,warehouseId:wh,qty:amountQty,amount,reason,status:'Yakunlandi',date:new Date().toLocaleDateString('uz-UZ')};let remaining=amount;const supplierDebts=s.supplierDebts.map(d=>{if(d.supplierId!==supplierId||remaining<=0||d.amount-d.paid<=0)return d;const cut=Math.min(remaining,d.amount-d.paid);remaining-=cut;const newAmount=Math.max(d.paid,d.amount-cut);return {...d,amount:newAmount,status:newAmount<=d.paid?'To‘langan':d.paid>0?'Qisman to‘langan':'Faol'}});const time=new Date().toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'});const move={id:id('m'),type:'Supplierga qaytarish',productId,product:p.name,qty:-amountQty,warehouseId:wh,source:r.id,time,date:r.date,user:actorName(s),reason};return activity({...s,warehouseStocks,products,supplierDebts,inventoryMoves:[move,...s.inventoryMoves],supplierReturns:[r,...s.supplierReturns]},'Supplierga qaytarish','Xaridlar',r.id,'warning',reason)})

  const createSale=({items,total,customerId,customer,payments,payment,discount=0,bonusUsed=0,registerId='r1',warehouseId})=>setState(s=>{if(!items?.length)return s;const wh=warehouseId||s.settings.defaultWarehouseId;const sold={};for(const i of items){const pid=i.productId||i.id;sold[pid]=(sold[pid]||0)+(+i.qty||1)}for(const [productId,qty] of Object.entries(sold)){const row=getWarehouseStock(s,wh,productId);const available=Math.max(0,(row.qty||0)-(row.reserved||0));if(available<qty&&!s.settings.product.negativeStock)return s}const normalizedPayments=(payments?.length?payments:[{method:payment||'Naqd',amount:Math.max(0,(+total||0)-(+bonusUsed||0))}]).map(x=>({...x,amount:+x.amount||0})).filter(x=>x.amount>0);const payable=Math.max(0,(+total||0)-(+bonusUsed||0));const allocated=normalizedPayments.reduce((a,x)=>a+x.amount,0);if(Math.abs(allocated-payable)>1)return s;let warehouseStocks=s.warehouseStocks;for(const [productId,qty] of Object.entries(sold))warehouseStocks=changeWarehouseQty(warehouseStocks,wh,productId,-qty);const products=syncProductStock(s.products,warehouseStocks);const saleId=`S-${1043+s.sales.length}`;const c=s.customers.find(x=>x.id===customerId)||s.customers.find(x=>x.name===customer);const creditAmount=normalizedPayments.filter(x=>x.method==='Nasiya').reduce((a,x)=>a+x.amount,0);const paidAmount=normalizedPayments.filter(x=>x.method!=='Nasiya').reduce((a,x)=>a+x.amount,0);const saleDate=new Date().toLocaleDateString('uz-UZ'),saleTime=new Date().toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'});const earnBase=Math.max(0,(+total||0)-(+bonusUsed||0));const earned=c?.bonusEnabled&&c?.earnBonus?Math.round(earnBase*(c.bonusRate||0)/100):0;const sale={id:saleId,customerId:c?.id||'',customer:c?.name||customer||'Chakana mijoz',amount:+total||0,discount:+discount||0,bonusUsed:+bonusUsed||0,bonusEarned:earned,creditAmount,paidAmount,payments:normalizedPayments,payment:normalizedPayments.map(x=>x.method).join(' + '),time:saleTime,date:saleDate,status:creditAmount>0?'Nasiya':'Bajarildi',cashier:actorName(s),registerId,warehouseId:wh,items:items.map(i=>({productId:i.productId||i.id,name:i.name,qty:+i.qty||1,price:+i.price||0}))};let customers=s.customers,customerDebts=s.customerDebts,bonusTransactions=s.bonusTransactions;if(c){customers=s.customers.map(x=>x.id===c.id?{...x,total:x.total+(+total||0),debt:x.debt+creditAmount,bonusBalance:Math.max(0,x.bonusBalance-(+bonusUsed||0)+earned),lastPurchase:sale.date}:x);if(creditAmount>0)customerDebts=[{id:id('cd'),customerId:c.id,source:saleId,amount:creditAmount,paid:0,dueDate:dueDateAfter((s.customerGroups.find(g=>g.name===c.group)?.dueDays)||s.settings.customer.dueDays),status:'Faol',createdAt:sale.date,note:'POS nasiya'},...customerDebts];if(+bonusUsed>0)bonusTransactions=[{id:id('bt'),customerId:c.id,type:'Redeemed',amount:+bonusUsed,date:sale.date,reason:saleId,user:actorName(s)},...bonusTransactions];if(earned>0)bonusTransactions=[{id:id('bt'),customerId:c.id,type:'Earned',amount:earned,date:sale.date,reason:saleId,user:actorName(s)},...bonusTransactions]}let registers=s.registers,accounts=s.accounts;const financeLines=[];let cashToRegister=0;for(const x of normalizedPayments.filter(x=>x.method!=='Nasiya')){const pm=s.paymentMethods.find(pm=>pm.name===x.method);let accountName='';if(x.method==='Naqd'||pm?.type==='cash'){registers=changeRegisterBalance(registers,registerId,x.amount);accountName=s.registers.find(r=>r.id===registerId)?.name||'Kassa 1';cashToRegister+=x.amount}else if(pm?.accountId){accounts=changeAccountBalance(accounts,pm.accountId,x.amount);accountName=s.accounts.find(a=>a.id===pm.accountId)?.name||pm.name}else{const fallback=s.accounts[0];if(fallback){accounts=changeAccountBalance(accounts,fallback.id,x.amount);accountName=fallback.name}else accountName=x.method}financeLines.push({id:id('ft'),date:sale.date,time:sale.time,type:'Kirim',category:'Savdo',counterparty:sale.customer,account:accountName,method:x.method,amount:x.amount,source:saleId,user:actorName(s),status:'Completed'})}const shifts=s.shifts.map(sh=>sh.status==='Ochiq'&&sh.registerId===registerId?{...sh,sales:(sh.sales||0)+sale.amount,expectedCash:(sh.expectedCash||0)+cashToRegister}:sh);const moves=[...items.map(i=>({id:id('m'),type:'Sotuv',productId:i.productId||i.id,product:i.name,qty:-(+i.qty||1),warehouseId:wh,source:saleId,time:sale.time,date:sale.date,user:actorName(s)})),...s.inventoryMoves];return activity({...s,warehouseStocks,products,registers,accounts,shifts,customers,customerDebts,bonusTransactions,financeTransactions:[...financeLines,...s.financeTransactions],inventoryMoves:moves,sales:[sale,...s.sales]},'Savdo yaratdi','Savdo',saleId)})
  const saveCart=cart=>setState(s=>({...s,savedCarts:[{id:id('cart'),createdAt:new Date().toISOString(),...cart},...s.savedCarts]}))
  const removeSavedCart=cartId=>setState(s=>({...s,savedCarts:s.savedCarts.filter(x=>x.id!==cartId)}))
  const createReturn=({saleId,reason='Qaytarish',items})=>setState(s=>{
    const sale=s.sales.find(x=>x.id===saleId);if(!sale)return s
    const returnDays=+s.settings?.pos?.returnDays||0;if(returnDays>0&&ageDays(sale.date)>returnDays)return s
    const previous=s.salesReturns.filter(r=>r.saleId===saleId&&r.status==='Yakunlandi')
    const already={};previous.flatMap(r=>r.items||[]).forEach(i=>{already[i.productId]=(already[i.productId]||0)+(+i.qty||0)})
    const requested=(items||sale.items||[]).map(i=>{const sold=sale.items.find(x=>x.productId===i.productId);const remaining=Math.max(0,(sold?.qty||0)-(already[i.productId]||0));return sold&&remaining>0?{...sold,qty:Math.min(remaining,Math.max(0,+i.qty||0))}:null}).filter(i=>i&&i.qty>0)
    if(!requested.length)return s
    const grossSale=(sale.items||[]).reduce((a,i)=>a+(+i.price||0)*(+i.qty||0),0)||sale.amount||1
    const netFactor=Math.min(1,(sale.amount||grossSale)/grossSale)
    const grossReturn=requested.reduce((a,i)=>a+i.price*i.qty,0)
    const previouslyReturned=previous.reduce((a,r)=>a+(r.amount||0),0)
    const returnAmount=Math.max(0,Math.min(Math.round(grossReturn*netFactor),(sale.amount||0)-previouslyReturned))
    if(returnAmount<=0)return s
    const wh=sale.warehouseId||s.settings.defaultWarehouseId;let warehouseStocks=s.warehouseStocks
    requested.forEach(line=>{warehouseStocks=changeWarehouseQty(warehouseStocks,wh,line.productId,line.qty)})
    const products=syncProductStock(s.products,warehouseStocks)
    const date=new Date().toLocaleDateString('uz-UZ'),time=new Date().toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'})
    const debt=s.customerDebts.find(d=>d.customerId===sale.customerId&&d.source===saleId)
    const outstanding=debt?Math.max(0,debt.amount-debt.paid):0
    const debtReduction=Math.min(returnAmount,outstanding),refundAmount=Math.max(0,returnAmount-debtReduction)
    let customerDebts=s.customerDebts
    if(debt&&debtReduction>0)customerDebts=s.customerDebts.map(d=>{if(d.id!==debt.id)return d;const amount=Math.max(d.paid,d.amount-debtReduction);return {...d,amount,status:amount<=d.paid?'To‘langan':d.paid>0?'Qisman to‘langan':'Faol',note:`${d.note||''} · Qaytarish bilan ${debtReduction.toLocaleString('uz-UZ')} kamaydi`.trim()}})
    const ratio=Math.min(1,returnAmount/Math.max(1,sale.amount||1))
    const reversedBefore=previous.reduce((a,r)=>a+(r.bonusEarnedReversed||0),0),restoredBefore=previous.reduce((a,r)=>a+(r.bonusUsedRestored||0),0)
    const bonusEarnedReversed=Math.min(Math.max(0,(sale.bonusEarned||0)-reversedBefore),Math.round((sale.bonusEarned||0)*ratio))
    const bonusUsedRestored=Math.min(Math.max(0,(sale.bonusUsed||0)-restoredBefore),Math.round((sale.bonusUsed||0)*ratio))
    let customers=s.customers,bonusTransactions=s.bonusTransactions
    if(sale.customerId){customers=s.customers.map(c=>c.id===sale.customerId?{...c,total:Math.max(0,c.total-returnAmount),debt:Math.max(0,c.debt-debtReduction),bonusBalance:Math.max(0,c.bonusBalance-bonusEarnedReversed+bonusUsedRestored)}:c);if(bonusEarnedReversed>0)bonusTransactions=[{id:id('bt'),customerId:sale.customerId,type:'Return Reverse',amount:bonusEarnedReversed,date,reason:saleId,user:actorName(s)},...bonusTransactions];if(bonusUsedRestored>0)bonusTransactions=[{id:id('bt'),customerId:sale.customerId,type:'Return Restore',amount:bonusUsedRestored,date,reason:saleId,user:actorName(s)},...bonusTransactions]}
    let registers=s.registers,accounts=s.accounts;const refundLines=[];let cashRefund=0,remainingRefund=refundAmount
    const paidByMethod={};(sale.payments||[]).filter(x=>x.method!=='Nasiya').forEach(x=>{paidByMethod[x.method]=(paidByMethod[x.method]||0)+(+x.amount||0)})
    const refundedByMethod={};previous.flatMap(r=>r.refundPayments||[]).forEach(x=>{refundedByMethod[x.method]=(refundedByMethod[x.method]||0)+(+x.amount||0)})
    for(const [method,totalPaid] of Object.entries(paidByMethod)){if(remainingRefund<=0)break;const available=Math.max(0,totalPaid-(refundedByMethod[method]||0));const refund=Math.min(available,remainingRefund);if(refund<=0)continue;remainingRefund-=refund;const pm=s.paymentMethods.find(x=>x.name===method);let accountName='';if(method==='Naqd'||pm?.type==='cash'){registers=changeRegisterBalance(registers,sale.registerId,-refund);accountName=s.registers.find(v=>v.id===sale.registerId)?.name||'Kassa 1';cashRefund+=refund}else if(pm?.accountId){accounts=changeAccountBalance(accounts,pm.accountId,-refund);accountName=s.accounts.find(a=>a.id===pm.accountId)?.name||pm.name}else{const fallback=s.accounts[0];if(fallback){accounts=changeAccountBalance(accounts,fallback.id,-refund);accountName=fallback.name}else accountName=method}refundLines.push({id:id('ft'),date,time,type:'Chiqim',category:'Refund',counterparty:sale.customer,account:accountName,method,amount:refund,source:saleId,user:actorName(s),status:'Completed'})}
    const allReturned={...already};requested.forEach(i=>{allReturned[i.productId]=(allReturned[i.productId]||0)+i.qty})
    const fullyReturned=(sale.items||[]).every(i=>(allReturned[i.productId]||0)>=(i.qty||0))
    const returnId=`RET-${String(s.salesReturns.length+23).padStart(3,'0')}`
    const r={id:returnId,saleId,customer:sale.customer,customerId:sale.customerId||'',warehouseId:wh,amount:returnAmount,debtReduced:debtReduction,refunded:refundAmount,refundPayments:refundLines.map(x=>({method:x.method,amount:x.amount})),bonusEarnedReversed,bonusUsedRestored,reason,date,time,status:'Yakunlandi',items:requested}
    const shifts=s.shifts.map(sh=>sh.status==='Ochiq'&&sh.registerId===sale.registerId?{...sh,refunds:(sh.refunds||0)+returnAmount,expectedCash:(sh.expectedCash||0)-cashRefund}:sh)
    const moves=requested.map(line=>({id:id('m'),type:'Qaytarish',productId:line.productId,product:line.name,qty:line.qty,warehouseId:wh,source:returnId,time,date,user:actorName(s),reason}))
    const sales=s.sales.map(x=>x.id===saleId?{...x,status:fullyReturned?'Qaytarildi':'Qisman qaytarildi'}:x)
    return activity({...s,warehouseStocks,products,registers,accounts,shifts,customers,customerDebts,bonusTransactions,financeTransactions:[...refundLines,...s.financeTransactions],inventoryMoves:[...moves,...s.inventoryMoves],sales,salesReturns:[r,...s.salesReturns]},fullyReturned?'Savdoni qaytardi':'Savdoni qisman qaytardi','Savdo',saleId,'warning',reason)
  })

  const addFinanceTransaction=payload=>setState(s=>{const amount=Math.abs(+payload.amount||0);if(amount<=0)return s;const tx={id:id('ft'),date:new Date().toLocaleDateString('uz-UZ'),time:new Date().toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'}),status:'Completed',user:actorName(s),...payload,amount};const delta=tx.type==='Chiqim'?-amount:amount;const bal=changeBalanceByName(s,tx.account,delta);const shifts=s.shifts.map(sh=>{const register=s.registers.find(r=>r.id===sh.registerId);if(sh.status!=='Ochiq'||register?.name!==tx.account||tx.method!=='Naqd')return sh;return tx.type==='Chiqim'?{...sh,cashOut:(sh.cashOut||0)+amount,expectedCash:(sh.expectedCash||0)-amount}:{...sh,cashIn:(sh.cashIn||0)+amount,expectedCash:(sh.expectedCash||0)+amount}});return activity({...s,...bal,shifts,financeTransactions:[tx,...s.financeTransactions]},`${tx.type} qo‘shdi`,'Moliya',tx.id)})
  const transferAccount=({fromType='register',fromId,toType='account',toId,amount,note=''})=>setState(s=>{const value=+amount||0;if(value<=0||!fromId||!toId||fromId===toId)return s;const source=s.registers.find(x=>x.id===fromId)||s.accounts.find(x=>x.id===fromId);if(!source||(+source.balance||0)<value)return s;let registers=changeRegisterBalance(s.registers,fromId,-value);let accounts=changeAccountBalance(s.accounts,fromId,-value);registers=changeRegisterBalance(registers,toId,value);accounts=changeAccountBalance(accounts,toId,value);const fromName=source.name||'',toName=s.registers.find(x=>x.id===toId)?.name||s.accounts.find(x=>x.id===toId)?.name||'';if(!toName)return s;const base={date:new Date().toLocaleDateString('uz-UZ'),time:new Date().toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'}),category:'Hisoblar orasida transfer',counterparty:`${fromName} → ${toName}`,method:'Transfer',source:'TRANSFER',user:actorName(s),status:'Completed',note};return activity({...s,registers,accounts,financeTransactions:[{id:id('ft'),...base,type:'Chiqim',account:fromName,amount:value},{id:id('ft'),...base,type:'Kirim',account:toName,amount:value},...s.financeTransactions]},'Hisoblar orasida transfer','Moliya',`${fromName} → ${toName}`)})
  const addRegister=payload=>setState(s=>({...s,registers:[...s.registers,{id:id('r'),balance:+payload.balance||0,status:'Faol',currency:'UZS',...payload}]}))
  const addAccount=payload=>setState(s=>({...s,accounts:[...s.accounts,{id:id('a'),balance:+payload.balance||0,status:'Faol',currency:'UZS',...payload}]}))
  const addPaymentMethod=payload=>setState(s=>({...s,paymentMethods:[...s.paymentMethods,{id:id('pm'),enabled:true,posVisible:true,type:'custom',...((typeof payload==='string')?{name:payload}:payload)}]}))

  const addEmployee=payload=>setState(s=>{if(!payload?.name?.trim())return s;if((payload.phone&&s.employees.some(e=>e.phone===payload.phone))||(payload.login&&s.employees.some(e=>e.login===payload.login)))return s;const role=s.roles.find(r=>r.id===payload.roleId);const e={id:id('e'),status:'Faol',sales:0,shift:'Smenada emas',lastActivity:'-',role:role?.name||payload.role||'',startDate:new Date().toISOString().slice(0,10),...payload,name:payload.name.trim(),baseSalary:+payload.baseSalary||0,commission:+payload.commission||0};return activity({...s,employees:[e,...s.employees]},'Xodim yaratdi','Xodimlar',e.name)})
  const updateEmployee=(employeeId,patch)=>setState(s=>{const role=patch.roleId?s.roles.find(r=>r.id===patch.roleId):null;const next=role?{...patch,role:role.name}:patch;return activity({...s,employees:s.employees.map(e=>e.id===employeeId?{...e,...next}:e)},'Xodimni tahrirladi','Xodimlar',employeeId)})
  const addRole=payload=>setState(s=>({...s,roles:[...s.roles,{id:id('role'),preset:false,scope:'branch',permissions:{},...payload}]}))
  const updateRole=(roleId,patch)=>setState(s=>activity({...s,roles:s.roles.map(r=>r.id===roleId?{...r,...patch}:r)},'Rol/ruxsatni o‘zgartirdi','Xodimlar',roleId))
  const openShift=({employeeId,registerId,openingCash=0})=>setState(s=>{if(s.shifts.some(x=>x.registerId===registerId&&x.status==='Ochiq'))return s;const e=s.employees.find(x=>x.id===employeeId),r=s.registers.find(x=>x.id===registerId);if(!e||!r||e.status!=='Faol'||r.status!=='Faol')return s;const branch=s.branches.find(b=>b.id===e.branchId)||s.branches[0];const openedAt=new Date().toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'});const scheduledStart=branch?.workStart||'09:00';const lateBy=Math.max(0,clockMinutes(openedAt)-clockMinutes(scheduledStart));const late=lateBy>=(+s.settings.employee.lateThreshold||+s.settings.pos.lateAlertMinutes||5);const sh={id:id('sh'),employeeId,employee:e.name,registerId,register:r.name,branchId:e.branchId||'b1',openedAt,scheduledStart,scheduledEnd:branch?.workEnd||'20:00',openingCash:+openingCash||0,sales:0,cashIn:0,cashOut:0,refunds:0,expectedCash:+openingCash||0,actualCash:null,difference:null,status:'Ochiq',lateBy};let next={...s,shifts:[sh,...s.shifts],employees:s.employees.map(x=>x.id===employeeId?{...x,shift:'Ishda',lastActivity:openedAt}:x)};if(late&&s.settings.notifications.shiftLate){next={...next,notifications:[{id:id('n'),type:'shift',title:`${e.name} smenani kech ochdi`,text:`${lateBy} daqiqa kechikish · ${r.name}.`,severity:'warning',read:false,date:new Date().toLocaleDateString('uz-UZ')},...next.notifications]}}return activity(next,late?'Smenani kech ochdi':'Smena ochdi','Xodimlar',sh.id,late?'warning':'info',late?`${lateBy} daqiqa kechikdi`:'')})
  const closeShift=({shiftId,actualCash,reason='',force=false})=>setState(s=>{const sh=s.shifts.find(x=>x.id===shiftId);if(!sh||sh.status!=='Ochiq')return s;const actual=+actualCash||0,closedAt=new Date().toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'});const scheduledEnd=sh.scheduledEnd||(s.branches.find(b=>b.id===sh.branchId)?.workEnd||'20:00');const earlyBy=Math.max(0,clockMinutes(scheduledEnd)-clockMinutes(closedAt));const early=earlyBy>0;const difference=actual-(sh.expectedCash||0);if((early&&s.settings.employee.earlyCloseApproval||difference!==0)&&!String(reason).trim()&&!force)return s;const status=force?'Force closed':early?'Erta yopilgan':'Yopilgan';const shifts=s.shifts.map(x=>x.id===shiftId?{...x,actualCash:actual,difference,closedAt,status,closeReason:reason,earlyBy}:x);let next={...s,shifts,employees:s.employees.map(x=>x.id===sh.employeeId?{...x,shift:'Smenada emas',lastActivity:closedAt}:x)};if(early&&s.settings.notifications.shiftEarly){next={...next,notifications:[{id:id('n'),type:'shift',title:`${sh.employee} smenani erta yopdi`,text:`${earlyBy} daqiqa erta · ${sh.register}. Sabab: ${reason||'Force close'}`,severity:'warning',read:false,date:new Date().toLocaleDateString('uz-UZ')},...next.notifications]}}if(difference!==0&&s.settings.notifications.cashDiff){next={...next,notifications:[{id:id('n'),type:'cash',title:`${sh.register}da kassa farqi`,text:`${sh.employee}: ${difference>0?'+':''}${difference.toLocaleString('uz-UZ')} so‘m.`,severity:'warning',read:false,date:new Date().toLocaleDateString('uz-UZ')},...next.notifications]}}return activity(next,force?'Smenani force close qildi':early?'Smenani erta yopdi':'Smena yopdi','Xodimlar',shiftId,(difference!==0||early)?'warning':'info',reason)})
  const addPayrollAdjustment=({employeeId,type='bonus',amount,reason=''})=>setState(s=>{const value=Math.abs(+amount||0);if(!value)return s;const payroll=s.payroll.map(p=>p.employeeId===employeeId?{...p,[type==='bonus'?'bonus':'deduction']:(p[type==='bonus'?'bonus':'deduction']||0)+value,total:p.total+(type==='bonus'?1:-1)*value}:p);return activity({...s,payroll},type==='bonus'?'Bonus qo‘shdi':'Ushlab qolish qo‘shdi','Xodimlar',employeeId,'info',reason)})
  const saveAttendance=payload=>setState(s=>{const e=s.employees.find(x=>x.id===payload.employeeId);if(!e)return s;const existing=payload.id&&s.attendance.find(a=>a.id===payload.id);const row={id:existing?.id||id('at'),date:new Date().toLocaleDateString('uz-UZ'),scheduledStart:'09:00',scheduledEnd:'18:00',checkIn:'',checkOut:'',status:'Ishda',...existing,...payload};const attendance=existing?s.attendance.map(a=>a.id===row.id?row:a):[row,...s.attendance];return activity({...s,attendance},existing?'Davomatni tuzatdi':'Davomat kiritdi','Xodimlar',e.name,'info',payload.reason||'')})
  const setPayrollStatus=({payrollId,status,account='Asosiy bank',method='Bank'})=>setState(s=>{const pay=s.payroll.find(p=>p.id===payrollId);if(!pay)return s;if(status!=='To‘landi')return activity({...s,payroll:s.payroll.map(p=>p.id===payrollId?{...p,status}:p)},`Payroll status: ${status}`,'Xodimlar',payrollId);if(pay.status==='To‘landi')return s;const bal=changeBalanceByName(s,account,-pay.total);const date=new Date().toLocaleDateString('uz-UZ'),time=new Date().toLocaleTimeString('uz-UZ',{hour:'2-digit',minute:'2-digit'});const tx={id:id('ft'),date,time,type:'Chiqim',category:'Ish haqi',counterparty:pay.employee,account,method,amount:pay.total,source:pay.id,user:actorName(s),status:'Completed',note:`${pay.period} ish haqi`};return activity({...s,...bal,payroll:s.payroll.map(p=>p.id===payrollId?{...p,status:'To‘landi',paidAt:`${date} ${time}`,account}:p),financeTransactions:[tx,...s.financeTransactions]},'Ish haqi to‘landi','Xodimlar',pay.employee)})

  const saveSettings=patch=>setState(s=>activity({...s,settings:{...s.settings,...patch}},'Sozlama o‘zgartirdi','Sozlamalar'))
  const saveNestedSettings=(section,patch)=>setState(s=>activity({...s,settings:{...s.settings,[section]:{...s.settings[section],...patch}}},`${section} sozlamasi o‘zgardi`,'Sozlamalar'))
  const resetDemo=()=>setState(clone(seed))
  const useCredit=(count=1)=>setState(s=>({...s,aiCredits:Math.max(0,s.aiCredits-count)}))

  const currentEmployee=state.employees.find(e=>e.id===state.settings.currentEmployeeId)||state.employees[0]
  const currentRole=state.roles.find(r=>r.id===currentEmployee?.roleId)||state.roles[0]
  const can=(module,action='view')=>module==='dashboard'||hasRolePermission(currentRole,module,action)
  const value=useMemo(()=>({state,setState,currentEmployee,currentRole,can,addProduct,updateProduct,archiveProduct,bulkUpdateProducts,addCategory,addBrand,addPriceType,internalBarcode,addWarehouse,addBranch,quickInbound,transferStock,finalizeInventory,addCustomer,updateCustomer,adjustBonus,addCustomerDebt,receiveCustomerPayment,addCustomerGroup,addSupplier,updateSupplier,linkSupplierProduct,addSupplierDocument,paySupplier,createPurchase,receivePurchase,returnToSupplier,createSale,saveCart,removeSavedCart,createReturn,addFinanceTransaction,transferAccount,addRegister,addAccount,addPaymentMethod,addEmployee,updateEmployee,addRole,updateRole,openShift,closeShift,addPayrollAdjustment,saveAttendance,setPayrollStatus,saveSettings,saveNestedSettings,resetDemo,useCredit}),[state,currentEmployee,currentRole])
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export const useApp=()=>useContext(AppContext)
