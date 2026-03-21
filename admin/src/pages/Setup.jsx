import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck } from 'lucide-react';
import { API_URL } from '../config';

export default function Setup() {
    const navigate = useNavigate();
    const [fullName, setFullName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Şifrələr uyğun gəlmir');
            return;
        }

        if (password.length < 6) {
            setError('Şifrə minimum 6 simvol olmalıdır');
            return;
        }

        if (username.length < 3) {
            setError('İstifadəçi adı minimum 3 simvol olmalıdır');
            return;
        }

        setLoading(true);
        try {
            const res = await axios.post(`${API_URL}/api/auth/setup`, { fullName, username, password });
            if (res.data.success) {
                const { token, _id, role, firstName, lastName } = res.data.data;
                localStorage.setItem('asanAdminToken', token);
                localStorage.setItem('asanAdminUser', JSON.stringify({ _id, firstName, lastName }));
                navigate('/');
                window.location.reload();
            }
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Quraşdırma uğursuz oldu');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a0a3e, #0f172a, #2d1070)' }}>
            <div className="bg-white/10 backdrop-blur-xl p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/20">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#7852ff' }}>
                        <ShieldCheck className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-medium text-white">İlkin Quraşdırma</h1>
                    <p className="text-purple-200 mt-2">İlk admin hesabını yaradın</p>
                </div>

                {error && <div className="bg-red-500/20 text-red-200 p-3 rounded-xl mb-6 text-sm text-center">{error}</div>}

                <form onSubmit={handleSubmit} className="space-y-5">
                    <input
                        type="text"
                        placeholder="Ad Soyad"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 text-white placeholder-purple-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                    />
                    <input
                        type="text"
                        placeholder="İstifadəçi adı"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
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
                    <input
                        type="password"
                        placeholder="Şifrəni təkrarla"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full bg-white/10 border border-white/20 text-white placeholder-purple-300 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                        required
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full text-white p-3 rounded-xl font-bold hover:opacity-90 transition disabled:opacity-50"
                        style={{ backgroundColor: '#7852ff' }}
                    >
                        {loading ? 'Yaradılır...' : 'Admin Yarat'}
                    </button>
                </form>
            </div>
        </div>
    );
}
