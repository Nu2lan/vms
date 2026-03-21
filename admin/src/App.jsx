import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import axios from 'axios';
import Login from './pages/Login';
import Setup from './pages/Setup';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import VerifyAppeal from './pages/VerifyAppeal';
import Layout from './components/Layout';
import { API_URL } from './config';

// Check token validity (expiry)
function isTokenValid() {
  const token = localStorage.getItem('asanAdminToken');
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      // Token expired — clear storage
      localStorage.removeItem('asanAdminToken');
      localStorage.removeItem('asanAdminUser');
      return false;
    }
    return true;
  } catch {
    localStorage.removeItem('asanAdminToken');
    localStorage.removeItem('asanAdminUser');
    return false;
  }
}

function App() {
  const validToken = isTokenValid();
  const [needsSetup, setNeedsSetup] = useState(null); // null = loading

  useEffect(() => {
    axios.get(`${API_URL}/api/auth/setup-status`)
      .then(res => {
        if (res.data.success) {
          setNeedsSetup(res.data.data.needsSetup);
        }
      })
      .catch(() => {
        setNeedsSetup(false); // fallback: assume setup done if API fails
      });
  }, []);

  // Show nothing while checking setup status
  if (needsSetup === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a0a3e, #0f172a, #2d1070)' }}>
        <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // If no admin exists, redirect everything to setup
  if (needsSetup) {
    return (
      <Routes>
        <Route path="/setup" element={<Setup />} />
        <Route path="*" element={<Navigate to="/setup" />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={!validToken ? <Login /> : <Navigate to="/" />} />
      <Route path="/setup" element={<Navigate to="/" />} />
      <Route element={validToken ? <Layout /> : <Navigate to="/login" />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={<Users />} />
        <Route path="/verify/:id" element={<VerifyAppeal />} />
      </Route>
    </Routes>
  );
}

export default App;
