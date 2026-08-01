import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import UserManagement from './pages/UserManagement/UserManagement';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  const tokenExpiry = localStorage.getItem('tokenExpiry');
  const tokenIssuedAt = localStorage.getItem('tokenIssuedAt');
  
  // Verifica se o token existe e ainda é válido
  if (token && tokenExpiry && tokenIssuedAt) {
    const expiryTime = new Date(tokenIssuedAt).getTime() + (parseInt(tokenExpiry) * 1000);
    const now = new Date().getTime();
    
    if (now < expiryTime) {
      return children;
    }
    
    // Token expirado, limpa e redireciona
    localStorage.clear();
  }
  
  return <Navigate to="/" />;
}

function AdminRoute({ children }) {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');
  return token && role === 'Admin' ? children : <Navigate to="/dashboard" />;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route 
          path="/dashboard" 
          element={
            <PrivateRoute>
              <Dashboard />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/user-management" 
          element={
            <AdminRoute>
              <UserManagement />
            </AdminRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
