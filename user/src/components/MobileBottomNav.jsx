import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, User, Plus, ClipboardList, LogOut, X } from 'lucide-react';

export default function MobileBottomNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const token = localStorage.getItem('asanToken');
    const user = JSON.parse(localStorage.getItem('asanUser') || '{}');
    const [profileOpen, setProfileOpen] = useState(false);

    const initials = `${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase();
    const isHome = location.pathname === '/';

    const handleLogout = () => {
        localStorage.removeItem('asanToken');
        localStorage.removeItem('asanUser');
        setProfileOpen(false);
        window.dispatchEvent(new Event('storage'));
        navigate('/');
    };

    const AvatarCircle = ({ size = 'sm' }) => {
        const cls = size === 'lg'
            ? 'w-16 h-16 text-xl'
            : 'w-6 h-6 text-xs';
        return user.picture ? (
            <img
                src={user.picture}
                alt={user.firstName}
                className={`${cls} rounded-full object-cover`}
            />
        ) : (
            <div className={`${cls} rounded-full bg-blue-600 flex items-center justify-center text-white font-bold`}>
                {initials}
            </div>
        );
    };

    return (
        <>
            {/* Bottom Nav Bar */}
            <nav
                className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
                <div className="flex">
                    {/* Home */}
                    <button
                        onClick={() => navigate('/')}
                        className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${isHome ? 'text-blue-600' : 'text-slate-400'}`}
                    >
                        <Home className={`w-5 h-5 ${isHome ? 'stroke-blue-600' : ''}`} />
                        <span className="text-[10px] font-medium">Ana Səhifə</span>
                    </button>

                    {/* New Appeal — only when logged in */}
                    {token && (
                        <button
                            onClick={() => navigate('/submit')}
                            className="flex-1 flex flex-col items-center gap-1 py-3 text-slate-400 transition-colors"
                        >
                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center shadow-md">
                                <Plus className="w-5 h-5 text-white" />
                            </div>
                            <span className="text-[10px] font-medium text-slate-500">Yeni Müraciət</span>
                        </button>
                    )}

                    {/* Profile */}
                    <button
                        onClick={() => token ? setProfileOpen(true) : navigate('/login')}
                        className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors ${profileOpen ? 'text-blue-600' : 'text-slate-400'}`}
                    >
                        {token ? (
                            <AvatarCircle size="sm" />
                        ) : (
                            <User className="w-5 h-5" />
                        )}
                        <span className="text-[10px] font-medium">Profil</span>
                    </button>
                </div>
            </nav>

            {/* Profile Bottom Sheet */}
            {profileOpen && token && (
                <>
                    {/* Backdrop */}
                    <div
                        className="sm:hidden fixed inset-0 bg-black/40 z-40"
                        onClick={() => setProfileOpen(false)}
                    />

                    {/* Sheet */}
                    <div className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl"
                        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 72px)' }}
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1 bg-slate-200 rounded-full" />
                        </div>

                        {/* Close */}
                        <button
                            onClick={() => setProfileOpen(false)}
                            className="absolute top-4 right-4 p-1 rounded-full hover:bg-slate-100 transition"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>

                        {/* User Info */}
                        <div className="flex flex-col items-center px-6 pt-2 pb-6 border-b border-slate-100">
                            <AvatarCircle size="lg" />
                            <h3 className="mt-3 text-lg font-bold text-slate-800">
                                {user.firstName} {user.lastName}
                            </h3>
                            {user.fin && (
                                <span className="text-slate-400 text-sm font-mono uppercase tracking-widest mt-1">
                                    {user.fin}
                                </span>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="px-4 py-3">
                            <button
                                onClick={() => { setProfileOpen(false); navigate('/my-appeals'); }}
                                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-slate-50 transition text-left"
                            >
                                <div className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center">
                                    <ClipboardList className="w-5 h-5 text-blue-600" />
                                </div>
                                <span className="font-medium text-slate-700">Müraciətlərim</span>
                            </button>

                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-red-50 transition text-left mt-1"
                            >
                                <div className="w-9 h-9 bg-red-50 rounded-full flex items-center justify-center">
                                    <LogOut className="w-5 h-5 text-red-500" />
                                </div>
                                <span className="font-medium text-red-500">Çıxış</span>
                            </button>
                        </div>
                    </div>
                </>
            )}
        </>
    );
}
