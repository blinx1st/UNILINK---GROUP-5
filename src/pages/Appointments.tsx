import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { useDemoData, AppointmentStatus } from '../DemoContext';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  Video, 
  Check, 
  ChevronRight, 
  Loader2, 
  Plus,
  X,
  AlertCircle,
  CalendarDays
} from 'lucide-react';

export default function Appointments() {
  const { profile } = useAuth();
  const { appointments, addAppointment, updateAppointment } = useDemoData();
  const [slots, setSlots] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showBooking, setShowBooking] = useState(false);
  const [selectedDept, setSelectedDept] = useState('Admissions');

  if (!profile) return null;

  const userAppointments = appointments.filter(apt => 
    profile.role === 'student' ? apt.student_id === profile.uid : true
  ).sort((a, b) => new Date(b.scheduled_start).getTime() - new Date(a.scheduled_start).getTime());

  useEffect(() => {
    // Mock available slots for demo
    const now = new Date();
    const mockSlots = [
      { id: 's1', dept: 'Admissions', staff: 'Dr. Sarah Smith', time: new Date(now.getTime() + 86400000 * 2).toISOString(), type: 'in_person' },
      { id: 's2', dept: 'Admissions', staff: 'Dr. Sarah Smith', time: new Date(now.getTime() + 86400000 * 2 + 3600000).toISOString(), type: 'virtual' },
      { id: 's3', dept: 'Financial Services', staff: 'Mr. James Wilson', time: new Date(now.getTime() + 86400000 * 3).toISOString(), type: 'in_person' },
      { id: 's4', dept: 'Student Welfare', staff: 'Ms. Emily Chen', time: new Date(now.getTime() + 86400000 * 4).toISOString(), type: 'virtual' },
    ];
    setSlots(mockSlots.filter(s => s.dept === selectedDept));
  }, [selectedDept]);

  const handleBook = (slot: any) => {
    setLoading(true);
    setTimeout(() => {
      addAppointment({
        student_id: profile.uid,
        student_name: profile.full_name,
        staff_name: slot.staff,
        appointment_type: slot.dept,
        description: `Meeting regarding ${slot.dept} enquiry.`,
        scheduled_start: slot.time,
        scheduled_end: new Date(new Date(slot.time).getTime() + 30 * 60000).toISOString(),
        status: 'confirmed',
      });
      setShowBooking(false);
      setLoading(false);
    }, 800);
  };

  const handleStatusChange = (id: string, status: AppointmentStatus) => {
    updateAppointment(id, { status });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'requested': return 'bg-blue-100 text-blue-700';
      case 'rescheduled': return 'bg-amber-100 text-amber-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'completed': return 'bg-slate-100 text-slate-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Appointments</h1>
          <p className="text-slate-500">Manage your upcoming meetings with university staff.</p>
        </div>
        {profile.role === 'student' && !showBooking && (
          <button
            onClick={() => setShowBooking(true)}
            className="flex items-center gap-2 bg-teal-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-teal-700 transition-all shadow-lg shadow-teal-100"
          >
            <Plus className="w-5 h-5" />
            Book Appointment
          </button>
        )}
      </div>

      {showBooking ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="p-8 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Book a New Appointment</h2>
            <button onClick={() => setShowBooking(false)} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50">
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="p-8 space-y-8">
            <div className="flex gap-4 overflow-x-auto pb-2">
              {['Admissions', 'Academic Support', 'Financial Services', 'Student Welfare', 'International / Visa Support'].map(dept => (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(dept)}
                  className={`px-4 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedDept === dept ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                  {dept}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {slots.map(slot => (
                <div key={slot.id} className="p-6 rounded-2xl border border-slate-100 bg-slate-50 flex items-center justify-between group hover:border-teal-500 transition-all">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-teal-600">
                      {slot.type === 'virtual' ? <Video className="w-4 h-4" /> : <MapPin className="w-4 h-4" />}
                      <span className="text-[10px] font-bold uppercase tracking-widest">{slot.type.replace('_', ' ')}</span>
                    </div>
                    <h4 className="font-bold text-slate-900">{slot.staff}</h4>
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-medium">
                      <div className="flex items-center gap-1"><CalendarIcon className="w-3 h-3" /> {new Date(slot.time).toLocaleDateString()}</div>
                      <div className="flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(slot.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                  <button
                    disabled={loading}
                    onClick={() => handleBook(slot)}
                    className="p-3 rounded-full bg-white border border-slate-200 text-teal-600 hover:bg-teal-600 hover:text-white transition-all shadow-sm"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />}
                  </button>
                </div>
              ))}
              {slots.length === 0 && <div className="col-span-2 p-12 text-center text-slate-400 italic">No available slots for this department.</div>}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userAppointments.length > 0 ? userAppointments.map(apt => (
            <div key={apt.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 relative overflow-hidden">
              {apt.status === 'cancelled' && <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center">
                <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg border border-red-100 font-bold text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Cancelled
                </div>
              </div>}
              
              <div className="flex items-center justify-between">
                <div className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest ${getStatusColor(apt.status)}`}>
                  {apt.status}
                </div>
                <div className="text-slate-400"><CalendarDays className="w-5 h-5" /></div>
              </div>
              
              <div>
                <h4 className="font-bold text-slate-900 text-lg">{apt.staff_name || 'University Staff'}</h4>
                <p className="text-sm text-slate-500 font-medium">{apt.appointment_type}</p>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-50">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Clock className="w-4 h-4 text-slate-400" />
                  {new Date(apt.scheduled_start).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Video className="w-4 h-4 text-slate-400" />
                  <span className="truncate">Virtual Meeting Link</span>
                </div>
              </div>

              {apt.status !== 'cancelled' && apt.status !== 'completed' && (
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => handleStatusChange(apt.id, 'rescheduled')}
                    className="flex-1 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all"
                  >
                    Reschedule
                  </button>
                  <button 
                    onClick={() => handleStatusChange(apt.id, 'cancelled')}
                    className="flex-1 py-2 rounded-lg border border-red-100 text-xs font-bold text-red-600 hover:bg-red-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )) : (
            <div className="col-span-full p-24 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CalendarIcon className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No appointments yet</h3>
              <p className="text-slate-500 mb-6">You haven't booked any appointments with university staff.</p>
              {profile.role === 'student' && (
                <button
                  onClick={() => setShowBooking(true)}
                  className="text-teal-600 font-bold hover:underline"
                >
                  Book your first appointment
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
