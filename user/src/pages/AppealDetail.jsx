import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { Loader2, AlertCircle, Clock, CheckCircle2, MapPin, ArrowLeft, Download } from 'lucide-react';
import { API_URL } from '../config';
import { catAz, priAz } from '../constants';


const downloadImage = async (url) => {
    try {
        const res = await fetch(url);
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = url.split('/').pop() || 'image';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(a.href);
    } catch { window.open(url, '_blank'); }
};

export default function AppealDetail() {
    const { id } = useParams();
    const [appeal, setAppeal] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAppeal = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/appeals/${id}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('asanToken')}` }
                });
                if (res.data.success) setAppeal(res.data.data.appeal);
            } catch {
                setError('Müraciət detalları yüklənmədi');
            }
        };
        fetchAppeal();
    }, [id]);

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

    if (error) return <div className="max-w-3xl mx-auto px-4 py-8"><div className="bg-red-50 text-red-600 p-4 rounded-xl">{error}</div></div>;
    if (!appeal) return <div className="flex justify-center mt-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    const isResolved = appeal.status === 'Resolved' && appeal.verification;

    return (
        <div className={`mx-auto px-4 py-6 sm:py-8 ${isResolved ? 'max-w-5xl' : 'max-w-3xl'}`}>
            <Link to="/my-appeals" className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 font-medium transition">
                <ArrowLeft className="w-5 h-5" /> Müraciətlərimə Qayıt
            </Link>

            <div className={isResolved ? 'grid grid-cols-1 sm:grid-cols-2 gap-6' : ''}>

                {/* Left: Before Photo + Appeal Details */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    {appeal.initialMediaId?.url && (
                        <div className="relative">
                            {isResolved && (
                                <span className="absolute top-3 left-3 bg-slate-800/70 text-white text-xs font-bold px-2.5 py-1 rounded-full uppercase">Əvvəl</span>
                            )}
                            <button onClick={() => downloadImage(`${API_URL}${appeal.initialMediaId.url}`)} className="absolute top-3 right-3 bg-white/80 hover:bg-white text-slate-700 p-2 rounded-full shadow transition">
                                <Download className="w-4 h-4" />
                            </button>
                            <img src={`${API_URL}${appeal.initialMediaId.url}`} alt="Müraciət" className="w-full max-h-72 object-cover" />
                        </div>
                    )}

                    <div className="p-4 sm:p-6 space-y-4 sm:space-y-5">
                        <div className="flex items-start justify-between gap-2">
                            <h1 className="text-xl sm:text-2xl font-bold text-slate-800">{appeal.title || appeal.category || 'Müraciət'}</h1>
                            <span className="shrink-0">{statusBadge(appeal.status)}</span>
                        </div>

                        {appeal.description && (
                            <div>
                                <label className="text-xs text-slate-500 font-semibold uppercase block mb-1">Təsvir</label>
                                <p className="text-slate-700 bg-slate-50 p-4 rounded-lg text-sm leading-relaxed">{appeal.description}</p>
                            </div>
                        )}

                        <div className={`grid ${isResolved ? 'grid-cols-2 gap-3' : 'grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4'}`}>
                            <div>
                                <label className="text-xs text-slate-500 font-semibold uppercase block mb-1">Kateqoriya</label>
                                <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded text-sm font-semibold">{catAz[appeal.category] || appeal.category || '—'}</span>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-semibold uppercase block mb-1">Prioritet</label>
                                <span className={`px-3 py-1 rounded text-sm font-semibold ${appeal.priority === 'Critical' ? 'bg-red-100 text-red-700' : appeal.priority === 'High' ? 'bg-orange-100 text-orange-700' : appeal.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                    {priAz[appeal.priority] || appeal.priority || '—'}
                                </span>
                            </div>
                            {appeal.location?.coordinates?.lat && (
                                <div>
                                    <label className="text-xs text-slate-500 font-semibold uppercase block mb-1">Məkan</label>
                                    <a href={`https://www.google.com/maps?q=${appeal.location.coordinates.lat},${appeal.location.coordinates.lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                                        <MapPin className="w-4 h-4" />
                                        {appeal.location.coordinates.lat.toFixed(5)}, {appeal.location.coordinates.lng.toFixed(5)}
                                    </a>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-4 text-sm text-slate-500 pt-2 border-t border-slate-100">
                            <span>Göndərilmə tarixi: {(() => { const d = new Date(appeal.createdAt); return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; })()}</span>
                        </div>

                        {appeal.status === 'Rejected' && appeal.rejectionReason && (
                            <div className="pt-4 border-t border-slate-100">
                                <h3 className="text-sm font-bold text-slate-800 uppercase mb-3">Rədd Səbəbi</h3>
                                <div className="bg-red-50 border border-red-200 p-4 rounded-xl flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="font-bold text-red-800">Müraciət Rədd Edildi</p>
                                        <p className="text-red-700 text-sm mt-1 leading-relaxed">{appeal.rejectionReason}</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: After Photo + Solve Details */}
                {isResolved && (
                    <div className="bg-white rounded-2xl shadow-sm border border-green-200 overflow-hidden">
                        {appeal.verification.resolutionMediaId?.url && (
                            <div className="relative">
                                <span className="absolute top-3 left-3 bg-green-600/80 text-white text-xs font-bold px-2.5 py-1 rounded-full uppercase">Sonra</span>
                                <button onClick={() => downloadImage(`${API_URL}${appeal.verification.resolutionMediaId.url}`)} className="absolute top-3 right-3 bg-white/80 hover:bg-white text-slate-700 p-2 rounded-full shadow transition">
                                    <Download className="w-4 h-4" />
                                </button>
                                <img src={`${API_URL}${appeal.verification.resolutionMediaId.url}`} alt="Həll" className="w-full max-h-72 object-cover" />
                            </div>
                        )}
                        <div className="flex items-center gap-2 px-4 sm:px-6 py-4 bg-green-50 border-b border-green-200">
                            <CheckCircle2 className="w-5 h-5 text-green-600" />
                            <span className="font-bold text-green-800 text-lg">Həll Təsdiqləndi</span>
                        </div>
                        <div className="p-4 sm:p-6 space-y-4">
                            <div className="flex items-center justify-between py-3 border-b border-slate-100">
                                <span className="text-sm text-slate-600">Eyni Məkan</span>
                                {appeal.verification.same_location ? (
                                    <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Bəli
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
                                        <AlertCircle className="w-3.5 h-3.5" /> Xeyr
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center justify-between py-3 border-b border-slate-100">
                                <span className="text-sm text-slate-600">Problem Həll Olunub</span>
                                {appeal.verification.issue_resolved ? (
                                    <span className="flex items-center gap-1 text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Bəli
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-xs font-bold text-red-700 bg-red-100 px-2.5 py-1 rounded-full">
                                        <AlertCircle className="w-3.5 h-3.5" /> Xeyr
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center justify-between py-3">
                                <span className="text-sm text-slate-600">Etibarlılıq</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-20 h-2 bg-green-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-green-600 rounded-full" style={{ width: `${Math.round(appeal.verification.confidence * 100)}%` }} />
                                    </div>
                                    <span className="text-xs font-bold text-green-700">{Math.round(appeal.verification.confidence * 100)}%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
