import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import CreateEvent from './pages/CreateEvent';
import EventDetails from './pages/EventDetails';
import Scanner from './pages/Scanner';
import NoiseOverlay from './components/NoiseOverlay';
import { Toaster } from './components/ui/sonner';
import '@/App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));

  useEffect(() => {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
  }, [token]);

  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const handleLogin = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <div className="App min-h-screen bg-[#050505]">
      <NoiseOverlay />
      <Toaster position="top-center" />
      <BrowserRouter>
        <Routes>
          <Route 
            path="/login" 
            element={
              !token ? <Login onLogin={handleLogin} /> : 
              user?.role === 'admin' ? <Navigate to="/dashboard" replace /> : 
              <Navigate to="/scanner" replace />
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              token && user?.role === 'admin' ? 
              <AdminDashboard token={token} user={user} onLogout={handleLogout} /> : 
              <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/create-event" 
            element={
              token && user?.role === 'admin' ? 
              <CreateEvent token={token} /> : 
              <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/events/:eventId" 
            element={
              token && user?.role === 'admin' ? 
              <EventDetails token={token} /> : 
              <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/scanner" 
            element={
              token ? 
              <Scanner token={token} onLogout={handleLogout} /> : 
              <Navigate to="/login" replace />
            } 
          />
          <Route 
            path="/" 
            element={
              <Navigate to={
                token ? (user?.role === 'admin' ? '/dashboard' : '/scanner') : '/login'
              } replace />
            } 
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;