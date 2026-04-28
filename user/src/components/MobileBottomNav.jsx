import { useNavigate, useLocation } from 'react-router-dom';
import { Home, User } from 'lucide-react';

export default function MobileBottomNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const token = localStorage.getItem('asanToken');
    const user = JSON.parse(localStorage.getItem('asanUser') || '{}');

    const isHome = location.pathname === '/';
    const isProfile = location.pathname === '/my-appeals' || location.pathname === '/login' || location.pathname === '/register';

    const handleProfileTab = () => {
        if (token) {
            navigate('/my-appeals');
        } else {
            navigate('/login');
        }
    };

    return (
        <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
            <div className="flex">
                {/* Home Tab */}
                <button
                    onClick={() => navigate('/')}
                    className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${isHome ? 'text-blue-600' : 'text-slate-400'}`}
                >
                    <Home className={`w-6 h-6 ${isHome ? 'fill-blue-100' : ''}`} />
                    <span className="text-[11px] font-medium">Ana Səhifə</span>
                </button>

                {/* Profile Tab */}
                <button
                    onClick={handleProfileTab}
                    className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${isProfile ? 'text-blue-600' : 'text-slate-400'}`}
                >
                    {token && user.picture ? (
                        <img
                            src={user.picture}
                            alt={user.firstName}
                            className={`w-6 h-6 rounded-full object-cover ring-2 ${isProfile ? 'ring-blue-500' : 'ring-transparent'}`}
                        />
                    ) : token ? (
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs ring-2 ${isProfile ? 'bg-blue-600 ring-blue-500' : 'bg-slate-400 ring-transparent'}`}>
                            {`${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase()}
                        </div>
                    ) : (
                        <User className={`w-6 h-6 ${isProfile ? 'fill-blue-100' : ''}`} />
                    )}
                    <span className="text-[11px] font-medium">
                        {token ? 'Müraciətlərim' : 'Profil'}
                    </span>
                </button>
            </div>
        </nav>
    );
}
