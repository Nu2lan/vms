import { Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import MyAppeals from './pages/MyAppeals';
import SubmitAppeal from './pages/SubmitAppeal';
import AppealDetail from './pages/AppealDetail';
import SSOCallback from './pages/SSOCallback';
import MockMyGovID from './pages/MockMyGovID';
import Navbar from './components/Navbar';
import MobileBottomNav from './components/MobileBottomNav';

// Check token validity (expiry)
function isTokenValid() {
  const token = localStorage.getItem('asanToken');
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('asanToken');
      localStorage.removeItem('asanUser');
      return false;
    }
    return true;
  } catch {
    localStorage.removeItem('asanToken');
    localStorage.removeItem('asanUser');
    return false;
  }
}

function App() {
  const [validToken, setValidToken] = useState(isTokenValid);

  // Re-check token when localStorage changes (e.g. after SSO callback)
  useEffect(() => {
    const handler = () => setValidToken(isTokenValid());
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  return (
    <Routes>
      <Route path="/auth/mygovid" element={<MockMyGovID />} />
      <Route path="*" element={
        <div className="flex flex-col h-full">
          <Navbar />
          <div className="flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={!validToken ? <Login /> : <Navigate to="/my-appeals" />} />
              <Route path="/register" element={!validToken ? <Register /> : <Navigate to="/my-appeals" />} />
              <Route path="/auth/callback" element={<SSOCallback />} />
              <Route path="/my-appeals" element={validToken ? <MyAppeals /> : <Navigate to="/login" />} />
              <Route path="/appeals/:id" element={validToken ? <AppealDetail /> : <Navigate to="/login" />} />
              <Route path="/submit" element={validToken ? <SubmitAppeal /> : <Navigate to="/login" />} />
            </Routes>
          </div>
          <MobileBottomNav />
        </div>
      } />
    </Routes>
  );
}

export default App;
