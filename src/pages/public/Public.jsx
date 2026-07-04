import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PublicNav } from '../../components/layout/Guards'
import { useAuth } from '../../context/AuthContext'
import { fmtPKR, catEmoji } from '../../utils'
import api from '../../api/axios'

export function Home() {
  const { user } = useAuth()
  const [businesses, setBusinesses] = useState([])
  useEffect(()=>{ api.get('/businesses').then(({data})=>setBusinesses(data.slice(0,6))).catch(()=>{}) },[])

  return (<>
    <PublicNav/>
    <section className="hero">
      <h1>Book Any Service,<br/>Anytime — Instantly</h1>
      <p>Connect with top local businesses. Book appointments in seconds with real-time availability.</p>
      <div className="hero-btns">
        <Link to="/businesses" className="btn btn-orange btn-lg">Browse Businesses</Link>
        {!user && <Link to="/signup" className="btn btn-lg" style={{background:'rgba(255,255,255,.15)',color:'#fff',border:'1.5px solid rgba(255,255,255,.3)'}}>Get Started Free</Link>}
      </div>
    </section>

    <section style={{padding:'60px 48px',background:'var(--bg)'}}>
      <div style={{textAlign:'center',marginBottom:40}}>
        <h2 style={{fontSize:'1.9rem',fontWeight:800,marginBottom:8}}>Featured Businesses</h2>
        <p style={{color:'var(--text-muted)'}}>Discover top-rated local service providers</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:20,maxWidth:1100,margin:'0 auto'}}>
        {businesses.map(b=>(
          <div key={b.id} className="biz-card">
            <div style={{display:'flex',alignItems:'center',gap:14}}>
              <div className="biz-icon">{catEmoji(b.category)}</div>
              <div>
                <h3 style={{fontWeight:700,fontSize:'1rem'}}>{b.name}</h3>
                <span style={{fontSize:'.75rem',background:'var(--primary-light)',color:'var(--primary)',padding:'2px 8px',borderRadius:99,fontWeight:600}}>{b.category}</span>
              </div>
            </div>
            <p style={{fontSize:'.83rem',color:'var(--text-muted)',lineHeight:1.6}}>{b.description||'Professional services tailored for you.'}</p>
            <div style={{display:'flex',gap:16,fontSize:'.78rem',color:'var(--text-muted)'}}>
              <span>📋 {b.service_count} services</span>
              <span>📅 {b.booking_count} bookings</span>
            </div>
            <Link to={`/businesses/${b.id}`} className="btn btn-outline btn-sm" style={{alignSelf:'flex-start'}}>View Business →</Link>
          </div>
        ))}
      </div>
      <div style={{textAlign:'center',marginTop:32}}>
        <Link to="/businesses" className="btn btn-outline btn-lg">View All Businesses →</Link>
      </div>
    </section>

    <section style={{padding:'60px 48px',background:'#fff'}}>
      <div style={{textAlign:'center',marginBottom:40}}>
        <h2 style={{fontSize:'1.9rem',fontWeight:800,marginBottom:8}}>Why SmartBook?</h2>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:24,maxWidth:900,margin:'0 auto'}}>
        {[
          {icon:'⚡',t:'Instant Booking',d:'Book in under 2 minutes with real-time availability.'},
          {icon:'🏢',t:'Multi-Tenant Platform',d:'Each business gets their own dashboard and services.'},
          {icon:'🛡️',t:'Role-Based Access',d:'Separate portals for admins, owners, staff and customers.'},
        ].map(f=>(
          <div key={f.t} style={{textAlign:'center',padding:'28px 20px'}}>
            <div style={{fontSize:'2.5rem',marginBottom:14}}>{f.icon}</div>
            <h3 style={{fontWeight:700,marginBottom:8}}>{f.t}</h3>
            <p style={{fontSize:'.85rem',color:'var(--text-muted)',lineHeight:1.6}}>{f.d}</p>
          </div>
        ))}
      </div>
    </section>

    <section style={{background:'linear-gradient(135deg,#1e3a8a,#2563eb)',color:'#fff',padding:'60px 48px',textAlign:'center'}}>
      <h2 style={{fontSize:'2rem',fontWeight:800,marginBottom:12}}>Ready to get started?</h2>
      <p style={{opacity:.8,marginBottom:28}}>Join SmartBook today — it's completely free.</p>
      <Link to={user?'/book':'/signup'} className="btn btn-orange btn-lg">{user?'Book Now':'Create Free Account'}</Link>
    </section>

    <footer style={{background:'#0f172a',color:'rgba(255,255,255,.5)',padding:'24px 48px',display:'flex',justifyContent:'space-between',fontSize:'.8rem'}}>
      <div>© 2025 SmartBook. All rights reserved.</div>
      <div>Multi-Tenant SaaS Booking Platform</div>
    </footer>
  </>)
}

export function Businesses() {
  const [businesses, setBusinesses] = useState([])
  const [search, setSearch] = useState('')
  const [cat, setCat] = useState('All')
  const navigate = useNavigate()
  const { user } = useAuth()

  useEffect(()=>{ api.get('/businesses').then(({data})=>setBusinesses(data)).catch(()=>{}) },[])

  const cats = ['All', ...new Set(businesses.map(b=>b.category).filter(Boolean))]
  const shown = businesses.filter(b=>{
    const matchCat = cat==='All'||b.category===cat
    const matchSearch = !search||b.name.toLowerCase().includes(search.toLowerCase())
    return matchCat&&matchSearch
  })

  return (<>
    <PublicNav/>
    <div style={{background:'var(--primary)',padding:'40px 48px',color:'#fff'}}>
      <h1 style={{fontSize:'2rem',fontWeight:800,marginBottom:8}}>Browse Businesses</h1>
      <p style={{opacity:.8}}>Find and book your next appointment</p>
    </div>
    <div style={{padding:'28px 48px',background:'var(--bg)'}}>
      <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:24,alignItems:'center'}}>
        <div className="tab-row" style={{flex:1}}>
          {cats.map(c=><button key={c} className={`tab-btn${cat===c?' active':''}`} onClick={()=>setCat(c)}>{c}</button>)}
        </div>
        <div className="search-box">
          <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
          <input type="text" placeholder="Search businesses..." value={search} onChange={e=>setSearch(e.target.value)}/>
        </div>
      </div>
      {shown.length===0
        ? <div className="empty-state"><div className="empty-icon">🔍</div><h3>No businesses found</h3><p>Try a different search or category</p></div>
        : <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:20}}>
            {shown.map(b=>(
              <div key={b.id} className="biz-card" style={{cursor:'pointer'}} onClick={()=>navigate(`/businesses/${b.id}`)}>
                <div style={{display:'flex',alignItems:'center',gap:14}}>
                  <div className="biz-icon">{catEmoji(b.category)}</div>
                  <div>
                    <h3 style={{fontWeight:700}}>{b.name}</h3>
                    <span style={{fontSize:'.75rem',background:'var(--primary-light)',color:'var(--primary)',padding:'2px 8px',borderRadius:99,fontWeight:600}}>{b.category}</span>
                  </div>
                </div>
                {b.address && <p style={{fontSize:'.78rem',color:'var(--text-muted)'}}>📍 {b.address}</p>}
                <p style={{fontSize:'.83rem',color:'var(--text-muted)',lineHeight:1.6}}>{b.description||'Professional services tailored for you.'}</p>
                <div style={{display:'flex',gap:16,fontSize:'.78rem',color:'var(--text-muted)'}}>
                  <span>📋 {b.service_count} services</span>
                  <span>📅 {b.booking_count} bookings</span>
                </div>
                <button className="btn btn-primary btn-sm" style={{alignSelf:'flex-start'}}
                  onClick={e=>{e.stopPropagation();navigate(user?`/book?business=${b.id}`:'/signup')}}>
                  Book Now
                </button>
              </div>
            ))}
          </div>
      }
    </div>
  </>)
}

export function BusinessDetail() {
  const [biz,setBiz] = useState(null)
  const navigate = useNavigate()
  const { user } = useAuth()
  const id = window.location.pathname.split('/').pop()

  useEffect(()=>{ api.get('/businesses/'+id).then(({data})=>setBiz(data)).catch(()=>{}) },[id])

  if (!biz) return <><PublicNav/><div className="page-loader"><span className="loader loader-dark loader-lg"/></div></>

  return (<>
    <PublicNav/>
    <div style={{background:'var(--primary)',padding:'40px 48px',color:'#fff'}}>
      <div style={{display:'flex',alignItems:'center',gap:16}}>
        <div style={{width:64,height:64,borderRadius:16,background:'rgba(255,255,255,.2)',display:'grid',placeItems:'center',fontSize:'2rem'}}>
          {catEmoji(biz.category)}
        </div>
        <div>
          <h1 style={{fontSize:'2rem',fontWeight:800}}>{biz.name}</h1>
          <p style={{opacity:.8}}>{biz.category} · {biz.address||'Location not specified'}</p>
        </div>
      </div>
    </div>
    <div style={{padding:'32px 48px',background:'var(--bg)',display:'grid',gridTemplateColumns:'1fr 300px',gap:24}}>
      <div>
        {biz.description && <div className="card" style={{marginBottom:20}}><p style={{color:'var(--text-muted)',lineHeight:1.7}}>{biz.description}</p></div>}
        <div className="card">
          <div className="card-title">Services</div>
          {biz.services?.length===0
            ? <div className="empty-state" style={{padding:24}}><h3>No services listed yet</h3></div>
            : <div className="svc-grid">
                {biz.services?.map(s=>(
                  <div key={s.id} className="service-card">
                    <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
                      <div className="svc-icon" style={{background:'var(--primary-light)'}}>{catEmoji(s.category)}</div>
                      <h3 style={{fontWeight:700,fontSize:.95+'rem'}}>{s.name}</h3>
                    </div>
                    <p style={{fontSize:'.83rem',color:'var(--text-muted)',flex:1,marginBottom:12}}>{s.description}</p>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,fontSize:'.85rem'}}>
                      <span style={{color:'var(--text-muted)'}}>⏱ {s.duration_min} min</span>
                      <span style={{fontWeight:800,color:'var(--orange)',fontSize:'1rem'}}>{fmtPKR(s.price)}</span>
                    </div>
                    <button className="btn btn-primary btn-sm btn-full"
                      onClick={()=>navigate(user?`/book?business=${biz.id}&service=${s.id}`:'/signup')}>
                      Book This Service
                    </button>
                  </div>
                ))}
              </div>
          }
        </div>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <div className="card">
          <div className="card-title">Contact</div>
          {biz.phone && <p style={{fontSize:'.85rem',marginBottom:8}}>📞 {biz.phone}</p>}
          {biz.email && <p style={{fontSize:'.85rem',marginBottom:8}}>✉ {biz.email}</p>}
          {biz.address && <p style={{fontSize:'.85rem'}}>📍 {biz.address}</p>}
        </div>
        {biz.staff?.length>0 && (
          <div className="card">
            <div className="card-title">Our Team</div>
            {biz.staff.map(s=>(
              <div key={s.id} style={{display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                <div className="avatar">{s.name[0]}</div>
                <div><div style={{fontWeight:600,fontSize:'.85rem'}}>{s.name}</div><div style={{fontSize:'.75rem',color:'var(--text-muted)'}}>{s.title}</div></div>
              </div>
            ))}
          </div>
        )}
        <button className="btn btn-primary btn-full" onClick={()=>navigate(user?`/book?business=${biz.id}`:'/signup')}>
          Book an Appointment
        </button>
      </div>
    </div>
  </>)
}
