import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, LogOut, Menu, X } from 'lucide-react';

export default function Sidebar() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem('asanAdminUser') || '{}');
    const [mobileOpen, setMobileOpen] = useState(false);

    const links = [
        { to: '/', label: 'Panel', icon: LayoutDashboard },
        { to: '/users', label: 'İstifadəçilər', icon: Users },
    ];

    const handleLogout = () => {
        localStorage.removeItem('asanAdminToken');
        localStorage.removeItem('asanAdminUser');
        navigate('/login');
        window.location.reload();
    };

    const sidebarContent = (
        <>
            <div className="p-6 border-b border-slate-700 flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold tracking-tight">ASAN AI Hub Admin</h1>
                    {user.firstName && (
                        <p className="text-sm text-slate-400 mt-1">{user.firstName} {user.lastName}</p>
                    )}
                </div>
                <button onClick={() => setMobileOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {links.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        onClick={() => setMobileOpen(false)}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition ${isActive
                                ? 'text-white'
                                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                            }`
                        }
                        style={({ isActive }) => isActive ? { backgroundColor: '#7852ff' } : {}}
                    >
                        <div className="flex-shrink-0 p-2 rounded-full">
                            <Icon className="w-5 h-5" />
                        </div>
                        {label}
                    </NavLink>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-700">
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-3 w-full text-left rounded-lg hover:bg-red-500/10 hover:text-red-400 transition"
                >
                    <LogOut className="w-5 h-5" />
                    Çıxış
                </button>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile hamburger button */}
            <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden fixed top-4 left-4 z-50 bg-slate-900 text-white p-2 rounded-lg shadow-lg"
            >
                <Menu className="w-5 h-5" />
            </button>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setMobileOpen(false)} />
            )}

            {/* Mobile sidebar */}
            <aside className={`lg:hidden fixed top-0 left-0 h-screen w-64 bg-slate-900 text-white flex flex-col z-50 transform transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {sidebarContent}
            </aside>

            {/* Desktop sidebar */}
            <aside className="hidden lg:flex w-64 bg-slate-900 text-white flex-col h-screen sticky top-0">
                {sidebarContent}
            </aside>
        </>
    );
}
