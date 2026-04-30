import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import exifr from 'exifr';
import { UploadCloud, Loader2, CheckCircle, MapPin, Camera, Image, X } from 'lucide-react';
import { API_URL } from '../config';
import { catAz, priAz } from '../constants';


export default function SubmitAppeal() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1=upload, 2=review, 3=done
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState(null);
    const [analysisResult, setAnalysisResult] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [warning, setWarning] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [location, setLocation] = useState(null);
    const [locationSource, setLocationSource] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);
    const videoRef = useRef(null);
    const streamRef = useRef(null);

    // Try to extract GPS from image EXIF data
    const extractExifLocation = async (imageFile) => {
        try {
            const gps = await exifr.gps(imageFile);
            if (gps && gps.latitude && gps.longitude) {
                return { lat: gps.latitude, lng: gps.longitude };
            }
        } catch {
            // No EXIF data
        }
        return null;
    };

    // Ask browser for GPS location
    const getBrowserLocation = () => {
        return new Promise((resolve) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    () => resolve(null),
                    { enableHighAccuracy: true, timeout: 10000 }
                );
            } else {
                resolve(null);
            }
        });
    };

    // Open device camera — native app on mobile, getUserMedia on desktop
    const cameraInputRef = useRef(null);

    const startCamera = async () => {
        setError('');
        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        if (isMobile) {
            // On mobile: trigger native camera app via file input
            if (cameraInputRef.current) cameraInputRef.current.click();
            return;
        }

        // Desktop: use getUserMedia webcam
        const browserLoc = await getBrowserLocation();
        if (browserLoc) {
            setLocation(browserLoc);
            setLocationSource('gps');
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
            });
            streamRef.current = stream;
            setCameraActive(true);
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            }, 100);
        } catch {
            setError('Kameraya daxil olmaq mümkün olmadı. Kamera icazəsini verin və ya Şəkil Yüklə seçimindən istifadə edin.');
        }
    };

    const handleNativeCameraCapture = async (e) => {
        const selected = e.target.files[0];
        if (!selected) return;
        setFile(selected);
        setPreview(URL.createObjectURL(selected));
        setLocation(null);
        setLocationSource(null);

        // Try GPS first, then EXIF
        const browserLoc = await getBrowserLocation();
        if (browserLoc) {
            setLocation(browserLoc);
            setLocationSource('gps');
            return;
        }
        const exifLoc = await extractExifLocation(selected);
        if (exifLoc) {
            setLocation(exifLoc);
            setLocationSource('exif');
        }
        // Reset input value so same file can be selected again
        e.target.value = '';
    };

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setCameraActive(false);
    }, []);

    const capturePhoto = async () => {
        if (!videoRef.current) return;
        const video = videoRef.current;
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);

        stopCamera();

        canvas.toBlob((blob) => {
            const capturedFile = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
            setFile(capturedFile);
            setPreview(URL.createObjectURL(blob));
            // Location was already captured in startCamera
        }, 'image/jpeg', 0.92);
    };

    const handleFileChange = async (e) => {
        const selected = e.target.files[0];
        if (!selected) return;
        setFile(selected);
        setPreview(URL.createObjectURL(selected));
        setLocation(null);
        setLocationSource(null);

        // Uploaded file — try EXIF first
        const exifLoc = await extractExifLocation(selected);
        if (exifLoc) {
            setLocation(exifLoc);
            setLocationSource('exif');
            return;
        }

    };

    const handleAnalyze = async () => {
        if (!file) return;
        setIsAnalyzing(true);
        setError('');

        const formData = new FormData();
        formData.append('media', file);

        try {
            const res = await axios.post(`${API_URL}/api/appeals/analyze`, formData, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('asanToken')}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            if (res.data.success) {
                const data = res.data.data;
                if (!data.aiAnalysis || !data.aiAnalysis.title) {
                    setError('Sİ təhlil nəticəsi düzgün qaytarılmadı. Yenidən cəhd edin.');
                    return;
                }
                if (data.aiAnalysis.no_problem_detected) {
                    setWarning('ASAN xidmətin həll edəcəyi bir problem görünmür. Zəhmət olmasa, ASAN xidmətin həll edə biləcəyi bir problem olan şəkil yükləyin.');
                } else {
                    setWarning('');
                }
                setAnalysisResult({
                    analysis: data.aiAnalysis,
                    mediaId: data.mediaId,
                    location: location
                });
                setStep(2);
            }
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Təhlil uğursuz oldu.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        setError('');
        try {
            const payload = {
                mediaId: analysisResult.mediaId,
                aiAnalysis: {
                    title: analysisResult.analysis.title,
                    description: analysisResult.analysis.description,
                    category: analysisResult.analysis.category,
                    priority: analysisResult.analysis.priority,
                    location: {
                        ...analysisResult.analysis.location,
                        coordinates: analysisResult.location
                    },
                    confidence_scores: analysisResult.analysis.confidence_scores
                }
            };
            const res = await axios.post(`${API_URL}/api/appeals`, payload, {
                headers: { Authorization: `Bearer ${localStorage.getItem('asanToken')}` }
            });
            if (res.data.success) {
                setStep(3);
            }
        } catch (err) {
            setError(err.response?.data?.error?.message || 'Göndərmə uğursuz oldu.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 mb-6 sm:mb-8">Müraciət Göndər</h1>

            {warning && <div className="mb-6 bg-yellow-50 text-yellow-700 border border-yellow-200 p-4 rounded-xl flex items-start gap-2"><span>⚠️</span><span>{warning}</span></div>}
            {error && <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl">{error}</div>}

            {/* Step 1: Upload */}
            {step === 1 && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Sübut Yüklə</h2>
                    <p className="text-slate-500 text-sm mb-6">Problemin şəklini çəkin və ya yükləyin. Məkan avtomatik aşkarlanacaq.</p>

                    {/* Live Camera View */}
                    {cameraActive && (
                        <div className="mb-6">
                            <div className="relative rounded-xl overflow-hidden bg-black">
                                <video ref={videoRef} autoPlay playsInline muted className="w-full rounded-xl" />
                                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                                    <button onClick={capturePhoto} className="w-16 h-16 bg-white rounded-full border-4 border-blue-600 hover:scale-105 transition shadow-lg flex items-center justify-center">
                                        <div className="w-12 h-12 bg-blue-600 rounded-full" />
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
                            <button onClick={startCamera} className="border-2 border-dashed border-slate-300 rounded-xl p-8 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer flex flex-col items-center gap-3">
                                <Camera className="w-10 h-10 text-blue-500" />
                                <span className="font-semibold text-slate-700 text-sm">Şəkil/Video Çək</span>
                                <span className="text-slate-400 text-xs">GPS istifadə edir</span>
                            </button>
                            <label className="border-2 border-dashed border-slate-300 rounded-xl p-8 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer flex flex-col items-center gap-3">
                                <input type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" />
                                <Image className="w-10 h-10 text-blue-500" />
                                <span className="font-semibold text-slate-700 text-sm">Şəkil Yüklə</span>
                                <span className="text-slate-400 text-xs">Şəkil EXIF istifadə edir</span>
                            </label>
                        </div>
                    )}

                    {/* Preview */}
                    {preview && !cameraActive && (
                        <div className="mb-6">
                            {file?.type?.startsWith('video') ? (
                                <video src={preview} controls className="w-full rounded-xl max-h-64 bg-slate-100 mb-4" />
                            ) : (
                                <img src={preview} alt="Preview" className="w-full rounded-xl max-h-64 object-cover bg-slate-100 mb-4" />
                            )}
                            <div className="flex items-center">
                                {location ? (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-green-500" />
                                        <span className="text-sm text-slate-600">{location.lat.toFixed(5)}, {location.lng.toFixed(5)}</span>
                                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${locationSource === 'exif' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>
                                            {locationSource === 'exif' ? 'Şəkil EXIF-dən' : 'GPS-dən'}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-orange-400" />
                                        <span className="text-sm text-orange-500">Məkan aşkarlanmadı</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {!cameraActive && preview && (
                        <div className="flex gap-4">
                            <button onClick={handleAnalyze} disabled={!file || isAnalyzing} className="flex-1 bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
                                {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                                {isAnalyzing ? 'Təhlil edilir...' : 'Təhlil et'}
                            </button>
                            <button onClick={() => { setFile(null); setPreview(null); setLocation(null); setLocationSource(null); }} className="flex-1 bg-slate-100 text-slate-700 font-bold py-4 rounded-xl hover:bg-slate-200 transition">
                                Dəyiş
                            </button>
                        </div>
                    )}

                    {!cameraActive && !preview && (
                        <button onClick={handleAnalyze} disabled={!file || isAnalyzing} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
                            {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                            {isAnalyzing ? 'Təhlil edilir...' : 'Təhlil et'}
                        </button>
                    )}
                </div>
            )}

            {/* Step 2: Review */}
            {step === 2 && analysisResult && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-slate-800">Sİ Təhlil Nəticəsi</h2>
                        <button onClick={() => setIsEditing(!isEditing)} className={`text-sm font-medium px-3 py-1.5 rounded-lg transition ${isEditing ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                            {isEditing ? 'Hazır' : 'Redaktə'}
                        </button>
                    </div>

                    <img src={preview} alt="Uploaded" className="w-full rounded-xl mb-6 max-h-64 object-cover bg-slate-100" />

                    <div className="space-y-4 mb-8">
                        <div>
                            <label className="text-xs text-slate-500 font-semibold uppercase block mb-1">Başlıq</label>
                            {isEditing ? (
                                <input value={analysisResult.analysis.title} onChange={(e) => setAnalysisResult({ ...analysisResult, analysis: { ...analysisResult.analysis, title: e.target.value } })} className="w-full border border-slate-200 p-3 rounded-xl font-bold text-slate-800 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                            ) : (
                                <p className="font-bold text-slate-800 text-lg">{analysisResult.analysis.title}</p>
                            )}
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 font-semibold uppercase block mb-1">Təsvir</label>
                            {isEditing ? (
                                <textarea value={analysisResult.analysis.description} onChange={(e) => setAnalysisResult({ ...analysisResult, analysis: { ...analysisResult.analysis, description: e.target.value } })} rows={4} className="w-full border border-slate-200 p-3 rounded-xl text-slate-700 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                            ) : (
                                <p className="text-slate-700 bg-slate-50 p-3 rounded-lg text-sm">{analysisResult.analysis.description}</p>
                            )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs text-slate-500 font-semibold uppercase block mb-1">Kateqoriya</label>
                                <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded text-sm font-semibold">{catAz[analysisResult.analysis.category] || analysisResult.analysis.category}</span>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-semibold uppercase block mb-1">Prioritet</label>
                                <span className={`px-3 py-1 rounded text-sm font-semibold ${analysisResult.analysis.priority === 'Critical' ? 'bg-red-100 text-red-700' : analysisResult.analysis.priority === 'High' ? 'bg-orange-100 text-orange-700' : analysisResult.analysis.priority === 'Medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                                    {priAz[analysisResult.analysis.priority] || analysisResult.analysis.priority}
                                </span>
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 font-semibold uppercase block mb-1">Məkan</label>
                                {analysisResult.location ? (
                                    <a href={`https://www.google.com/maps?q=${analysisResult.location.lat},${analysisResult.location.lng}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 hover:underline transition cursor-pointer">
                                        <MapPin className="w-4 h-4" />
                                        {analysisResult.location.lat.toFixed(5)}, {analysisResult.location.lng.toFixed(5)}
                                    </a>
                                ) : (
                                    <span className="inline-flex items-center gap-1 text-sm text-orange-500">
                                        <MapPin className="w-4 h-4" />
                                        Məkan aşkarlanmadı
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition flex items-center justify-center gap-2">
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
                            Müraciəti Göndər
                        </button>
                        <button onClick={() => { setStep(1); setFile(null); setPreview(null); setAnalysisResult(null); }} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition">
                            Yenidən Başla
                        </button>
                    </div>
                </div>
            )}

            {/* Step 3: Success */}
            {step === 3 && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Müraciət Göndərildi!</h2>
                    <p className="text-slate-500 mb-8">Müraciətiniz göndərildi və hazırda admin komandamız tərəfindən nəzərdən keçirilir.</p>
                    <div className="flex gap-4 justify-center">
                        <button onClick={() => navigate('/my-appeals')} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition">Müraciətlərimə Bax</button>
                        <button onClick={() => { setStep(1); setFile(null); setPreview(null); setAnalysisResult(null); }} className="bg-slate-100 text-slate-700 px-6 py-3 rounded-xl font-bold hover:bg-slate-200 transition">Başqa Müraciət</button>
                    </div>
                </div>
            )}
        </div>
    );
}
