import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { UploadCloud, CheckCircle, AlertTriangle, ArrowLeft, Loader2, MapPin, Camera, Image, X, Pencil, Download } from 'lucide-react';
import { API_URL } from '../config';
import { catAz, priAz, categories, priorities } from '../constants';


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

export default function VerifyAppeal() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [appeal, setAppeal] = useState(null);
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [isVerifying, setIsVerifying] = useState(false);
    const [error, setError] = useState('');
    const [showUpload, setShowUpload] = useState(false);
    const [showResult, setShowResult] = useState(false);
    const [cameraActive, setCameraActive] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({ title: '', description: '', category: '', priority: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [capturedFromCamera, setCapturedFromCamera] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null);
    const cameraInputRef = useRef(null);

    useEffect(() => {
        const fetchAppeal = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/appeals/${id}`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('asanAdminToken')}` }
                });
                if (res.data.success) {
                    setAppeal(res.data.data.appeal);
                }
            } catch {
                setError('Müraciət məlumatları yüklənmədi');
            }
        };
        fetchAppeal();
    }, [id]);

    const handleFileChange = (e) => {
        const selected = e.target.files[0];
        if (selected) {
            setFile(selected);
            setPreview(URL.createObjectURL(selected));
        }
    };

    const startCamera = async () => {
        setError('');
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
            // On mobile: trigger native camera app via file input
            if (cameraInputRef.current) cameraInputRef.current.click();
            return;
        }

        // Desktop: use getUserMedia webcam
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
            streamRef.current = stream;
            setCameraActive(true);
            setTimeout(() => {
                if (videoRef.current) videoRef.current.srcObject = stream;
            }, 100);
        } catch {
            setError('Kameraya daxil olmaq mümkün olmadı. Kamera icazəsini verin və ya Şəkil Yüklə seçimindən istifadə edin.');
        }
    };

    const handleNativeCameraCapture = (e) => {
        const selected = e.target.files[0];
        if (!selected) return;
        setFile(selected);
        setPreview(URL.createObjectURL(selected));
        setCapturedFromCamera(true);
        e.target.value = '';
    };

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    }, []);

    const capturePhoto = () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        stopCamera();
        canvas.toBlob((blob) => {
            const capturedFile = new File([blob], `resolution_${Date.now()}.jpg`, { type: 'image/jpeg' });
            setFile(capturedFile);
            setPreview(URL.createObjectURL(blob));
            setCapturedFromCamera(true);
        }, 'image/jpeg', 0.92);
    };

    const handleVerify = async () => {
        if (!file) return;
        setIsVerifying(true);
        setError('');
        const formData = new FormData();
        formData.append('resolutionMedia', file);
        if (capturedFromCamera) formData.append('capturedFromCamera', 'true');
        try {
            const res = await axios.post(`${API_URL}/api/appeals/${id}/verify`, formData, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('asanAdminToken')}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            if (res.data.success) {
                setAppeal(res.data.data.appeal);
                setShowResult(true);
            }
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Yoxlama uğursuz oldu.');
        } finally {
            setIsVerifying(false);
        }
    };

    if (!appeal && !error) return <div className="flex justify-center mt-20"><Loader2 className="w-8 h-8 animate-spin" style={{ color: '#7852ff' }} /></div>;

    return (
        <div className="max-w-5xl mx-auto">
            <Link to="/" className="inline-flex items-center gap-2 text-slate-500 hover:text-purple-600 mb-6 font-medium transition">
                <ArrowLeft className="w-5 h-5" /> Panelə Qayıt
            </Link>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 sm:mb-8 gap-3">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">Həllin Yoxlanması</h1>
                <span className={`px-3 sm:px-4 py-2 rounded-full font-bold text-xs sm:text-sm ${appeal?.status === 'Pending Review' ? 'bg-purple-100 text-purple-700' : appeal?.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    Status: {appeal?.status === 'Pending Review' ? 'Gözləmədə' : appeal?.status === 'Resolved' ? 'Həll olunub' : appeal?.status === 'Mismatch - Return Back' ? 'Uyğunsuzluq - Geri Qaytarılıb' : appeal?.status === 'Rejected' ? 'Rədd edilib' : appeal?.status}
                </span>
            </div>

            {error && <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl">{error}</div>}

            <div className="max-w-5xl mx-auto">
                {/* Show Reported Problem - always visible (except during upload) */}
                {!showUpload && (
                    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold text-slate-800 mb-6 pb-2 border-b flex items-center justify-between">
                            Bildirilən Problem
                            {!isEditing && (
                                <button onClick={() => { setEditForm({ title: appeal?.title || '', description: appeal?.description || '', category: appeal?.category || '', priority: appeal?.priority || '' }); setIsEditing(true); }} className="flex items-center gap-1 text-sm font-medium transition px-3 py-1.5 rounded-lg hover:bg-purple-50" style={{ color: '#7852ff' }}>
                                    <Pencil className="w-4 h-4" /> Redaktə et
                                </button>
                            )}
                        </h2>
                        <div className="grid md:grid-cols-2 gap-8">
                            <div>
                                <div className="relative">
                                    <button onClick={() => downloadImage(`${API_URL}${appeal?.initialMediaId?.url}`)} className="absolute top-3 right-3 bg-white/80 hover:bg-white text-slate-700 p-2 rounded-full shadow transition z-10">
                                        <Download className="w-4 h-4" />
                                    </button>
                                    <img
                                        src={`${API_URL}${appeal?.initialMediaId?.url}`}
                                        alt="Original Issue"
                                        className="w-full rounded-xl bg-slate-100 object-cover h-full max-h-[500px]"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col justify-between space-y-4">
                                <div className="space-y-4">
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-slate-500 font-semibold uppercase block mb-1">Vətəndaş Məlumatları</label>
                                            <p className="text-slate-800 font-medium">
                                                {appeal?.citizenId?.firstName} {appeal?.citizenId?.lastName}
                                                {(appeal?.citizenId?.email || appeal?.citizenId?.fin) && (
                                                    <span className="text-slate-500 font-normal ml-1">
                                                        ({appeal.citizenId.email || appeal.citizenId.fin})
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-xs text-slate-500 font-semibold uppercase block mb-1">Sİ Kateqoriya və Prioritet</label>
                                            <div className="flex gap-2 flex-wrap">
                                                <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-sm font-semibold">{catAz[appeal?.category] || appeal?.category}</span>
                                                <span className={`px-2 py-1 rounded text-sm font-semibold ${appeal?.priority === 'Critical' ? 'bg-red-100 text-red-700' : appeal?.priority === 'High' ? 'bg-orange-100 text-orange-700' : appeal?.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                                    {priAz[appeal?.priority] || appeal?.priority} Prioritet
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {appeal?.location?.coordinates?.lat && (
                                        <div>
                                            <label className="text-xs text-slate-500 font-semibold uppercase block mb-1">Məkan Məlumatları</label>
                                            <a href={`https://www.google.com/maps?q=${appeal.location.coordinates.lat},${appeal.location.coordinates.lng}`} target="_blank" rel="noopener noreferrer"
                                                className="inline-flex items-center gap-2 bg-slate-50 border border-slate-200 hover:border-purple-300 hover:bg-purple-50 text-slate-700 hover:text-purple-700 px-3 py-2 rounded-lg text-sm font-medium transition">
                                                <MapPin className="w-4 h-4" style={{ color: '#7852ff' }} />
                                                {appeal.location.coordinates.lat.toFixed(5)}, {appeal.location.coordinates.lng.toFixed(5)}
                                            </a>
                                        </div>
                                    )}
                                    <div>
                                        <label className="text-xs text-slate-500 font-semibold uppercase block mb-1">Sİ Başlıq</label>
                                        {isEditing ? (
                                            <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className="w-full border border-slate-200 p-2 rounded-lg text-slate-800 font-bold text-lg focus:outline-none focus:ring-2 focus:ring-purple-500" />
                                        ) : (
                                            <div className="font-bold text-slate-800 text-lg">{appeal?.title || appeal?.category}</div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-500 font-semibold uppercase block mb-1">Sİ Təsvir</label>
                                        {isEditing ? (
                                            <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={4} className="w-full border border-slate-200 p-3 rounded-lg text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
                                        ) : (
                                            <p className="text-slate-700 bg-slate-50 border border-slate-100 p-3 rounded-lg leading-relaxed text-sm">{appeal?.description}</p>
                                        )}
                                    </div>
                                    {isEditing && (
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs text-slate-500 font-semibold uppercase block mb-1">Kateqoriya</label>
                                                <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} className="w-full border border-slate-200 p-2 rounded-lg text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
                                                    {categories.map(c => <option key={c} value={c}>{catAz[c] || c}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-xs text-slate-500 font-semibold uppercase block mb-1">Prioritet</label>
                                                <select value={editForm.priority} onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })} className="w-full border border-slate-200 p-2 rounded-lg text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white">
                                                    {priorities.map(p => <option key={p} value={p}>{priAz[p] || p}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                {appeal?.status === 'Pending Review' && (
                                    <div className="pt-6 mt-4 border-t border-slate-100 flex gap-3">
                                        {isEditing ? (
                                            <>
                                                <button disabled={isSaving} onClick={async () => {
                                                    setIsSaving(true);
                                                    try {
                                                        const res = await axios.put(`${API_URL}/api/appeals/${id}`, editForm, { headers: { Authorization: `Bearer ${localStorage.getItem('asanAdminToken')}` } });
                                                        if (res.data.success) { setAppeal(res.data.data.appeal); setIsEditing(false); }
                                                    } catch (err) { setError(err.response?.data?.error?.message || 'Yeniləmə uğursuz oldu'); }
                                                    finally { setIsSaving(false); }
                                                }} className="flex-1 text-white font-bold py-4 rounded-xl hover:opacity-90 disabled:opacity-50 transition shadow-lg flex items-center justify-center gap-2" style={{ backgroundColor: '#7852ff' }}>
                                                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />} Yadda Saxla
                                                </button>
                                                <button onClick={() => setIsEditing(false)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-4 rounded-xl hover:bg-slate-200 transition shadow-lg">
                                                    Ləğv et
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => { setAppeal(prev => ({ ...prev, verification: null })); setShowUpload(true); }} className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-xl hover:opacity-90 transition shadow-lg flex items-center justify-center gap-2" style={{ backgroundColor: '#7852ff' }}>
                                                    <CheckCircle className="w-5 h-5" /> Həllə Keç
                                                </button>
                                                <button onClick={() => { setRejectReason(''); setShowRejectModal(true); }} className="flex-1 bg-red-600 text-white font-bold py-4 rounded-xl hover:bg-red-700 transition shadow-lg flex items-center justify-center gap-2">
                                                    <X className="w-5 h-5" /> Rədd et
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Reject Modal */}
                {showRejectModal && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-4">Müraciəti Rədd Et</h3>
                            <label className="text-sm text-slate-600 font-medium block mb-2">Rədd etmə səbəbi *</label>
                            <textarea
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                rows={4}
                                placeholder="Rədd etmə səbəbini daxil edin..."
                                className="w-full border border-slate-200 p-3 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none mb-4"
                            />
                            <div className="flex gap-3">
                                <button
                                    disabled={!rejectReason.trim()}
                                    onClick={async () => {
                                        try {
                                            await axios.put(`${API_URL}/api/appeals/${id}`, { status: 'Rejected', rejectionReason: rejectReason.trim() }, { headers: { Authorization: `Bearer ${localStorage.getItem('asanAdminToken')}` } });
                                            navigate('/');
                                        } catch (err) { setError(err.response?.data?.error?.message || 'Rədd etmə uğursuz oldu'); setShowRejectModal(false); }
                                    }}
                                    className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 disabled:opacity-50 transition"
                                >
                                    Rədd Et
                                </button>
                                <button onClick={() => setShowRejectModal(false)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition">
                                    Ləğv et
                                </button>
                            </div>
                        </div>
                    </div>
                )
                }


                {/* Step 2: Upload Form */}
                {showUpload && !appeal?.verification && (
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <div className="flex items-center gap-3 mb-4 border-b pb-2">
                            <button onClick={() => { setShowUpload(false); stopCamera(); }} className="p-1 hover:bg-slate-100 rounded-lg text-slate-500">
                                <ArrowLeft className="w-5 h-5" />
                            </button>
                            <h2 className="text-xl font-bold text-slate-800">Həll Mediasını Göndər</h2>
                        </div>
                        <p className="text-slate-500 text-sm mb-6">Görülən işin şəklini çəkin və ya yükləyin. Sİ onu yoxlayacaq.</p>

                        {/* Live Camera */}
                        {cameraActive && (
                            <div className="mb-6">
                                <div className="relative rounded-xl overflow-hidden bg-black">
                                    <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl" />
                                    <div className="absolute bottom-4 left-0 right-0 flex justify-center">
                                        <button onClick={capturePhoto} className="w-16 h-16 bg-white rounded-full border-4 hover:scale-105 transition shadow-lg flex items-center justify-center" style={{ borderColor: '#7852ff' }}>
                                            <div className="w-12 h-12 rounded-full" style={{ backgroundColor: '#7852ff' }} />
                                        </button>
                                    </div>
                                    <button onClick={stopCamera} className="absolute top-3 right-3 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 transition">
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Choose Method */}
                        {!preview && !cameraActive && (
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                {/* Hidden native camera input for mobile */}
                                <input
                                    ref={cameraInputRef}
                                    type="file"
                                    accept="image/*,video/*"
                                    capture="environment"
                                    onChange={handleNativeCameraCapture}
                                    className="hidden"
                                />
                                <button onClick={startCamera} className="border-2 border-dashed border-slate-300 rounded-xl p-8 hover:bg-purple-50 hover:border-purple-300 transition cursor-pointer flex flex-col items-center gap-3">
                                    <Camera className="w-10 h-10 text-purple-500" />
                                    <span className="font-semibold text-slate-700 text-sm">Şəkil/Video Çək</span>
                                </button>
                                <label className="border-2 border-dashed border-slate-300 rounded-xl p-8 hover:bg-purple-50 hover:border-purple-300 transition cursor-pointer flex flex-col items-center gap-3">
                                    <input type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
                                    <Image className="w-10 h-10 text-purple-500" />
                                    <span className="font-semibold text-slate-700 text-sm">Şəkil Yüklə</span>
                                </label>
                            </div>
                        )}

                        {/* Preview */}
                        {preview && !cameraActive && (
                            <div className="mb-6">
                                {file?.type?.startsWith('video') ? (
                                    <video src={preview} controls className="w-full rounded-xl max-h-64 bg-slate-100" />
                                ) : (
                                    <img src={preview} alt="Preview" className="w-full rounded-xl max-h-64 object-cover bg-slate-100" />
                                )}
                            </div>
                        )}

                        {!cameraActive && preview && (
                            <div className="flex gap-4">
                                <button onClick={handleVerify} disabled={!file || isVerifying} className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-xl disabled:opacity-50 hover:opacity-90 transition flex items-center justify-center gap-2 whitespace-nowrap" style={{ backgroundColor: '#7852ff' }}>
                                    {isVerifying ? <Loader2 className="w-5 h-5 animate-spin shrink-0" /> : <CheckCircle className="w-5 h-5 shrink-0" />}
                                    <span>{isVerifying ? 'Yoxlanılır...' : 'Həlli Yoxla'}</span>
                                </button>
                                <button onClick={() => { setFile(null); setPreview(null); }} className="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold py-4 rounded-xl transition">
                                    Şəkli Dəyiş
                                </button>
                            </div>
                        )}


                    </div>
                )}

                {/* Step 3: Result - only show after verification in current session */}
                {showResult && appeal?.verification && (
                    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h2 className="text-xl font-bold text-slate-800 mb-4 pb-2 border-b">Həll Nəticəsi</h2>
                        <div className={`p-4 rounded-xl mb-6 flex items-start gap-3 ${appeal.verification.mismatch_warning ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                            {appeal.verification.mismatch_warning ? <AlertTriangle className="w-6 h-6 text-red-600 shrink-0" /> : <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />}
                            <div>
                                <h4 className={`font-bold ${appeal.verification.mismatch_warning ? 'text-red-800' : 'text-green-800'}`}>
                                    {appeal.verification.mismatch_warning ? 'Uyğunsuzluq Aşkarlandı' : 'Təsdiqləndi – Həllə Hazır'}
                                </h4>
                                {appeal.verification.mismatch_warning ? (
                                    <ul className="text-sm mt-1 text-red-600 list-disc list-inside space-y-0.5">
                                        {!appeal.verification.same_location && <li>Şəkillər eyni məkandan deyil</li>}
                                        {!appeal.verification.issue_resolved && <li>Problem həll olunmayıb</li>}
                                        {appeal.verification.is_ai_generated && <li>Şəkil Sİ ilə yaradılmış və ya saxtalaşdırılmışdır</li>}
                                    </ul>
                                ) : (
                                    <p className="text-sm mt-1 text-green-600">Vizual müqayisəyə əsasən, Sİ yekun qərar verdi.</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className={`p-4 rounded-xl border ${appeal.verification.same_location ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Eyni Məkan</p>
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${appeal.verification.same_location ? 'bg-green-200' : 'bg-red-200'}`}>
                                        {appeal.verification.same_location ? <CheckCircle className="w-4 h-4 text-green-700" /> : <AlertTriangle className="w-4 h-4 text-red-700" />}
                                    </div>
                                    <span className={`font-bold text-lg ${appeal.verification.same_location ? 'text-green-700' : 'text-red-700'}`}>
                                        {appeal.verification.same_location ? 'Bəli' : 'Xeyr'}
                                    </span>
                                </div>
                            </div>
                            <div className={`p-4 rounded-xl border ${appeal.verification.issue_resolved ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Problem Həll Olunub</p>
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${appeal.verification.issue_resolved ? 'bg-green-200' : 'bg-red-200'}`}>
                                        {appeal.verification.issue_resolved ? <CheckCircle className="w-4 h-4 text-green-700" /> : <AlertTriangle className="w-4 h-4 text-red-700" />}
                                    </div>
                                    <span className={`font-bold text-lg ${appeal.verification.issue_resolved ? 'text-green-700' : 'text-red-700'}`}>
                                        {appeal.verification.issue_resolved ? 'Bəli' : 'Xeyr'}
                                    </span>
                                </div>
                            </div>
                            <div className={`p-4 rounded-xl border ${appeal.verification.is_ai_generated ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Sİ ilə Yaradılıb / Saxtalaşdırılıb</p>
                                <div className="flex items-center gap-2">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${appeal.verification.is_ai_generated ? 'bg-red-200' : 'bg-green-200'}`}>
                                        {appeal.verification.is_ai_generated ? <AlertTriangle className="w-4 h-4 text-red-700" /> : <CheckCircle className="w-4 h-4 text-green-700" />}
                                    </div>
                                    <span className={`font-bold text-lg ${appeal.verification.is_ai_generated ? 'text-red-700' : 'text-green-700'}`}>
                                        {appeal.verification.is_ai_generated ? 'Bəli' : 'Xeyr'}
                                    </span>
                                </div>

                            </div>
                            <div className="p-4 rounded-xl border bg-purple-50 border-purple-200">
                                <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Sİ Etibarlılıq</p>
                                <div className="flex items-center gap-3">
                                    <span className="font-bold text-2xl" style={{ color: '#7852ff' }}>{Math.round(appeal.verification.confidence * 100)}%</span>
                                    <div className="flex-1 bg-purple-200 rounded-full h-2.5">
                                        <div className="h-2.5 rounded-full transition-all" style={{ width: `${Math.round(appeal.verification.confidence * 100)}%`, backgroundColor: '#7852ff' }} />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {appeal.verification.mismatch_warning && (
                            <div className="flex gap-4 mt-8">
                                <button
                                    onClick={() => {
                                        setAppeal(prev => ({ ...prev, verification: null }));
                                        setShowUpload(true);
                                        setFile(null);
                                        setPreview(null);
                                    }}
                                    className="flex-1 text-white hover:opacity-90 font-bold py-3 rounded-xl transition flex justify-center items-center gap-2"
                                    style={{ backgroundColor: '#7852ff' }}
                                >
                                    <UploadCloud className="w-5 h-5" /> Yenidən Cəhd Et
                                </button>
                                <button onClick={() => navigate('/')} className="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold py-3 rounded-xl transition">
                                    Panelə Qayıt
                                </button>
                            </div>
                        )}

                        {!appeal.verification.mismatch_warning && (
                            <div className="flex gap-4 mt-8">
                                {appeal.status !== 'Resolved' && (
                                    <button
                                        onClick={async () => {
                                            setError('');
                                            try {
                                                const res = await axios.post(`${API_URL}/api/appeals/${appeal._id}/resolve`, {}, {
                                                    headers: { Authorization: `Bearer ${localStorage.getItem('asanAdminToken')}` }
                                                });
                                                if (res.data.success) setAppeal(res.data.data.appeal);
                                            } catch (err) {
                                                setError(err.response?.data?.error?.message || 'Həll etmə uğursuz oldu.');
                                            }
                                        }}
                                        className="flex-1 text-white hover:opacity-90 font-bold py-3 rounded-xl transition flex justify-center items-center gap-2"
                                        style={{ backgroundColor: '#7852ff' }}
                                    >
                                        <CheckCircle className="w-5 h-5" /> Müraciəti Həll Et
                                    </button>
                                )}
                                <button onClick={() => navigate('/')} className="flex-1 bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold py-3 rounded-xl transition">
                                    Panelə Qayıt
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
