import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { API_URL } from '../config';

export default function Register() {
    const navigate = useNavigate();
    const [form, setForm] = useState({ firstName: '', lastName: '', fin: '', password: '' });
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!/^[a-zA-Z0-9]{7}$/.test(form.fin)) {
            setError('FİN 7 simvoldan ibarət olmalıdır (yalnız hərf və rəqəm)');
            return;
        }
        try {
            const res = await axios.post(`${API_URL}/api/auth/register`, { ...form, role: 'citizen' });
            if (res.data.success) {
                const { token, _id, firstName, lastName } = res.data.data;
                localStorage.setItem('asanToken', token);
                localStorage.setItem('asanUser', JSON.stringify({ _id, firstName, lastName }));
                navigate('/my-appeals');
                window.location.reload();
            }
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Qeydiyyat uğursuz oldu');
        }
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
            <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-200 w-full max-w-md">
                <h1 className="text-2xl font-bold text-slate-800 mb-2">Hesab Yaradın</h1>
                <p className="text-slate-500 mb-8">Müraciət göndərmək üçün vətəndaş kimi qeydiyyatdan keçin</p>
                {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-6 text-sm">{error}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder="Ad" className="w-full border border-slate-200 p-3 rounded-xl" required />
                        <input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder="Soyad" className="w-full border border-slate-200 p-3 rounded-xl" required />
                    </div>
                    <input value={form.fin} onChange={e => setForm({ ...form, fin: e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 7) })} placeholder="FİN (7 simvol, hərf + rəqəm)" maxLength={7} className="w-full border border-slate-200 p-3 rounded-xl uppercase" required />
                    <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Şifrə" className="w-full border border-slate-200 p-3 rounded-xl" required />
                    <button type="submit" className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold hover:bg-blue-700 transition">Qeydiyyat</button>
                </form>
                <p className="text-center text-sm text-slate-500 mt-6">
                    Artıq hesabınız var? <Link to="/login" className="text-blue-600 font-medium hover:underline">Daxil Ol</Link>
                </p>
            </div>
        </div>
    );
}
