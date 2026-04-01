import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useDemoData, StudentRecord, Enquiry, Appointment } from '../DemoContext';
import { 
  User, 
  Mail, 
  Phone, 
  GraduationCap, 
  Calendar, 
  MessageSquare, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  ChevronRight,
  TrendingUp,
  Star,
  Activity,
  ArrowLeft,
  Bell
} from 'lucide-react';

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const { students, enquiries, appointments, notifications } = useDemoData();
  const navigate = useNavigate();

  const student = students.find(s => s.id === id);
  if (!student) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-900">Student Not Found</h2>
        <p className="text-slate-500 mb-6">The student record you are looking for does not exist.</p>
        <button 
          onClick={() => navigate('/students')}
          className="px-6 py-2 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all"
        >
          Back to Directory
        </button>
      </div>
    );
  }

  const studentEnquiries = enquiries.filter(e => e.student_id === student.id);
  const studentAppointments = appointments.filter(a => a.student_id === student.id);
  
  const openEnquiries = studentEnquiries.filter(e => !['resolved', 'closed'].includes(e.status));
  const escalatedEnquiries = studentEnquiries.filter(e => e.status === 'escalated');
  const upcomingAppointments = studentAppointments.filter(a => new Date(a.scheduled_start) > new Date() && a.status !== 'cancelled');
  const pendingFeedbackCount = studentEnquiries.filter(e => e.status === 'resolved' && !e.feedback).length;
  const feedbackAverage = studentEnquiries.filter(e => e.feedback).reduce((acc, e) => acc + (e.feedback?.rating || 0), 0) / (studentEnquiries.filter(e => e.feedback).length || 1);

  // Activity Timeline combining enquiries, appointments, feedback, and notifications
  const timelineEvents = [
    ...studentEnquiries.map(e => ({
      id: `enq-${e.id}`,
      type: 'enquiry',
      title: `Enquiry: ${e.title}`,
      status: e.status,
      date: e.created_at,
      link: `/enquiries/${e.id}`
    })),
    ...studentAppointments.map(a => ({
      id: `apt-${a.id}`,
      type: 'appointment',
      title: `Appointment: ${a.appointment_type}`,
      status: a.status,
      date: a.scheduled_start,
      link: `/appointments`
    })),
    ...studentEnquiries.filter(e => e.feedback).map(e => ({
      id: `fb-${e.id}`,
      type: 'feedback',
      title: `Feedback Provided: ${e.feedback?.rating} Stars`,
      status: 'completed',
      date: e.feedback?.created_at || e.updated_at,
      link: `/enquiries/${e.id}`
    })),
    ...notifications.filter(n => n.user_id === student.id).map(n => ({
      id: `not-${n.id}`,
      type: 'notification',
      title: `Notification: ${n.title}`,
      status: n.read ? 'read' : 'unread',
      date: n.created_at,
      link: n.link || '#'
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => navigate('/students')}
          className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-500"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Student Profile</h1>
          <p className="text-slate-500">360-degree view of student service history</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Basic Info */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-24 h-24 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 text-3xl font-bold mb-4 border-4 border-white shadow-sm">
                {student.full_name.charAt(0)}
              </div>
              <h2 className="text-xl font-bold text-slate-900">{student.full_name}</h2>
              <p className="text-sm text-slate-500 mb-2">{student.student_number}</p>
              <StatusBadge status={student.status} />
            </div>

            <div className="space-y-4">
              <InfoItem icon={Mail} label="Email" value={student.email} />
              <InfoItem icon={Phone} label="Phone" value={student.phone} />
              <InfoItem icon={GraduationCap} label="Program" value={student.program} />
              <InfoItem icon={TrendingUp} label="Year Level" value={`Year ${student.year_level}`} />
              <InfoItem icon={Clock} label="Member Since" value={new Date(student.created_at).toLocaleDateString()} />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Star className="w-5 h-5 text-amber-500" />
              Service Satisfaction
            </h3>
            <div className="flex items-center gap-4">
              <div className="text-4xl font-bold text-slate-900">{feedbackAverage.toFixed(1)}</div>
              <div className="flex-1">
                <div className="flex gap-1 mb-1">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star 
                      key={star} 
                      className={`w-4 h-4 ${star <= Math.round(feedbackAverage) ? 'text-amber-500 fill-amber-500' : 'text-slate-200'}`} 
                    />
                  ))}
                </div>
                <p className="text-xs text-slate-500">Based on {studentEnquiries.filter(e => e.feedback).length} feedback entries</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Summaries & History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SummaryCard 
              label="Open Enquiries" 
              value={openEnquiries.length} 
              icon={MessageSquare} 
              color="text-blue-600" 
              bgColor="bg-blue-50" 
            />
            <SummaryCard 
              label="Escalated" 
              value={escalatedEnquiries.length} 
              icon={AlertCircle} 
              color="text-red-600" 
              bgColor="bg-red-50" 
            />
            <SummaryCard 
              label="Upcoming Appts" 
              value={upcomingAppointments.length} 
              icon={Calendar} 
              color="text-emerald-600" 
              bgColor="bg-emerald-50" 
            />
            <SummaryCard 
              label="Pending Feedback" 
              value={pendingFeedbackCount} 
              icon={Star} 
              color="text-amber-600" 
              bgColor="bg-amber-50" 
            />
          </div>

          {/* Tabs for History */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="border-b border-slate-100">
              <nav className="flex px-6">
                <button className="px-4 py-4 text-sm font-bold text-teal-600 border-b-2 border-teal-600">History & Activity</button>
              </nav>
            </div>
            <div className="p-6">
              <div className="space-y-8">
                {timelineEvents.map((event, i) => (
                  <div key={event.id} className="relative flex gap-4">
                    {i !== timelineEvents.length - 1 && (
                      <div className="absolute left-4 top-8 bottom-[-2rem] w-0.5 bg-slate-100"></div>
                    )}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 z-10 ${
                      event.type === 'enquiry' ? 'bg-blue-100 text-blue-600' : 
                      event.type === 'appointment' ? 'bg-emerald-100 text-emerald-600' : 
                      event.type === 'feedback' ? 'bg-amber-100 text-amber-600' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {event.type === 'enquiry' ? <MessageSquare className="w-4 h-4" /> : 
                       event.type === 'appointment' ? <Calendar className="w-4 h-4" /> : 
                       event.type === 'feedback' ? <Star className="w-4 h-4" /> :
                       <Bell className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="flex items-center justify-between mb-1">
                        <Link to={event.link} className="text-sm font-bold text-slate-900 hover:text-teal-600 transition-colors">
                          {event.title}
                        </Link>
                        <span className="text-xs text-slate-400">{new Date(event.date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                          event.status === 'resolved' || event.status === 'completed' || event.status === 'confirmed' ? 'bg-emerald-50 text-emerald-600' :
                          event.status === 'escalated' ? 'bg-red-50 text-red-600' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {event.status.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {timelineEvents.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    No activity history found for this student.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: any) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400">
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{label}</p>
        <p className="text-sm text-slate-700 font-medium">{value}</p>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon, color, bgColor }: any) {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${bgColor} ${color} flex items-center justify-center`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 font-medium">{label}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: StudentRecord['status'] }) {
  const styles = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    at_risk: 'bg-red-50 text-red-700 border-red-100',
    graduating: 'bg-amber-50 text-amber-700 border-amber-100',
    inactive: 'bg-slate-50 text-slate-700 border-slate-100',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
