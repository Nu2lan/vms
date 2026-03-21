import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Loader2, Clock, CheckCircle2, AlertCircle, PlusCircle } from 'lucide-react';
import { API_URL } from '../config';
import { catAz, priAz } from '../constants';


export default function MyAppeals() {
    const [appeals, setAppeals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAppeals = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/appeals`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('asanToken')}` }
                });
                if (res.data.success) {
                    setAppeals(res.data.data.appeals);
                }
            } catch {
                setError('Müraciətlər yüklənmədi');
            } finally {
                setLoading(false);
            }
        };
        fetchAppeals();
    }, []);

    const statusBadge = (status) => {
        switch (status) {
            case 'Resolved':
                return <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold"><CheckCircle2 className="w-3 h-3" /> Həll olunub</span>;
            case 'Pending Review':
                return <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-xs font-bold"><Clock className="w-3 h-3" /> Gözləmədə</span>;
            case 'Rejected':
                return <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold"><AlertCircle className="w-3 h-3" /> Rədd edilib</span>;
            default:
                return <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold"><AlertCircle className="w-3 h-3" /> {status === 'Mismatch - Return Back' ? 'Uyğunsuzluq - Geri Qaytarılıb' : status}</span>;
        }
    };

    if (loading) return <div className="flex justify-center mt-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Müraciətlərim</h1>
                <Link to="/submit" className="bg-blue-600 text-white px-3 sm:px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2 text-sm">
                    <PlusCircle className="w-4 h-4" /> <span className="hidden sm:inline">Yeni Müraciət</span><span className="sm:hidden">Yeni</span>
                </Link>
            </div>

            {error && <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl">{error}</div>}

            {appeals.length === 0 ? (
                <div className="text-center py-20">
                    <p className="text-slate-400 text-lg mb-4">Hələ heç bir müraciət göndərməmisiniz.</p>
                    <Link to="/submit" className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition">İlk Müraciətinizi Göndərin</Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {appeals.map((appeal) => (
                        <Link key={appeal._id} to={`/appeals/${appeal._id}`} className="block bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200 flex gap-3 sm:gap-4 hover:border-blue-300 hover:shadow-md transition cursor-pointer">
                            {appeal.initialMediaId?.url && (
                                <img src={`${API_URL}${appeal.initialMediaId.url}`} alt="" className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl object-cover bg-slate-100 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                    <h3 className="font-bold text-slate-800 text-lg truncate">{appeal.title || appeal.category || 'Müraciət'}</h3>
                                    {statusBadge(appeal.status)}
                                </div>
                                <p className="text-slate-500 text-sm mt-1 line-clamp-2">{appeal.description}</p>
                                <div className="flex items-center gap-3 mt-3">
                                    {appeal.category && <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs font-medium">{catAz[appeal.category] || appeal.category}</span>}
                                    {appeal.priority && <span className={`px-2 py-1 rounded text-xs font-semibold ${appeal.priority === 'Critical' ? 'bg-red-100 text-red-700' : appeal.priority === 'High' ? 'bg-orange-100 text-orange-700' : appeal.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>{priAz[appeal.priority] || appeal.priority}</span>}
                                    <span className="text-slate-400 text-xs">{(() => { const d = new Date(appeal.createdAt); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`; })()}</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
