import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MOCK_USERS = {
    'ABC1234': { fullName: 'Nurlan İbrahimov', fin: 'ABC1234', picture: '/Nurlan.png' },
    '1234ABC': { fullName: 'Zahid İslamlı', fin: '1234ABC', picture: '/Zahid.jpeg' },
};

export default function MockMyGovID() {
    const navigate = useNavigate();
    const [tab, setTab] = useState('qr'); // qr, other
    const [fin, setFin] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = (e) => {
        e.preventDefault();
        setError('');
        const upperFin = fin.toUpperCase();
        if (!/^[A-Z0-9]{7}$/.test(upperFin)) {
            setError('FİN kodu düzgün deyil');
            return;
        }
        if (!password) {
            setError('Şifrəni daxil edin');
            return;
        }
        if (!MOCK_USERS[upperFin]) {
            setError('FİN kodu və ya şifrə yanlışdır');
            return;
        }

        setLoading(true);
        const user = MOCK_USERS[upperFin];
        setTimeout(() => {
            const params = new URLSearchParams({
                fullName: user.fullName,
                fin: user.fin,
                picture: user.picture
            });
            navigate(`/auth/callback?${params.toString()}`);
        }, 1500);
    };

    return (
        <div style={{ minHeight: '100vh', background: '#f0f4fa', fontFamily: 'Inter, -apple-system, sans-serif' }}>
            {/* Top government banner */}
            <div style={{ background: '#EBF0FA', padding: '10px 0', borderBottom: '1px solid #dce3f0' }}>
                <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                    <span style={{ color: '#1a73e8', fontSize: '16px' }}>🔒</span>
                    <span style={{ color: '#444' }}>Azərbaycan Respublikasının rəsmi dövlət platforması</span>
                    <a href="#" style={{ color: '#1a73e8', textDecoration: 'none', fontWeight: '500', marginLeft: '4px' }}>
                        Rəsmi vebsaytları necə tanımaq olar?
                    </a>
                    <span style={{ color: '#1a73e8', fontSize: '10px' }}>▼</span>
                </div>
            </div>

            {/* Header with language + logo */}
            <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px 24px 0' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <img src="/mygovid.svg" alt="myGov ID" style={{ height: '36px' }} />
                </div>
            </div>

            {/* Main content */}
            <div style={{ maxWidth: '700px', margin: '0 auto', padding: '0 24px' }}>
                <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                    {/* Tabs */}
                    <div style={{ display: 'flex', borderBottom: '1px solid #eee' }}>
                        <button
                            onClick={() => { setTab('qr'); setError(''); }}
                            style={{
                                flex: 1, padding: '16px', background: 'none', border: 'none',
                                fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                                color: tab === 'qr' ? '#1a73e8' : '#888',
                                borderBottom: tab === 'qr' ? '2px solid #1a73e8' : '2px solid transparent',
                                transition: 'all 0.2s'
                            }}
                        >
                            QR kod
                        </button>
                        <button
                            onClick={() => { setTab('other'); setError(''); }}
                            style={{
                                flex: 1, padding: '16px', background: 'none', border: 'none',
                                fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                                color: tab === 'other' ? '#1a73e8' : '#888',
                                borderBottom: tab === 'other' ? '2px solid #1a73e8' : '2px solid transparent',
                                transition: 'all 0.2s'
                            }}
                        >
                            Digər üsullar
                        </button>
                    </div>

                    {/* Tab content */}
                    <div style={{ padding: '32px' }}>
                        {tab === 'qr' ? (
                            /* QR Code tab */
                            <div style={{ display: 'flex', gap: '32px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                                <div style={{ flex: '1', minWidth: '240px' }}>
                                    <p style={{ fontSize: '15px', fontWeight: '600', color: '#222', marginBottom: '16px' }}>
                                        <span style={{ color: '#1a73e8' }}>mygov</span> mobil tətbiqi ilə giriş edin!
                                    </p>
                                    <div style={{
                                        background: '#f8fafb', borderRadius: '10px', padding: '16px',
                                        borderLeft: '3px solid #1a73e8'
                                    }}>
                                        <p style={{ fontSize: '13px', color: '#555', margin: '0 0 8px', lineHeight: '1.6' }}>1. Tətbiqi açın.</p>
                                        <p style={{ fontSize: '13px', color: '#555', margin: '0 0 8px', lineHeight: '1.6' }}>2. Aşağıdan QR skan <span style={{ display: 'inline-flex', background: '#eee', borderRadius: '4px', padding: '1px 4px', fontSize: '11px' }}>⊞</span> düyməsini sıxın.</p>
                                        <p style={{ fontSize: '13px', color: '#555', margin: '0', lineHeight: '1.6' }}>3. QR kodu skan edərək daxil olun.</p>
                                    </div>
                                    <p style={{ fontSize: '13px', color: '#888', marginTop: '20px', lineHeight: '1.5' }}>
                                        Tətbiqiniz yoxdursa, kamera ilə skan edin və tətbiqi yükləyin.
                                    </p>
                                </div>
                                <div style={{ flexShrink: 0 }}>
                                    {/* Fake QR code */}
                                    <div style={{
                                        width: '180px', height: '180px', background: '#fff',
                                        border: '1px solid #e5e7eb', borderRadius: '12px',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        position: 'relative'
                                    }}>
                                        <svg width="140" height="140" viewBox="0 0 140 140">
                                            {/* Generate a fake QR pattern */}
                                            {Array.from({ length: 14 }, (_, r) =>
                                                Array.from({ length: 14 }, (_, c) => {
                                                    const isCorner = (r < 3 && c < 3) || (r < 3 && c > 10) || (r > 10 && c < 3);
                                                    const isFilled = isCorner || Math.random() > 0.5;
                                                    return isFilled ? (
                                                        <rect key={`${r}-${c}`} x={c * 10} y={r * 10} width="10" height="10" fill="#222" rx="1" />
                                                    ) : null;
                                                })
                                            )}
                                        </svg>
                                        <div style={{
                                            position: 'absolute', background: '#fff', borderRadius: '8px',
                                            padding: '4px 8px', display: 'flex', alignItems: 'center', gap: '3px'
                                        }}>
                                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#222' }}>my</span>
                                            <span style={{ fontSize: '11px', fontWeight: '700', color: '#1a73e8' }}>gov</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Other methods tab - FIN + Password */
                            loading ? (
                                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                                    <div style={{
                                        width: '44px', height: '44px', border: '3px solid #e5e7eb',
                                        borderTop: '3px solid #1a73e8', borderRadius: '50%',
                                        animation: 'mgSpin 0.8s linear infinite', margin: '0 auto 20px'
                                    }} />
                                    <style>{`@keyframes mgSpin { to { transform: rotate(360deg); } }`}</style>
                                    <p style={{ fontSize: '15px', fontWeight: '600', color: '#333' }}>Doğrulanır...</p>
                                    <p style={{ fontSize: '13px', color: '#888' }}>Zəhmət olmasa gözləyin</p>
                                </div>
                            ) : (
                                <form onSubmit={handleLogin}>
                                    <p style={{ fontSize: '15px', fontWeight: '600', color: '#222', marginBottom: '24px', textAlign: 'center' }}>
                                        FİN və şifrə ilə daxil olun
                                    </p>

                                    {error && (
                                        <div style={{
                                            background: '#fef2f2', border: '1px solid #fecaca',
                                            color: '#dc2626', padding: '10px 14px', borderRadius: '8px',
                                            fontSize: '13px', marginBottom: '16px'
                                        }}>{error}</div>
                                    )}

                                    <div style={{ marginBottom: '16px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>
                                            FİN kod
                                        </label>
                                        <input
                                            value={fin}
                                            onChange={(e) => setFin(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 7))}
                                            placeholder="Məs: ABC1234"
                                            maxLength={7}
                                            style={{
                                                width: '100%', padding: '12px 14px', border: '1.5px solid #d1d5db',
                                                borderRadius: '8px', fontSize: '14px', outline: 'none',
                                                textTransform: 'uppercase', letterSpacing: '1px',
                                                boxSizing: 'border-box', transition: 'border-color 0.2s'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = '#1a73e8'}
                                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                            required
                                        />
                                    </div>
                                    <div style={{ marginBottom: '24px' }}>
                                        <label style={{ display: 'block', fontSize: '13px', fontWeight: '500', color: '#444', marginBottom: '6px' }}>
                                            Şifrə
                                        </label>
                                        <input
                                            type="password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="Şifrənizi daxil edin"
                                            style={{
                                                width: '100%', padding: '12px 14px', border: '1.5px solid #d1d5db',
                                                borderRadius: '8px', fontSize: '14px', outline: 'none',
                                                boxSizing: 'border-box', transition: 'border-color 0.2s'
                                            }}
                                            onFocus={(e) => e.target.style.borderColor = '#1a73e8'}
                                            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
                                            required
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        style={{
                                            width: '100%', padding: '13px', background: '#1a73e8',
                                            color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px',
                                            fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s'
                                        }}
                                        onMouseOver={(e) => e.target.style.background = '#1565d8'}
                                        onMouseOut={(e) => e.target.style.background = '#1a73e8'}
                                    >
                                        Daxil ol
                                    </button>

                                    <div style={{ marginTop: '20px', textAlign: 'center' }}>
                                        <a href="#" style={{ fontSize: '13px', color: '#1a73e8', textDecoration: 'none' }}>
                                            Şifrəni unutmusunuz?
                                        </a>
                                    </div>

                                    <div style={{
                                        borderTop: '1px solid #eee', marginTop: '20px', paddingTop: '16px',
                                        textAlign: 'center'
                                    }}>
                                        <p style={{ fontSize: '12px', color: '#aaa', lineHeight: '1.5' }}>
                                            Demo FİN kodları: <span style={{ fontFamily: 'monospace', color: '#666', fontWeight: '600' }}>ABC1234 · 1234ABC</span>
                                            <br />Şifrə: istənilən
                                        </p>
                                    </div>
                                </form>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div style={{ textAlign: 'center', padding: '32px 16px', color: '#aaa', fontSize: '12px' }}>
                © 2026 mygov ID — Azərbaycan Respublikası
            </div>
        </div>
    );
}
