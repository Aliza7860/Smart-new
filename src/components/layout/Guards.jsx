import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="page-loader"><span className="loader loader-dark loader-lg"/></div>
  if (!user) return <Navigate to="/signin" state={{ from: location }} replace />
  if (roles && !roles.includes(user.role)) {
    // redirect to appropriate home
    const home = { super_admin:'/admin/dashboard', business_owner:'/business/dashboard', customer:'/dashboard' }
    return <Navigate to={home[user.role] || '/'} replace />
  }
  return children
}

import { Link, useLocation as useLoc } from 'react-router-dom'
import { useAuth as useA } from '../../context/AuthContext'

export function PublicNav() {
  const { user } = useA()
  const { pathname } = useLoc()
  const home = user ? (user.role==='super_admin' ? '/admin/dashboard' : user.role==='business_owner' ? '/business/dashboard' : '/dashboard') : '/'

  return (
    <nav className="pub-nav">
      <Link to="/" className="pub-brand">
        <div className="logo-icon" style={{width:34,height:34,fontSize:'.95rem'}}>S</div>
        SmartBook
      </Link>
      <div className="pub-links">
        <Link to="/" className={pathname==='/'?'active':''}>Home</Link>
        <Link to="/businesses" className={pathname==='/businesses'?'active':''}>Businesses</Link>
      </div>
      <div style={{display:'flex',gap:10}}>
        {user
          ? <Link to={home} className="btn btn-primary btn-sm">Go to Dashboard</Link>
          : <>
              <Link to="/signin" className="btn btn-outline btn-sm">Sign In</Link>
              <Link to="/signup" className="btn btn-orange btn-sm">Get Started</Link>
            </>
        }
      </div>
    </nav>
  )
}
