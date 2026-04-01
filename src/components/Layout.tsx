import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useDemoData } from '../DemoContext';
import { 
  LayoutDashboard, 
  MessageSquarePlus, 
  MessageSquare,
  Calendar, 
  Bot, 
  Bell, 
  LogOut, 
  User,
  ChevronRight,
  Menu,
  X,
  Users
} from 'lucide-react';

export default function Layout() {
  const { profile, logout } = useAuth();
  const { notifications } = useDemoData();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const unreadNotifications = notifications.filter(n => n.user_id === profile?.uid && !n.read).length;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/students', label: 'Students', icon: Users, roles: ['admin_officer', 'manager'] },
    { path: '/enquiries', label: 'Enquiries', icon: MessageSquare },
    { path: '/enquiries/new', label: 'New Enquiry', icon: MessageSquarePlus, roles: ['student'] },
    { path: '/appointments', label: 'Appointments', icon: Calendar },
    { path: '/notifications', label: 'Notifications', icon: Bell },
    { path: '/ai-chat', label: 'AI Assistant', icon: Bot, roles: ['student'] },
  ];

  const filteredNavItems = navItems.filter(item => !item.roles || (profile && item.roles.includes(profile.role)));

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col">
          <div className="p-6 flex items-center justify-between">
            <Link to="/" className="text-2xl font-bold text-teal-600 tracking-tight">UniLink - Group 5</Link>
            <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden"><X className="w-6 h-6 text-slate-400" /></button>
          </div>

          <nav className="flex-1 px-4 space-y-1">
            {filteredNavItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  location.pathname === item.path 
                    ? 'bg-teal-50 text-teal-700' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="relative">
                  <item.icon className={`w-5 h-5 ${location.pathname === item.path ? 'text-teal-600' : 'text-slate-400'}`} />
                  {item.path === '/notifications' && unreadNotifications > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                  )}
                </div>
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100 space-y-4">
            <div className="flex items-center gap-3 px-4 py-2">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold">
                {profile?.full_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900 truncate">{profile?.full_name}</p>
                <p className="text-xs text-slate-500 truncate capitalize">{profile?.role.replace('_', ' ')}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden"><Menu className="w-6 h-6 text-slate-600" /></button>
            <h2 className="text-lg font-semibold text-slate-900">
              {navItems.find(item => item.path === location.pathname)?.label || 'UniLink'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              to="/notifications"
              className="p-2 text-slate-400 hover:text-slate-600 relative transition-colors"
            >
              <Bell className="w-6 h-6" />
              {unreadNotifications > 0 && (
                <span className="absolute top-2 right-2 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
}
