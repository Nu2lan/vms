import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LogIn } from 'lucide-react';
import { API_URL } from '../config';

export default function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
            if (res.data.success) {
                const { token, _id, role, firstName, lastName } = res.data.data;
                if (role !== 'admin') {
                    setError('Giriş qadağandır. Yalnız admin hesabları.');
                    return;
                }
                localStorage.setItem('asanAdminToken', token);
                localStorage.setItem('asanAdminUser', JSON.stringify({ _id, firstName, lastName }));
                navigate('/');
                window.location.reload();
            }
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Giriş uğursuz oldu');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a0a3e, #0f172a, #2d1070)' }}>
            <div className="bg-white/10 backdrop-blur-xl p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/20">
                <div className="text-center mb-8">
                    <img src="/logo.png" alt="ASAN AI HUB" className="h-16 mx-auto mb-4" />
                    <h1 className="text-2xl font-medium text-white">Admin</h1>
                    <p className="text-purple-200 mt-2">Müraciətləri idarə etmək üçün daxil olun</p>
                </div>

                {error && <div className="bg-red-500/20 text-red-200 p-3 rounded-xl mb-6 text-sm text-center">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 text-white placeholder-purple-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                    />
                    <input
                        type="password"
                        placeholder="Şifrə"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 text-white placeholder-purple-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                    />
                    <button type="submit" className="w-full text-white p-3 rounded-xl font-bold hover:opacity-90 transition" style={{ backgroundColor: '#7852ff' }}>
                        Daxil Ol
                    </button>
                </form>
            </div>
        </div>
    );
}
