import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, ClipboardList, ChevronDown, Menu, X } from 'lucide-react';

export default function Navbar() {
    const navigate = useNavigate();
    const token = localStorage.getItem('asanToken');
    const user = JSON.parse(localStorage.getItem('asanUser') || '{}');
    const [open, setOpen] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);
    const dropdownRef = useRef(null);

    const handleLogout = () => {
        localStorage.removeItem('asanToken');
        localStorage.removeItem('asanUser');
        navigate('/');
        window.location.reload();
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const initials = `${(user.firstName || '')[0] || ''}${(user.lastName || '')[0] || ''}`.toUpperCase();

    return (
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14 sm:h-16">
                <Link to="/" className="flex items-center gap-2">
                    <img src="/logo.png" alt="ASAN AI HUB" className="h-8 sm:h-10" />
                </Link>

                {/* Desktop nav */}
                <div className="hidden sm:flex items-center gap-4">
                    {token ? (
                        <div className="relative" ref={dropdownRef}>
                            <button
                                onClick={() => setOpen(!open)}
                                className="flex items-center gap-3 hover:bg-slate-50 px-3 py-2 rounded-xl transition"
                            >
                                <div className="w-9 h-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                                    {initials}
                                </div>
                                <span className="text-slate-700 font-medium text-sm">{user.firstName} {user.lastName}</span>
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                            </button>

                            {open && (
                                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50">
                                    <Link
                                        to="/my-appeals"
                                        onClick={() => setOpen(false)}
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition"
                                    >
                                        <ClipboardList className="w-4 h-4 text-slate-400" />
                                        Müraciətlərim
                                    </Link>
                                    <div className="border-t border-slate-100 my-1" />
                                    <button
                                        onClick={handleLogout}
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition w-full text-left"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Çıxış
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <Link to="/login" className="text-slate-600 hover:text-blue-600 font-medium text-sm transition">Daxil Ol</Link>
                            <Link to="/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition text-sm">Qeydiyyat</Link>
                        </>
                    )}
                </div>

                {/* Mobile nav */}
                <div className="sm:hidden flex items-center gap-2">
                    {token ? (
                        <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 hover:bg-slate-100 rounded-lg transition">
                            {mobileOpen ? <X className="w-5 h-5 text-slate-700" /> : <Menu className="w-5 h-5 text-slate-700" />}
                        </button>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Link to="/login" className="text-slate-600 hover:text-blue-600 font-medium text-sm transition">Daxil Ol</Link>
                            <Link to="/register" className="bg-blue-600 text-white px-3 py-1.5 rounded-lg font-medium hover:bg-blue-700 transition text-sm">Qeydiyyat</Link>
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile dropdown menu */}
            {mobileOpen && token && (
                <div className="sm:hidden border-t border-slate-200 bg-white">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                            {initials}
                        </div>
                        <span className="text-slate-700 font-medium text-sm">{user.firstName} {user.lastName}</span>
                    </div>
                    <Link
                        to="/my-appeals"
                        onClick={() => setMobileOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition"
                    >
                        <ClipboardList className="w-4 h-4 text-slate-400" />
                        Müraciətlərim
                    </Link>
                    <button
                        onClick={() => { setMobileOpen(false); handleLogout(); }}
                        className="flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition w-full text-left border-t border-slate-100"
                    >
                        <LogOut className="w-4 h-4" />
                        Çıxış
                    </button>
                </div>
            )}
        </nav>
    );
}
