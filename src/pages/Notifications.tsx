import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useDemoData } from '../DemoContext';
import { 
  Bell, 
  CheckCircle2, 
  Info, 
  AlertCircle, 
  Clock, 
  Trash2, 
  CheckCheck,
  ChevronRight
} from 'lucide-react';

export default function Notifications() {
  const { profile } = useAuth();
  const { notifications, markNotificationRead, markAllNotificationsRead } = useDemoData();
  const navigate = useNavigate();

  if (!profile) return null;

  const userNotifications = notifications.filter(n => n.user_id === profile.uid);
  const unreadCount = userNotifications.filter(n => !n.read).length;

  const handleNotificationClick = (n: any) => {
    markNotificationRead(n.id);
    if (n.link) {
      navigate(n.link);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-amber-500" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-slate-500">Stay updated with your enquiry and appointment status.</p>
        </div>
        {unreadCount > 0 && (
          <button 
            onClick={() => markAllNotificationsRead(profile.uid)}
            className="flex items-center gap-2 text-sm font-semibold text-teal-600 hover:text-teal-700"
          >
            <CheckCheck className="w-4 h-4" />
            Mark all as read
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {userNotifications.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {userNotifications.map((n) => (
              <div 
                key={n.id} 
                onClick={() => handleNotificationClick(n)}
                className={`p-6 flex gap-4 hover:bg-slate-50 transition-colors cursor-pointer relative ${!n.read ? 'bg-teal-50/30' : ''}`}
              >
                {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-teal-500"></div>}
                <div className={`p-2 rounded-xl h-fit ${!n.read ? 'bg-white shadow-sm' : 'bg-slate-100'}`}>
                  {getIcon(n.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className={`font-bold ${!n.read ? 'text-slate-900' : 'text-slate-600'}`}>{n.title}</h3>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-500 mb-2">{n.message}</p>
                  {n.link && (
                    <span className="text-xs font-bold text-teal-600 flex items-center gap-1">
                      View Details <ChevronRight className="w-3 h-3" />
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">No notifications yet</h3>
            <p className="text-slate-500">We'll notify you when something important happens.</p>
          </div>
        )}
      </div>
    </div>
  );
}
