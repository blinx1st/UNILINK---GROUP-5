import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useDemoData, EnquiryStatus } from '../DemoContext';
import { 
  Search, 
  Filter, 
  Plus, 
  ChevronRight, 
  MessageSquare, 
  Clock, 
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

export default function Enquiries() {
  const { profile } = useAuth();
  const { enquiries } = useDemoData();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<EnquiryStatus | 'all'>('all');

  if (!profile) return null;

  const filteredEnquiries = enquiries.filter(enq => {
    // Role based filtering
    const roleMatches = profile.role === 'student' 
      ? enq.student_id === profile.uid 
      : profile.role === 'admin_officer'
        ? (enq.status === 'submitted' || enq.status === 'triaged' || enq.assigned_role === 'admin_officer')
        : profile.role === 'student_support_officer'
          ? (enq.assigned_role === 'student_support_officer' || enq.type === 'complex')
          : profile.role === 'manager'
            ? (enq.status === 'escalated' || enq.status === 'resolved')
            : true; // Director and IT see all

    const statusMatches = statusFilter === 'all' || enq.status === statusFilter;
    const searchMatches = enq.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         enq.enquiry_code.toLowerCase().includes(searchTerm.toLowerCase());

    return roleMatches && statusMatches && searchMatches;
  });

  const statuses: (EnquiryStatus | 'all')[] = ['all', 'submitted', 'triaged', 'assigned', 'in_progress', 'escalated', 'resolved', 'closed'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Enquiries</h1>
          <p className="text-slate-500">Manage and track student enquiries.</p>
        </div>
        {profile.role === 'student' && (
          <button 
            onClick={() => navigate('/enquiries/new')}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Enquiry
          </button>
        )}
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Search by title or code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
          />
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          {statuses.map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                statusFilter === status 
                  ? 'bg-teal-600 text-white' 
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {status.replace('_', ' ').toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Enquiry</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEnquiries.length > 0 ? filteredEnquiries.map((enq) => (
                <tr 
                  key={enq.id} 
                  className="hover:bg-slate-50 transition-colors cursor-pointer group"
                  onClick={() => navigate(`/enquiries/${enq.id}`)}
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-slate-400 mb-1">{enq.enquiry_code}</span>
                      <span className="font-semibold text-slate-900 group-hover:text-teal-600 transition-colors">{enq.title}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-slate-600">{enq.student_name}</span>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={enq.status} />
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      enq.type === 'complex' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {enq.type || 'Unclassified'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-500">
                    {new Date(enq.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-teal-500 transition-colors inline" />
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
                    No enquiries found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${colors[status] || 'bg-slate-100 text-slate-700'}`}>
      {status.replace('_', ' ')}
    </span>
  );
}
