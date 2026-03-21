import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import MyAppeals from './pages/MyAppeals';
import SubmitAppeal from './pages/SubmitAppeal';
import AppealDetail from './pages/AppealDetail';
import Navbar from './components/Navbar';

// Check token validity (expiry)
function isTokenValid() {
  const token = localStorage.getItem('asanToken');
  if (!token) return false;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      // Token expired — clear storage
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
  const validToken = isTokenValid();

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={!validToken ? <Login /> : <Navigate to="/my-appeals" />} />
        <Route path="/register" element={!validToken ? <Register /> : <Navigate to="/my-appeals" />} />
        <Route path="/my-appeals" element={validToken ? <MyAppeals /> : <Navigate to="/login" />} />
        <Route path="/appeals/:id" element={validToken ? <AppealDetail /> : <Navigate to="/login" />} />
        <Route path="/submit" element={validToken ? <SubmitAppeal /> : <Navigate to="/login" />} />
      </Routes>
    </>
  );
}

export default App;
