import React,{useEffect} from 'react'
import {Routes,Route,Navigate} from 'react-router-dom'
import AppLayout from './layout/AppLayout'
import Dashboard from './pages/Dashboard'
import Sales from './pages/Sales'
import PosTerminal from './pages/PosTerminal'
import Products from './pages/Products'
import Warehouse from './pages/Warehouse'
import Purchases from './pages/Purchases'
import Customers from './pages/Customers'
import Suppliers from './pages/Suppliers'
import Finance from './pages/Finance'
import Reports from './pages/Reports'
import Employees from './pages/Employees'
import Settings from './pages/Settings'
import AiWorkspace from './pages/AiWorkspace'
import {useApp} from './state/AppContext'

const moduleMap={dashboard:'dashboard',sales:'sales',pos:'pos',products:'products',warehouse:'warehouse',purchases:'purchases',customers:'customers',suppliers:'suppliers',finance:'finance',reports:'reports',employees:'employees',settings:'settings',ai:'ai'}
function Access({module,children}){const {can}=useApp();return can(moduleMap[module]||module)?children:<Navigate to="/" replace/>}

export default function App(){
  const {state}=useApp()
  useEffect(()=>{
    const s=state.settings
    const root=document.documentElement
    root.style.setProperty('--accent',s.accent||'#4D8DFF')
    root.style.setProperty('--radius',`${s.radius||22}px`)
    root.style.setProperty('--glass-opacity',`${Math.max(30,Math.min(90,s.glass||72))/100}`)
    root.style.setProperty('--glass-blur',`${s.blur||24}px`)
    root.dataset.theme=s.theme==='dark'?'dark':'light'
    document.body.dataset.bg=s.background||'ocean-blue'
    document.body.dataset.density=s.density||'comfortable'
    document.body.dataset.fontSize=s.fontSize||'standard'
    document.body.style.fontFamily=`${s.font||'Inter'}, Inter, system-ui, sans-serif`
    document.body.classList.toggle('reduced-motion',!s.animations)
  },[state.settings])
  return <Routes>
    <Route path="/pos" element={<Access module="pos"><PosTerminal/></Access>}/>
    <Route element={<AppLayout/>}>
      <Route path="/" element={<Access module="dashboard"><Dashboard/></Access>}/><Route path="/sales" element={<Access module="sales"><Sales/></Access>}/><Route path="/products" element={<Access module="products"><Products/></Access>}/><Route path="/warehouse" element={<Access module="warehouse"><Warehouse/></Access>}/><Route path="/purchases" element={<Access module="purchases"><Purchases/></Access>}/><Route path="/customers" element={<Access module="customers"><Customers/></Access>}/><Route path="/suppliers" element={<Access module="suppliers"><Suppliers/></Access>}/><Route path="/finance" element={<Access module="finance"><Finance/></Access>}/><Route path="/reports" element={<Access module="reports"><Reports/></Access>}/><Route path="/employees" element={<Access module="employees"><Employees/></Access>}/><Route path="/settings" element={<Access module="settings"><Settings/></Access>}/><Route path="/ai" element={<Access module="ai"><AiWorkspace/></Access>}/>
    </Route>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>
}
