import { useState, useEffect, useRef } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { timeAgo } from '../../utils'
import api from '../../api/axios'

const Icons = {
  dash:   <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/></svg>,
  book:   <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>,
  appt:   <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm2-7h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11z"/></svg>,
  svc:    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>,
  staff:  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>,
  biz:    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg>,
  users:  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>,
  profile:<svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z"/></svg>,
  logout: <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>,
  bell:   <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>,
  menu:   <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z"/></svg>,
}

function getNav(role) {
  const common = [{ label:'Account',type:'section'},{to:'/profile',label:'My Profile',icon:Icons.profile}]
  if (role==='customer') return [
    {label:'Main',type:'section'},
    {to:'/dashboard',label:'Dashboard',icon:Icons.dash},
    {to:'/businesses',label:'Browse Businesses',icon:Icons.biz},
    {to:'/book',label:'Book Appointment',icon:Icons.book},
    {to:'/my-appointments',label:'My Appointments',icon:Icons.appt},
    ...common
  ]
  if (role==='business_owner') return [
    {label:'My Business',type:'section'},
    {to:'/business/dashboard',label:'Dashboard',icon:Icons.dash},
    {to:'/business/appointments',label:'Appointments',icon:Icons.appt},
    {to:'/business/services',label:'Services',icon:Icons.svc},
    {to:'/business/staff',label:'Staff',icon:Icons.staff},
    ...common
  ]
  if (role==='super_admin') return [
    {label:'Platform Admin',type:'section'},
    {to:'/admin/dashboard',label:'Dashboard',icon:Icons.dash},
    {to:'/admin/businesses',label:'Businesses',icon:Icons.biz},
    {to:'/admin/users',label:'Users',icon:Icons.users},
    {to:'/admin/appointments',label:'Appointments',icon:Icons.appt},
    ...common
  ]
  return common
}

function Sidebar({ open, onClose }) {
  const { user, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const nav = getNav(user?.role)

  const go = to => { navigate(to); onClose?.() }

  return (
    <>
      {open && <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.35)',zIndex:99}} onClick={onClose}/>}
      <aside className={`sidebar${open?' open':''}`}>
        <div className="sidebar-logo">
          <div className="logo-icon">S</div>
          <div className="sidebar-brand">SmartBook<span>Booking Platform</span></div>
        </div>
        <nav className="sidebar-nav">
          {nav.map((item,i) => {
            if (item.type==='section') return <div key={i} className="nav-section">{item.label}</div>
            const active = location.pathname===item.to || (item.to!=='/' && location.pathname.startsWith(item.to))
            return <button key={item.to} className={`nav-item${active?' active':''}`} onClick={()=>go(item.to)}>{item.icon}{item.label}</button>
          })}
          <button className="nav-item danger" onClick={logout}>{Icons.logout}Sign Out</button>
        </nav>
        <div className="sidebar-footer">
          <div className="user-card" onClick={()=>go('/profile')}>
            <div className="avatar">{user?.name?.[0]?.toUpperCase()}</div>
            <div><div className="user-name">{user?.name}</div><div className="user-role">{user?.role?.replace(/_/g,' ')}</div></div>
          </div>
        </div>
      </aside>
    </>
  )
}

function NotifBell() {
  const [open,setOpen] = useState(false)
  const [notifs,setNotifs] = useState([])
  const [unread,setUnread] = useState(0)
  const ref = useRef(null)

  const load = () => api.get('/notifications').then(({data})=>{setNotifs(data.notifications||[]);setUnread(data.unreadCount||0)}).catch(()=>{})
  useEffect(()=>{load()},[])
  useEffect(()=>{
    const h = e => { if(ref.current&&!ref.current.contains(e.target))setOpen(false) }
    document.addEventListener('mousedown',h)
    return ()=>document.removeEventListener('mousedown',h)
  },[])

  const toggle = async () => {
    if (!open && unread>0) { await api.patch('/notifications/read').catch(()=>{}); setUnread(0) }
    setOpen(o=>!o)
  }

  return (
    <div ref={ref} style={{position:'relative'}}>
      <button className="icon-btn" onClick={toggle}>
        {Icons.bell}
        {unread>0 && <span className="notif-badge"/>}
      </button>
      {open && (
        <div className="notif-dropdown">
          <div className="notif-dd-header"><h3>Notifications</h3></div>
          {notifs.length===0
            ? <div style={{padding:'22px',textAlign:'center',color:'var(--text-muted)',fontSize:'.82rem'}}>No notifications</div>
            : notifs.map(n=>(
              <div key={n.id} className={`notif-item-dd${n.is_read?'':' unread'}`}>
                <div>{n.message}</div>
                <div className="notif-time">{timeAgo(n.created_at)}</div>
              </div>
            ))
          }
        </div>
      )}
    </div>
  )
}

export default function AppLayout({ title, subtitle, action, children }) {
  const [sideOpen,setSideOpen] = useState(false)
  return (
    <div className="app-layout">
      <Sidebar open={sideOpen} onClose={()=>setSideOpen(false)}/>
      <div className="main-content">
        <header className="top-header">
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <button className="icon-btn" onClick={()=>setSideOpen(true)} style={{display:'flex'}}>{Icons.menu}</button>
            <div className="page-title"><h2>{title}</h2>{subtitle&&<p>{subtitle}</p>}</div>
          </div>
          <div className="header-actions">
            <NotifBell/>
            {action}
          </div>
        </header>
        <div className="page-body fade-up">{children}</div>
      </div>
    </div>
  )
}
