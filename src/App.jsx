import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import Login from './components/Login';
import Signup from './components/Signup';

// Protected Route Component to enforce login-first philosophy
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('zencart_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

function Main() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('zencart_user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('zencart_token');
    localStorage.removeItem('zencart_user');
    navigate('/login');
  };

  return <DashboardLayout user={user} handleLogout={handleLogout} />;
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen w-full flex flex-col items-center justify-center p-4">
        <Routes>
          {/* Always land on login from root */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<ProtectedRoute><Main /></ProtectedRoute>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
