import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useDemoData } from '../DemoContext';
import { 
  MessageSquare, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  Users, 
  ShieldAlert,
  ArrowUpRight,
  Star,
  Bell,
  Bot
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard() {
  const { profile } = useAuth();

  if (!profile) return null;

  switch (profile.role) {
    case 'student':
      return <StudentDashboard />;
    case 'admin_officer':
    case 'student_support_officer':
      return <StaffDashboard />;
    case 'manager':
      return <ManagerDashboard />;
    case 'director':
      return <DirectorDashboard />;
    case 'it_support':
      return <ITSupportDashboard />;
    default:
      return <div>Dashboard not found for your role.</div>;
  }
}

function StudentDashboard() {
  const { profile } = useAuth();
  const { enquiries, appointments, notifications } = useDemoData();
  const navigate = useNavigate();

  if (!profile) return null;

  const myEnquiries = enquiries.filter(e => e.student_id === profile.uid);
  const myAppointments = appointments.filter(a => a.student_id === profile.uid && a.status !== 'cancelled');
  const myNotifications = notifications.filter(n => n.user_id === profile.uid && !n.read);

  const stats = [
    { label: 'Open Enquiries', value: myEnquiries.filter(e => e.status !== 'closed').length, icon: MessageSquare, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Upcoming Appointments', value: myAppointments.filter(a => new Date(a.scheduled_start) > new Date()).length, icon: CalendarIcon, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Unread Notifications', value: myNotifications.length, icon: Bell, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Pending Feedback', value: myEnquiries.filter(e => e.status === 'resolved' && !e.feedback).length, icon: Star, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bg}`}>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="text-2xl font-bold text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Enquiries */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Recent Enquiries</h3>
            <button onClick={() => navigate('/enquiries')} className="text-sm font-semibold text-teal-600 hover:text-teal-700">View All</button>
          </div>
          <div className="divide-y divide-slate-100">
            {myEnquiries.length > 0 ? myEnquiries.slice(0, 5).map((enquiry) => (
              <div key={enquiry.id} onClick={() => navigate(`/enquiries/${enquiry.id}`)} className="p-6 hover:bg-slate-50 transition-colors cursor-pointer">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{enquiry.enquiry_code}</span>
                  <StatusBadge status={enquiry.status} />
                </div>
                <h4 className="font-semibold text-slate-900 mb-1">{enquiry.title}</h4>
                <p className="text-sm text-slate-500 line-clamp-1">{enquiry.description}</p>
              </div>
            )) : (
              <div className="p-12 text-center text-slate-400 italic">No enquiries found.</div>
            )}
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Upcoming Appointments</h3>
            <button onClick={() => navigate('/appointments')} className="text-sm font-semibold text-teal-600 hover:text-teal-700">Book New</button>
          </div>
          <div className="p-6 space-y-4">
            {myAppointments.length > 0 ? myAppointments.slice(0, 3).map((apt) => (
              <div key={apt.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 bg-slate-50">
                <div className="w-12 h-12 rounded-lg bg-white border border-slate-200 flex flex-col items-center justify-center text-teal-600">
                  <span className="text-xs font-bold uppercase">{new Date(apt.scheduled_start).toLocaleString('en-US', { month: 'short' })}</span>
                  <span className="text-lg font-black leading-none">{new Date(apt.scheduled_start).getDate()}</span>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900">{apt.appointment_type}</h4>
                  <p className="text-sm text-slate-500">{new Date(apt.scheduled_start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <StatusBadge status={apt.status} />
              </div>
            )) : (
              <div className="p-12 text-center text-slate-400 italic">No upcoming appointments.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StaffDashboard() {
  const { profile } = useAuth();
  const { enquiries, students } = useDemoData();
  const navigate = useNavigate();

  if (!profile) return null;

  const relevantEnquiries = enquiries.filter(enq => {
    if (profile.role === 'admin_officer') return enq.status === 'submitted' || enq.status === 'triaged' || enq.assigned_role === 'admin_officer';
    if (profile.role === 'student_support_officer') return enq.assigned_role === 'student_support_officer' || enq.type === 'complex';
    return true;
  });

  const myAssigned = relevantEnquiries.filter(e => e.assigned_role === profile.role);
  const activeCases = myAssigned.filter(e => e.status === 'in_progress');
  const atRiskStudents = students.filter(s => s.status === 'at_risk');

  const stats = [
    { label: 'Queue Size', value: relevantEnquiries.length, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Assigned to Me', value: myAssigned.length, icon: Users, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Active Cases', value: activeCases.length, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'At Risk Students', value: atRiskStudents.length, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  const chartData = [
    { name: 'Mon', count: 12 },
    { name: 'Tue', count: 19 },
    { name: 'Wed', count: 15 },
    { name: 'Thu', count: 22 },
    { name: 'Fri', count: 30 },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6">Enquiry Volume (Last 5 Days)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  cursor={{ fill: '#f8fafc' }}
                />
                <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900">Recent Activity</h3>
            <button onClick={() => navigate('/enquiries')} className="text-xs font-bold text-teal-600 hover:underline">View All</button>
          </div>
          <div className="space-y-6">
            {relevantEnquiries.slice(0, 5).map(enq => (
              <div key={enq.id} onClick={() => navigate(`/enquiries/${enq.id}`)} className="flex gap-4 cursor-pointer group">
                <div className="w-2 h-2 mt-2 rounded-full bg-teal-500 shrink-0 group-hover:scale-150 transition-transform"></div>
                <div>
                  <p className="text-sm font-medium text-slate-900 group-hover:text-teal-600 transition-colors">{enq.title}</p>
                  <p className="text-xs text-slate-500">{new Date(enq.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {profile.role === 'admin_officer' && (
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-slate-900">Students Needing Attention</h3>
              <button onClick={() => navigate('/students')} className="text-xs font-bold text-teal-600 hover:underline">View Directory</button>
            </div>
            <div className="space-y-4">
              {atRiskStudents.map(student => (
                <div 
                  key={student.id} 
                  onClick={() => navigate(`/students/${student.id}`)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-transparent hover:border-slate-100"
                >
                  <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
                    {student.full_name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 truncate">{student.full_name}</p>
                    <p className="text-xs text-slate-500 truncate">{student.program}</p>
                  </div>
                  <AlertCircle className="w-4 h-4 text-red-500" />
                </div>
              ))}
              {atRiskStudents.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-4 italic">No students currently at risk.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ManagerDashboard() {
  const { enquiries, students } = useDemoData();
  const navigate = useNavigate();

  const escalated = enquiries.filter(e => e.status === 'escalated');
  const resolved = enquiries.filter(e => e.status === 'resolved' || e.status === 'closed');
  const feedback = enquiries.filter(e => e.feedback).map(e => e.feedback!);
  const avgRating = feedback.length > 0 ? (feedback.reduce((acc, f) => acc + f.rating, 0) / feedback.length).toFixed(1) : 'N/A';
  const atRiskStudents = students.filter(s => s.status === 'at_risk');

  const stats = [
    { label: 'Total Enquiries', value: enquiries.length, icon: MessageSquare, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Escalated Cases', value: escalated.length, icon: ShieldAlert, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'At Risk Students', value: atRiskStudents.length, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Avg Satisfaction', value: `${avgRating}/5`, icon: Star, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6">Escalated Queue</h3>
          <div className="space-y-4">
            {escalated.length > 0 ? escalated.map(enq => (
              <div key={enq.id} onClick={() => navigate(`/enquiries/${enq.id}`)} className="p-4 rounded-xl border border-red-100 bg-red-50/30 flex items-center justify-between hover:bg-red-50 transition-colors cursor-pointer">
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">{enq.title}</h4>
                  <p className="text-xs text-slate-500">Assigned: {enq.assigned_role?.replace('_', ' ')}</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-red-400" />
              </div>
            )) : (
              <div className="p-12 text-center text-slate-400 italic">No escalated cases. Good job!</div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-900 mb-6">Recent Feedback</h3>
          <div className="space-y-4">
            {feedback.length > 0 ? feedback.slice(0, 3).map(f => (
              <div key={f.id} className="p-4 rounded-xl border border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} className={`w-3 h-3 ${f.rating >= s ? 'text-amber-500 fill-current' : 'text-slate-200'}`} />
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400">{new Date(f.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-slate-700 italic">"{f.comment}"</p>
              </div>
            )) : (
              <div className="p-12 text-center text-slate-400 italic">No feedback received yet.</div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-slate-900">Student Service Overview</h3>
            <button onClick={() => navigate('/students')} className="text-xs font-bold text-teal-600 hover:underline">View All</button>
          </div>
          <div className="space-y-4">
            {students.slice(0, 5).map(student => {
              const studentEnquiries = enquiries.filter(e => e.student_id === student.id);
              const openCount = studentEnquiries.filter(e => !['resolved', 'closed'].includes(e.status)).length;
              
              return (
                <div 
                  key={student.id} 
                  onClick={() => navigate(`/students/${student.id}`)}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer border border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs">
                      {student.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{student.full_name}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-bold">{student.status}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900">{openCount}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Open Enq</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function DirectorDashboard() {
  const { enquiries } = useDemoData();

  const deptData = [
    { name: 'Admissions', count: enquiries.filter(e => e.category === 'Admissions').length },
    { name: 'Financial', count: enquiries.filter(e => e.category === 'Financial Services').length },
    { name: 'Welfare', count: enquiries.filter(e => e.category === 'Student Welfare').length },
    { name: 'Visa', count: enquiries.filter(e => e.category === 'International / Visa Support').length },
    { name: 'Academic', count: enquiries.filter(e => e.category === 'Academic Support').length },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Total Service Volume</p>
          <p className="text-5xl font-black text-slate-900">{enquiries.length}</p>
          <p className="text-xs text-green-600 font-bold mt-2 flex items-center justify-center gap-1">
            <TrendingUp className="w-3 h-3" /> +12% from last month
          </p>
        </div>
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Avg Resolution Time</p>
          <p className="text-5xl font-black text-slate-900">1.8d</p>
          <p className="text-xs text-teal-600 font-bold mt-2">Within SLA targets</p>
        </div>
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Student Satisfaction</p>
          <p className="text-5xl font-black text-slate-900">4.7</p>
          <div className="flex justify-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map(s => <Star key={s} className="w-4 h-4 text-amber-500 fill-current" />)}
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-8">Service Distribution by Department</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={deptData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="count" radius={[8, 8, 0, 0]} barSize={60}>
                {deptData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#0d9488', '#0891b2', '#4f46e5', '#7c3aed', '#db2777'][index % 5]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function ITSupportDashboard() {
  const { enquiries, notifications } = useDemoData();

  const stats = [
    { label: 'System Health', value: '99.9%', icon: ShieldAlert, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'AI Triage Count', value: enquiries.filter(e => e.ai_triage_summary).length, icon: Bot, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Notification Vol', value: notifications.length, icon: Bell, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-6">Real-time System Activity</h3>
        <div className="font-mono text-xs text-slate-600 space-y-2 bg-slate-50 p-6 rounded-xl border border-slate-100 max-h-[400px] overflow-y-auto">
          <p className="text-teal-600 font-bold">UniLink Core v2.4.0-demo initialized</p>
          <p>[{new Date().toISOString()}] INFO: Shared state loaded from localStorage</p>
          <p>[{new Date().toISOString()}] INFO: AI Triage engine ready</p>
          {enquiries.slice(0, 10).map(enq => (
            <p key={enq.id}>[{enq.created_at}] EVENT: Enquiry {enq.enquiry_code} created by {enq.student_id}</p>
          ))}
          <p>[{new Date().toISOString()}] WARN: Firestore connection skipped (Demo Mode)</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={`p-3 rounded-xl ${bg}`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: any = {
    submitted: 'bg-blue-100 text-blue-700',
    triaged: 'bg-indigo-100 text-indigo-700',
    assigned: 'bg-cyan-100 text-cyan-700',
    in_progress: 'bg-teal-100 text-teal-700',
    resolved: 'bg-green-100 text-green-700',
    closed: 'bg-slate-100 text-slate-700',
    escalated: 'bg-red-100 text-red-700',
    confirmed: 'bg-green-100 text-green-700',
    requested: 'bg-blue-100 text-blue-700',
    rescheduled: 'bg-amber-100 text-amber-700',
    cancelled: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors[status] || 'bg-slate-100 text-slate-700'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
