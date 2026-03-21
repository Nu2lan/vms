import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader2, AlertCircle, Clock, CheckCircle2 } from 'lucide-react';
import { API_URL } from '../config';
import { catAz, priAz } from '../constants';


export default function Dashboard() {
    const navigate = useNavigate();
    const [appeals, setAppeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAppeals = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/appeals`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('asanAdminToken')}` }
                });
                if (res.data.success) {
                    setAppeals(res.data.data.appeals);
                }
            } catch (err) {
                setError('Müraciətlər yüklənmədi');
            } finally {
                setLoading(false);
            }
        };
        fetchAppeals();
        const interval = setInterval(fetchAppeals, 10000);
        return () => clearInterval(interval);
    }, []);

    const statusBadge = (status) => {
        switch (status) {
            case 'Resolved':
                return <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold"><CheckCircle2 className="w-3 h-3" /> Həll olunub</span>;
            case 'Pending Review':
                return <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold" style={{ backgroundColor: '#7852ff20', color: '#7852ff' }}><Clock className="w-3 h-3" /> Gözləmədə</span>;
            case 'Rejected':
                return <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold"><AlertCircle className="w-3 h-3" /> Rədd edilib</span>;
            default:
                return <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold"><AlertCircle className="w-3 h-3" /> {status === 'Mismatch - Return Back' ? 'Uyğunsuzluq - Geri Qaytarılıb' : status}</span>;
        }
    };

    const formatDate = (d) => {
        const date = new Date(d);
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    };

    if (loading) return <div className="flex justify-center mt-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: '#7852ff' }} /></div>;

    return (
        <div>
            <div className="flex items-center justify-between mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Müraciətlər Paneli</h1>
                <span className="px-3 sm:px-4 py-2 rounded-full font-bold text-sm" style={{ backgroundColor: '#7852ff20', color: '#7852ff' }}>Cəmi: {appeals.length}</span>
            </div>

            {error && <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl">{error}</div>}

            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Başlıq</th>
                            <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Kateqoriya</th>
                            <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Prioritet</th>
                            <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Vətəndaş</th>
                            <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                            <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Tarix</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {appeals.map((appeal) => (
                            <tr
                                key={appeal._id}
                                onClick={() => navigate(`/verify/${appeal._id}`)}
                                className="hover:bg-purple-50/50 cursor-pointer transition"
                            >
                                <td className="px-6 py-4 font-semibold text-slate-800">{appeal.title || appeal.category || '—'}</td>
                                <td className="px-6 py-4">
                                    <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-sm font-medium">{catAz[appeal.category] || appeal.category || '—'}</span>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded text-sm font-semibold ${appeal.priority === 'Critical' ? 'bg-red-100 text-red-700' : appeal.priority === 'High' ? 'bg-orange-100 text-orange-700' : appeal.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                        {priAz[appeal.priority] || appeal.priority || '—'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-600 text-sm">
                                    {appeal.citizenId?.firstName} {appeal.citizenId?.lastName}
                                </td>
                                <td className="px-6 py-4">{statusBadge(appeal.status)}</td>
                                <td className="px-6 py-4 text-slate-500 text-sm">{formatDate(appeal.createdAt)}</td>
                            </tr>
                        ))}
                        {appeals.length === 0 && (
                            <tr><td colSpan="6" className="text-center py-12 text-slate-400">Müraciət tapılmadı</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
                {appeals.map((appeal) => (
                    <div
                        key={appeal._id}
                        onClick={() => navigate(`/verify/${appeal._id}`)}
                        className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 cursor-pointer active:bg-purple-50/50 transition"
                    >
                        <div className="flex items-start justify-between mb-2">
                            <h3 className="font-semibold text-slate-800 text-sm flex-1 mr-2">{appeal.title || appeal.category || '—'}</h3>
                            {statusBadge(appeal.status)}
                        </div>
                        <div className="flex flex-wrap gap-2 mb-2">
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-medium">{catAz[appeal.category] || appeal.category || '—'}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${appeal.priority === 'Critical' ? 'bg-red-100 text-red-700' : appeal.priority === 'High' ? 'bg-orange-100 text-orange-700' : appeal.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                {priAz[appeal.priority] || appeal.priority || '—'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{appeal.citizenId?.firstName} {appeal.citizenId?.lastName}</span>
                            <span>{formatDate(appeal.createdAt)}</span>
                        </div>
                    </div>
                ))}
                {appeals.length === 0 && (
                    <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">Müraciət tapılmadı</div>
                )}
            </div>
        </div>
    );
}
