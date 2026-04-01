import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useDemoData, EnquiryStatus, EnquiryType } from '../DemoContext';
import { 
  MessageSquare, 
  Clock, 
  User, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert,
  Bot,
  Paperclip,
  MoreVertical,
  ChevronRight,
  Loader2,
  ArrowUpRight,
  UserPlus,
  CheckCircle,
  XCircle,
  Star
} from 'lucide-react';

export default function EnquiryDetail() {
  const { id } = useParams();
  const { profile } = useAuth();
  const { enquiries, updateEnquiry, addResponse, addFeedback } = useDemoData();
  const navigate = useNavigate();
  const [newResponse, setNewResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackComment, setFeedbackComment] = useState('');

  const enquiry = enquiries.find(e => e.id === id);

  if (!enquiry) return <div className="p-12 text-center text-slate-400">Enquiry not found.</div>;
  if (!profile) return null;

  const handleSendResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResponse.trim() || !profile || !id) return;
    setLoading(true);
    
    addResponse(id, {
      enquiry_id: id,
      author_id: profile.uid,
      author_name: profile.full_name,
      author_role: profile.role,
      content: newResponse,
    });

    // Auto-update status if staff replies
    if (profile.role !== 'student' && enquiry.status === 'assigned') {
      updateEnquiry(id, { status: 'in_progress' });
    }

    setNewResponse('');
    setLoading(false);
  };

  const handleStatusChange = (newStatus: EnquiryStatus) => {
    updateEnquiry(enquiry.id, { status: newStatus });
  };

  const handleClassify = (type: EnquiryType) => {
    updateEnquiry(enquiry.id, { type, status: 'triaged' });
  };

  const handleAssign = (role: any) => {
    updateEnquiry(enquiry.id, { assigned_role: role, status: 'assigned' });
  };

  const handleFeedbackSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (feedbackRating === 0) return;
    
    addFeedback({
      enquiry_id: enquiry.id,
      student_id: profile.uid,
      rating: feedbackRating,
      comment: feedbackComment,
    });
    
    updateEnquiry(enquiry.id, { status: 'closed' });
  };

  const isStudent = profile.role === 'student';
  const isAdmin = profile.role === 'admin_officer';
  const isSupport = profile.role === 'student_support_officer';
  const isManager = profile.role === 'manager';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Conversation */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{enquiry.enquiry_code}</span>
              <StatusBadge status={enquiry.status} />
            </div>
            <div className="flex items-center gap-2">
              {/* Workflow Actions for Staff */}
              {!isStudent && enquiry.status !== 'closed' && (
                <div className="flex items-center gap-2">
                  {isAdmin && enquiry.status === 'submitted' && (
                    <>
                      <button onClick={() => handleClassify('general')} className="text-xs font-bold text-teal-600 hover:bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200 transition-all">Classify General</button>
                      <button onClick={() => handleClassify('complex')} className="text-xs font-bold text-purple-600 hover:bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200 transition-all">Classify Complex</button>
                    </>
                  )}
                  {isAdmin && enquiry.status === 'triaged' && (
                    <>
                      <button onClick={() => handleAssign('admin_officer')} className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 transition-all"><UserPlus className="w-3 h-3" /> Assign Me</button>
                      <button onClick={() => handleAssign('student_support_officer')} className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-200 transition-all"><UserPlus className="w-3 h-3" /> Assign Support</button>
                    </>
                  )}
                  {(isAdmin || isSupport) && enquiry.status === 'in_progress' && (
                    <>
                      <button onClick={() => handleStatusChange('resolved')} className="flex items-center gap-1 text-xs font-bold text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 transition-all"><CheckCircle className="w-3 h-3" /> Resolve</button>
                      <button onClick={() => handleStatusChange('escalated')} className="flex items-center gap-1 text-xs font-bold text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 transition-all"><ArrowUpRight className="w-3 h-3" /> Escalate</button>
                    </>
                  )}
                  {isManager && enquiry.status === 'escalated' && (
                    <button onClick={() => handleStatusChange('resolved')} className="flex items-center gap-1 text-xs font-bold text-green-600 hover:bg-green-50 px-3 py-1.5 rounded-lg border border-green-200 transition-all"><CheckCircle className="w-3 h-3" /> Resolve Escalation</button>
                  )}
                </div>
              )}
              <button className="p-2 text-slate-400 hover:text-slate-600"><MoreVertical className="w-5 h-5" /></button>
            </div>
          </div>
          
          <div className="p-8 space-y-4">
            <h1 className="text-2xl font-bold text-slate-900">{enquiry.title}</h1>
            <p className="text-slate-600 leading-relaxed">{enquiry.description}</p>
            <div className="flex flex-wrap items-center gap-4 pt-4 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              <div className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Submitted {new Date(enquiry.created_at).toLocaleString()}</div>
              <div className="flex items-center gap-1.5"><User className="w-4 h-4" /> Category: {enquiry.category}</div>
              <div className="flex items-center gap-1.5"><ShieldAlert className="w-4 h-4" /> Priority: {enquiry.priority}</div>
            </div>
          </div>
        </div>

        {/* Responses Thread */}
        <div className="space-y-6">
          {enquiry.responses.map((resp) => (
            <div key={resp.id} className={`flex gap-4 ${resp.author_role === 'student' ? 'flex-row' : 'flex-row-reverse'}`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${resp.author_role === 'student' ? 'bg-teal-100 text-teal-600' : 'bg-indigo-100 text-indigo-600'}`}>
                {resp.author_role === 'student' ? <User className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
              </div>
              <div className={`flex-1 p-6 rounded-2xl shadow-sm border ${resp.author_role === 'student' ? 'bg-white border-slate-200' : 'bg-indigo-50 border-indigo-100'}`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{resp.author_role.replace('_', ' ')}</span>
                    <span className="text-sm font-bold text-slate-900">{resp.author_name}</span>
                  </div>
                  <span className="text-[10px] text-slate-400">{new Date(resp.created_at).toLocaleString()}</span>
                </div>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{resp.content}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Feedback Section for Student */}
        {isStudent && enquiry.status === 'resolved' && !enquiry.feedback && (
          <div className="bg-teal-50 p-8 rounded-2xl border border-teal-100 space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-teal-900">How did we do?</h3>
              <p className="text-teal-700">Your enquiry has been resolved. Please provide your feedback to help us improve.</p>
            </div>
            <form onSubmit={handleFeedbackSubmit} className="space-y-4">
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button 
                    key={star}
                    type="button"
                    onClick={() => setFeedbackRating(star)}
                    className={`p-2 transition-all ${feedbackRating >= star ? 'text-amber-500 scale-110' : 'text-slate-300'}`}
                  >
                    <Star className="w-8 h-8 fill-current" />
                  </button>
                ))}
              </div>
              <textarea
                rows={3}
                value={feedbackComment}
                onChange={(e) => setFeedbackComment(e.target.value)}
                placeholder="Any additional comments?"
                className="w-full px-4 py-3 rounded-xl border border-teal-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all resize-none bg-white"
              />
              <button
                type="submit"
                disabled={feedbackRating === 0}
                className="w-full bg-teal-600 text-white font-bold py-3 rounded-xl hover:bg-teal-700 transition-all disabled:opacity-50"
              >
                Submit Feedback & Close Enquiry
              </button>
            </form>
          </div>
        )}

        {/* Reply Box */}
        {enquiry.status !== 'closed' && enquiry.status !== 'resolved' && (
          <form onSubmit={handleSendResponse} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <textarea
              rows={4}
              value={newResponse}
              onChange={(e) => setNewResponse(e.target.value)}
              placeholder="Type your message here..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all resize-none"
            />
            <div className="flex items-center justify-between">
              <button type="button" className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-700">
                <Paperclip className="w-4 h-4" />
                Attach Files
              </button>
              <button
                disabled={loading || !newResponse.trim()}
                type="submit"
                className="flex items-center gap-2 bg-teal-600 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-teal-700 transition-all disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                Send Reply
              </button>
            </div>
          </form>
        )}

        {enquiry.status === 'closed' && enquiry.feedback && (
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Feedback Submitted
            </h3>
            <div className="flex items-center gap-1 mb-2">
              {[1, 2, 3, 4, 5].map(star => (
                <Star key={star} className={`w-4 h-4 ${enquiry.feedback!.rating >= star ? 'text-amber-500 fill-current' : 'text-slate-300'}`} />
              ))}
            </div>
            <p className="text-sm text-slate-600 italic">"{enquiry.feedback.comment}"</p>
          </div>
        )}
      </div>

      {/* Sidebar Info */}
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-4">Enquiry Details</h3>
          
          <div className="space-y-4">
            <DetailItem label="Priority" value={enquiry.priority} color={enquiry.priority === 'high' ? 'text-red-600' : 'text-slate-700'} />
            <DetailItem label="Complexity" value={enquiry.type || 'Unclassified'} />
            <DetailItem label="Assigned Role" value={enquiry.assigned_role?.replace('_', ' ') || 'Unassigned'} />
            <DetailItem label="Last Updated" value={new Date(enquiry.updated_at).toLocaleDateString()} />
          </div>

          {enquiry.ai_triage_summary && (
            <div className="p-4 rounded-xl bg-teal-50 border border-teal-100 space-y-2">
              <div className="flex items-center gap-2 text-teal-700">
                <Bot className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">AI Triage Summary</span>
              </div>
              <p className="text-xs text-teal-800 leading-relaxed italic">"{enquiry.ai_triage_summary}"</p>
            </div>
          )}
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-4">Timeline</h3>
          <div className="space-y-6 relative before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
            <TimelineItem status="Submitted" date={enquiry.created_at} active />
            <TimelineItem status="Triaged" active={enquiry.status !== 'submitted'} />
            <TimelineItem status="Assigned" active={!!enquiry.assigned_role} />
            <TimelineItem status="In Progress" active={enquiry.status === 'in_progress' || enquiry.status === 'escalated' || enquiry.status === 'resolved' || enquiry.status === 'closed'} />
            <TimelineItem status="Resolved" active={enquiry.status === 'resolved' || enquiry.status === 'closed'} />
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailItem({ label, value, color = 'text-slate-700' }: any) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-400 font-medium">{label}</span>
      <span className={`font-bold capitalize ${color}`}>{value}</span>
    </div>
  );
}

function TimelineItem({ status, date, active }: any) {
  return (
    <div className="flex items-center gap-4 relative z-10">
      <div className={`w-4 h-4 rounded-full border-2 border-white shadow-sm ${active ? 'bg-teal-500' : 'bg-slate-200'}`}></div>
      <div>
        <p className={`text-sm font-bold ${active ? 'text-slate-900' : 'text-slate-400'}`}>{status}</p>
        {date && <p className="text-[10px] text-slate-400">{new Date(date).toLocaleString()}</p>}
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
