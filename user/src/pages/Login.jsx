import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

export default function Login() {
    const navigate = useNavigate();
    const [fin, setFin] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!/^[a-zA-Z0-9]{7}$/.test(fin)) {
            setError('FİN 7 simvoldan ibarət olmalıdır (yalnız hərf və rəqəm)');
            return;
        }
        try {
            const res = await axios.post(`${API_URL}/api/auth/login`, { fin, password });
            if (res.data.success) {
                const { token, _id, role, firstName, lastName, fin: userFin } = res.data.data;
                if (role !== 'citizen') {
                    setError('Bu portal yalnız vətəndaşlar üçündür.');
                    return;
                }
                localStorage.setItem('asanToken', token);
                localStorage.setItem('asanUser', JSON.stringify({ _id, firstName, lastName, fin: userFin }));
                navigate('/my-appeals');
                window.location.reload();
            }
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Giriş uğursuz oldu');
        }
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
            <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-200 w-full max-w-md">
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Xoş Gəldiniz</h1>
                <p className="text-slate-500 mb-8">Davam etmək üçün FİN ilə daxil olun</p>
                {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-6 text-sm">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-5">
                    <input value={fin} onChange={(e) => setFin(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 7))} placeholder="FİN (məs. ABC1234)" maxLength={7} className="w-full border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase" required />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Şifrə" className="w-full border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                    <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 transition">Daxil Ol</button>
                </form>

                <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-xs text-slate-400 font-medium">və ya</span>
                    <div className="flex-1 h-px bg-slate-200" />
                </div>

                <Link to="/auth/mygovid" className="w-full border border-slate-200 p-3 rounded-xl font-semibold text-slate-700 hover:bg-slate-50 transition flex items-center justify-center gap-3">
                    <img src="/mygovid.svg" alt="myGov ID" className="h-5" />
                </Link>

                <p className="text-center text-sm text-slate-500 mt-6">
                    Hesabınız yoxdur? <Link to="/register" className="text-blue-600 font-medium hover:underline">Qeydiyyat</Link>
                </p>
            </div>
        </div>
    );
}
