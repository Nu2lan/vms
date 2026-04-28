import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Loader2 } from 'lucide-react';
import { API_URL } from '../config';

export default function SSOCallback() {
    const navigate = useNavigate();
    const [error, setError] = useState('');

    useEffect(() => {
        const handleCallback = async () => {
            try {
                // Get SSO data from URL hash or query params
                const params = new URLSearchParams(window.location.search);
                const hashParams = new URLSearchParams(window.location.hash.replace('#', '?'));

                // Try query params first, then hash params
                const fullName = params.get('fullName') || hashParams.get('fullName');
                const fin = params.get('fin') || hashParams.get('fin');
                const picture = params.get('picture') || hashParams.get('picture');

                if (!fullName || !fin) {
                    setError('SSO məlumatları alınmadı. Yenidən cəhd edin.');
                    return;
                }

                // Send SSO data to backend
                const res = await axios.post(`${API_URL}/api/auth/sso/mygovid`, {
                    fullName,
                    fin,
                    picture
                });

                if (res.data.success) {
                    const { token, _id, firstName, lastName, fin: userFin, picture: userPic } = res.data.data;
                    localStorage.setItem('asanToken', token);
                    localStorage.setItem('asanUser', JSON.stringify({
                        _id, firstName, lastName, fin: userFin, picture: userPic
                    }));
                    // Notify App.jsx that auth state changed (storage event doesn't fire in same tab)
                    window.dispatchEvent(new Event('storage'));
                    navigate('/my-appeals', { replace: true });
                }
            } catch (err) {
                setError(err.response?.data?.error?.message || 'SSO giriş uğursuz oldu');
            }
        };

        handleCallback();
    }, [navigate]);

    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4">
            <div className="bg-white p-10 rounded-2xl shadow-sm border border-slate-200 w-full max-w-md text-center">
                {error ? (
                    <>
                        <div className="w-16 h-16 bg-red-100 rounded-full mx-auto mb-4 flex items-center justify-center">
                            <span className="text-red-600 text-2xl">✕</span>
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-2">SSO Xətası</h2>
                        <p className="text-red-600 text-sm mb-6">{error}</p>
                        <button
                            onClick={() => navigate('/login')}
                            className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition"
                        >
                            Giriş Səhifəsinə Qayıt
                        </button>
                    </>
                ) : (
                    <>
                        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
                        <h2 className="text-xl font-bold text-slate-800 mb-2">myGov ID ilə daxil olunur...</h2>
                        <p className="text-slate-500 text-sm">Zəhmət olmasa gözləyin</p>
                    </>
                )}
            </div>
        </div>
    );
}
