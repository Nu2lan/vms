import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import VerifyAppeal from './pages/VerifyAppeal';
import Layout from './components/Layout';

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

  return (
    <Routes>
      <Route path="/login" element={!validToken ? <Login /> : <Navigate to="/" />} />
      <Route element={validToken ? <Layout /> : <Navigate to="/login" />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/users" element={<Users />} />
        <Route path="/verify/:id" element={<VerifyAppeal />} />
      </Route>
    </Routes>
  );
}

export default App;
