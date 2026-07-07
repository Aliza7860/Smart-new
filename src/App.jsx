import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ProtectedRoute } from './components/layout/Guards'

// Public
import { Home, Businesses, BusinessDetail } from './pages/public/Public'
import { Login, Register } from './pages/public/Auth'

// Customer
import { CustomerDashboard, MyAppointments, Book, Profile } from './pages/customer/Customer'

// Business Owner
import { BusinessDashboard, BusinessAppointments, BusinessServices, BusinessStaff } from './pages/business/Business'

// Super Admin
import { AdminDashboard, AdminBusinesses, AdminUsers, AdminAppointments } from './pages/admin/Admin'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* ── Public ── */}
            <Route path="/"                element={<Home />} />
            <Route path="/businesses"      element={<Businesses />} />
            <Route path="/businesses/:id"  element={<BusinessDetail />} />
            <Route path="/signin"          element={<Login />} />
            <Route path="/signup"          element={<Register />} />

            {/* ── Customer ── */}
            <Route path="/dashboard"       element={<ProtectedRoute roles={['customer']}><CustomerDashboard /></ProtectedRoute>} />
            <Route path="/my-appointments" element={<ProtectedRoute roles={['customer']}><MyAppointments /></ProtectedRoute>} />
            <Route path="/book"            element={<ProtectedRoute roles={['customer']}><Book /></ProtectedRoute>} />
            <Route path="/profile"         element={<ProtectedRoute><Profile /></ProtectedRoute>} />

            {/* ── Business Owner ── */}
            <Route path="/business/dashboard"    element={<ProtectedRoute roles={['business_owner']}><BusinessDashboard /></ProtectedRoute>} />
            <Route path="/business/appointments" element={<ProtectedRoute roles={['business_owner']}><BusinessAppointments /></ProtectedRoute>} />
            <Route path="/business/services"     element={<ProtectedRoute roles={['business_owner']}><BusinessServices /></ProtectedRoute>} />
            <Route path="/business/staff"        element={<ProtectedRoute roles={['business_owner']}><BusinessStaff /></ProtectedRoute>} />

            {/* ── Super Admin ── */}
            <Route path="/admin/dashboard"    element={<ProtectedRoute roles={['super_admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/businesses"   element={<ProtectedRoute roles={['super_admin']}><AdminBusinesses /></ProtectedRoute>} />
            <Route path="/admin/users"        element={<ProtectedRoute roles={['super_admin']}><AdminUsers /></ProtectedRoute>} />
            <Route path="/admin/appointments" element={<ProtectedRoute roles={['super_admin']}><AdminAppointments /></ProtectedRoute>} />

            {/* ── Fallback ── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
