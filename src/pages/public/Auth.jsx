import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useToast } from '../../context/ToastContext'

export function Login() {
  const [f,setF] = useState({email:'',password:''})
  const [loading,setLoading] = useState(false)
  const [err,setErr] = useState('')
  const { login } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const submit = async e => {
    e.preventDefault(); setErr(''); setLoading(true)
    try {
      const user = await login(f.email, f.password)
      toast('Welcome back, ' + user.name + '!')
      const from = location.state?.from?.pathname
      const home = { super_admin:'/admin/dashboard', business_owner:'/business/dashboard', customer:'/dashboard' }
      navigate(from || home[user.role] || '/dashboard', { replace: true })
    } catch(e) { setErr(e.response?.data?.error || e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div style={{position:'relative',zIndex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:44}}>
            <div className="logo-icon" style={{width:42,height:42,fontSize:'1.2rem',background:'rgba(255,255,255,.2)'}}>S</div>
            <span style={{fontSize:'1.4rem',fontWeight:800,color:'#fff'}}>SmartBook</span>
          </div>
          <h2 style={{fontSize:'2.2rem',fontWeight:800,color:'#fff',lineHeight:1.25,marginBottom:14}}>Welcome back to SmartBook</h2>
          <p style={{color:'rgba(255,255,255,.65)',fontSize:'.9rem',lineHeight:1.7,marginBottom:36}}>Sign in to manage your appointments and book new services.</p>
          {['Instant appointment booking','Role-based dashboards','Real-time availability'].map(f=>(
            <div key={f} style={{display:'flex',alignItems:'center',gap:10,marginBottom:12,color:'rgba(255,255,255,.8)',fontSize:'.85rem'}}>
              <span style={{width:7,height:7,borderRadius:'50%',background:'#34d399',flexShrink:0}}/>
              {f}
            </div>
          ))}
          <div style={{marginTop:36,padding:'16px 20px',background:'rgba(255,255,255,.1)',borderRadius:12,fontSize:'.8rem',color:'rgba(255,255,255,.7)'}}>
            <strong style={{color:'#fff',display:'block',marginBottom:6}}>Demo Accounts</strong>
            admin@smartbook.com / admin123<br/>
            sara@citysalon.com / owner123<br/>
            ali@customer.com / customer123
          </div>
        </div>
      </div>
      <div className="auth-right">
        <div className="auth-box">
          <h2>Sign In</h2>
          <p>Enter your credentials to continue</p>
          {err && <div className="alert alert-error">⚠ {err}</div>}
          <form onSubmit={submit}>
            <div className="form-group"><label className="form-label">Email</label>
              <input className="form-control" type="email" required value={f.email} onChange={e=>setF(p=>({...p,email:e.target.value}))} placeholder="you@example.com"/>
            </div>
            <div className="form-group"><label className="form-label">Password</label>
              <input className="form-control" type="password" required value={f.password} onChange={e=>setF(p=>({...p,password:e.target.value}))} placeholder="••••••"/>
            </div>
            <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{padding:13,marginTop:4}}>
              {loading ? <span className="loader"/> : 'Sign In'}
            </button>
          </form>
          <p style={{textAlign:'center',fontSize:'.83rem',color:'var(--text-muted)',marginTop:18}}>
            Don't have an account? <Link to="/signup" style={{color:'var(--primary)',fontWeight:600}}>Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export function Register() {
  const [f,setF] = useState({name:'',email:'',password:'',phone:'',role:'customer',businessName:'',businessCategory:'Beauty'})
  const [loading,setLoading] = useState(false)
  const [err,setErr] = useState('')
  const { register } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()

  const submit = async e => {
    e.preventDefault(); setErr(''); setLoading(true)
    try {
      const user = await register(f)
      toast('Account created! Welcome, ' + user.name + ' 🎉')
      navigate(user.role==='business_owner' ? '/business/dashboard' : '/dashboard')
    } catch(e) { setErr(e.response?.data?.error || e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="auth-page">
      <div className="auth-left">
        <div style={{position:'relative',zIndex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:44}}>
            <div className="logo-icon" style={{width:42,height:42,fontSize:'1.2rem',background:'rgba(255,255,255,.2)'}}>S</div>
            <span style={{fontSize:'1.4rem',fontWeight:800,color:'#fff'}}>SmartBook</span>
          </div>
          <h2 style={{fontSize:'2.2rem',fontWeight:800,color:'#fff',lineHeight:1.25,marginBottom:14}}>Start booking in minutes</h2>
          <p style={{color:'rgba(255,255,255,.65)',fontSize:'.9rem',lineHeight:1.7,marginBottom:36}}>Create your free account and access professional services instantly.</p>
          {['No booking fees ever','Cancel anytime for free','Business owners get full dashboard'].map(f=>(
            <div key={f} style={{display:'flex',alignItems:'center',gap:10,marginBottom:12,color:'rgba(255,255,255,.8)',fontSize:'.85rem'}}>
              <span style={{width:7,height:7,borderRadius:'50%',background:'#34d399',flexShrink:0}}/>{f}
            </div>
          ))}
        </div>
      </div>
      <div className="auth-right" style={{overflowY:'auto'}}>
        <div className="auth-box">
          <h2>Create Account</h2>
          <p>Join thousands of SmartBook users</p>
          {err && <div className="alert alert-error">⚠ {err}</div>}
          <form onSubmit={submit}>
            <div className="form-group"><label className="form-label">I am a</label>
              <select className="form-control" value={f.role} onChange={e=>setF(p=>({...p,role:e.target.value}))}>
                <option value="customer">Customer — I want to book services</option>
                <option value="business_owner">Business Owner — I want to list my business</option>
              </select>
            </div>
            <div className="form-grid">
              <div className="form-group"><label className="form-label">Full Name</label>
                <input className="form-control" required value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} placeholder="John Smith"/>
              </div>
              <div className="form-group"><label className="form-label">Phone <span className="form-hint">(optional)</span></label>
                <input className="form-control" value={f.phone} onChange={e=>setF(p=>({...p,phone:e.target.value}))} placeholder="+44 7700 900000"/>
              </div>
            </div>
            <div className="form-group"><label className="form-label">Email</label>
              <input className="form-control" type="email" required value={f.email} onChange={e=>setF(p=>({...p,email:e.target.value}))} placeholder="you@example.com"/>
            </div>
            <div className="form-group"><label className="form-label">Password</label>
              <input className="form-control" type="password" required minLength={6} value={f.password} onChange={e=>setF(p=>({...p,password:e.target.value}))} placeholder="At least 6 characters"/>
            </div>
            {f.role==='business_owner' && <>
              <div className="form-group"><label className="form-label">Business Name</label>
                <input className="form-control" required value={f.businessName} onChange={e=>setF(p=>({...p,businessName:e.target.value}))} placeholder="My Awesome Business"/>
              </div>
              <div className="form-group"><label className="form-label">Business Category</label>
                <select className="form-control" value={f.businessCategory} onChange={e=>setF(p=>({...p,businessCategory:e.target.value}))}>
                  {['Beauty','Dental','Fitness','Medical','Legal','Automotive','Home','Wellness','General'].map(c=><option key={c}>{c}</option>)}
                </select>
              </div>
            </>}
            <button className="btn btn-primary btn-full" type="submit" disabled={loading} style={{padding:13,marginTop:4}}>
              {loading ? <span className="loader"/> : 'Create Account'}
            </button>
          </form>
          <p style={{textAlign:'center',fontSize:'.83rem',color:'var(--text-muted)',marginTop:18}}>
            Already have an account? <Link to="/signin" style={{color:'var(--primary)',fontWeight:600}}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
