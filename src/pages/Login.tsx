import React from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth, UserRole } from '../AuthContext';
import { GraduationCap, ShieldCheck, UserCheck, Settings, BarChart3, LayoutDashboard } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { signInAsDemo, user } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      navigate('/');
    } catch (error) {
      console.error('Login Error:', error);
    }
  };

  const handleDemoLogin = async (role: UserRole) => {
    await signInAsDemo(role);
    navigate('/');
  };

  const roles: { role: UserRole; icon: any; label: string }[] = [
    { role: 'student', icon: GraduationCap, label: 'Student' },
    { role: 'admin_officer', icon: UserCheck, label: 'Admin Officer' },
    { role: 'student_support_officer', icon: ShieldCheck, label: 'Support Officer' },
    { role: 'manager', icon: LayoutDashboard, label: 'Manager' },
    { role: 'director', icon: BarChart3, label: 'Director' },
    { role: 'it_support', icon: Settings, label: 'IT Support' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-8 border border-slate-200">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">UniLink</h1>
          <p className="text-slate-500">ABC University Student Enquiry System</p>
          <div className="inline-block px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-full mt-2">
            Demo Mode Enabled
          </div>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white border border-slate-300 text-slate-700 font-medium py-3 rounded-xl hover:bg-slate-50 transition-all shadow-sm"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
          Sign in with University Google Account
        </button>

        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
          <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-slate-400 uppercase tracking-wider font-semibold text-xs">Select Demo Role</span></div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {roles.map(({ role, icon: Icon, label }) => (
            <button
              key={role}
              onClick={() => handleDemoLogin(role)}
              className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-all group"
            >
              <Icon className="w-6 h-6 text-slate-400 group-hover:text-teal-600" />
              <span className="text-xs font-semibold text-slate-600 group-hover:text-teal-700">{label}</span>
            </button>
          ))}
        </div>
        <p className="text-center text-[10px] text-slate-400 italic">Demo roles allow you to explore the interface for each user type without a real account.</p>
      </div>
    </div>
  );
}
