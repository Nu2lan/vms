import { useState, useEffect } from 'react';
import axios from 'axios';
import { Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';
import { API_URL } from '../config';

const API = `${API_URL}/api/auth`;
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem('asanAdminToken')}` });

export default function Users() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editUser, setEditUser] = useState(null);
    const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '' });
    const [error, setError] = useState('');
    const currentUserId = JSON.parse(localStorage.getItem('asanAdminUser') || '{}')._id;

    const fetchUsers = async () => {
        try {
            const res = await axios.get(`${API}/users`, { headers: headers() });
            if (res.data.success) setUsers(res.data.data.users);
        } catch { setError('İstifadəçilər yüklənmədi'); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchUsers(); }, []);

    const openCreate = () => {
        setEditUser(null);
        setForm({ firstName: '', lastName: '', email: '', password: '' });
        setShowModal(true);
        setError('');
    };

    const openEdit = (user) => {
        setEditUser(user);
        setForm({ firstName: user.firstName, lastName: user.lastName, email: user.email, password: '' });
        setShowModal(true);
        setError('');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        try {
            if (editUser) {
                await axios.put(`${API}/users/${editUser._id}`, form, { headers: headers() });
            } else {
                await axios.post(`${API}/users`, form, { headers: headers() });
            }
            setShowModal(false);
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Əməliyyat uğursuz oldu');
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Bu istifadəçini silmək istədiyinizə əminsiniz?')) return;
        try {
            await axios.delete(`${API}/users/${id}`, { headers: headers() });
            fetchUsers();
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Silmə uğursuz oldu');
        }
    };

    if (loading) return <div className="flex justify-center mt-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: '#7852ff' }} /></div>;

    return (
        <div>
            <div className="flex items-center justify-between mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Admin İstifadəçilər</h1>
                <button onClick={openCreate} className="text-white px-3 sm:px-4 py-2 rounded-lg font-medium hover:opacity-90 transition flex items-center gap-2 text-sm" style={{ backgroundColor: '#7852ff' }}>
                    <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Admin Əlavə Et</span><span className="sm:hidden">Əlavə Et</span>
                </button>
            </div>

            {error && <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl">{error}</div>}

            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Ad</th>
                            <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Email</th>
                            <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Rol</th>
                            <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Əməliyyatlar</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {users.map((u) => (
                            <tr key={u._id} className="hover:bg-slate-50 transition">
                                <td className="px-6 py-4 font-semibold text-slate-800">{u.firstName} {u.lastName}</td>
                                <td className="px-6 py-4 text-slate-600">{u.email}</td>
                                <td className="px-6 py-4"><span className="px-2 py-1 rounded text-xs font-bold uppercase" style={{ backgroundColor: '#7852ff20', color: '#7852ff' }}>{u.role}</span></td>
                                <td className="px-6 py-4 flex gap-2">
                                    <button onClick={() => openEdit(u)} className="p-2 hover:bg-purple-50 rounded-lg transition" style={{ color: '#7852ff' }}><Pencil className="w-4 h-4" /></button>
                                    {u._id !== currentUserId && (
                                        <button onClick={() => handleDelete(u._id)} className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition"><Trash2 className="w-4 h-4" /></button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
                {users.map((u) => (
                    <div key={u._id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-slate-800">{u.firstName} {u.lastName}</h3>
                            <span className="px-2 py-1 rounded text-xs font-bold uppercase" style={{ backgroundColor: '#7852ff20', color: '#7852ff' }}>{u.role}</span>
                        </div>
                        <p className="text-sm text-slate-500 mb-3">{u.email}</p>
                        <div className="flex gap-2">
                            <button onClick={() => openEdit(u)} className="flex-1 text-sm font-medium py-2 rounded-lg transition flex items-center justify-center gap-1" style={{ color: '#7852ff', backgroundColor: '#7852ff10' }}>
                                <Pencil className="w-3.5 h-3.5" /> Redaktə
                            </button>
                            {u._id !== currentUserId && (
                                <button onClick={() => handleDelete(u._id)} className="flex-1 bg-red-50 text-red-600 text-sm font-medium py-2 rounded-lg hover:bg-red-100 transition flex items-center justify-center gap-1">
                                    <Trash2 className="w-3.5 h-3.5" /> Sil
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 sm:p-8 w-full max-w-md shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold">{editUser ? 'İstifadəçini Redaktə Et' : 'Admin Yarat'}</h2>
                            <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X className="w-5 h-5" /></button>
                        </div>
                        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl mb-4 text-sm">{error}</div>}
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} placeholder="Ad" className="w-full border border-slate-200 p-3 rounded-xl" required />
                            <input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} placeholder="Soyad" className="w-full border border-slate-200 p-3 rounded-xl" required />
                            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} type="email" placeholder="Email" className="w-full border border-slate-200 p-3 rounded-xl" required />
                            <input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} type="password" placeholder={editUser ? 'Yeni Şifrə (saxlamaq üçün boş buraxın)' : 'Şifrə'} className="w-full border border-slate-200 p-3 rounded-xl" {...(!editUser && { required: true })} />
                            <button type="submit" className="w-full text-white px-5 py-3 rounded-xl font-medium hover:opacity-90 transition" style={{ backgroundColor: '#7852ff' }}>
                                {editUser ? 'Yenilə' : 'Yarat'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
