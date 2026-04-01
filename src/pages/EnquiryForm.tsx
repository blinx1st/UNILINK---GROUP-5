import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import { useDemoData } from '../DemoContext';
import { Send, Loader2, Sparkles, AlertCircle } from 'lucide-react';

import { triageEnquiry } from '../services/aiService';

export default function EnquiryForm() {
  const { profile } = useAuth();
  const { addEnquiry } = useDemoData();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [triageLoading, setTriageLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    category: 'Admissions',
    description: '',
  });
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);

  const handleTriage = async () => {
    if (!formData.title || !formData.description) return;
    setTriageLoading(true);
    try {
      const data = await triageEnquiry(formData.title, formData.description, formData.category);
      setAiSuggestion(data);
    } catch (error) {
      console.error('Triage Error:', error);
    } finally {
      setTriageLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    try {
      addEnquiry({
        ...formData,
        student_id: profile.uid,
        student_name: profile.full_name,
        status: 'submitted',
        priority: aiSuggestion?.suggested_priority || 'medium',
        type: aiSuggestion?.suggested_complexity || 'general',
        ai_triage_summary: aiSuggestion?.summary || null,
      });
      navigate('/enquiries');
    } catch (error) {
      console.error('Submit Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-slate-100">
          <h2 className="text-2xl font-bold text-slate-900">Submit New Enquiry</h2>
          <p className="text-slate-500">Tell us how we can help you today.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Enquiry Title</label>
            <input
              required
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              onBlur={handleTriage}
              placeholder="e.g., Question about my tuition payment plan"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Department / Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all appearance-none bg-white"
            >
              <option>Admissions</option>
              <option>Academic Support</option>
              <option>Financial Services</option>
              <option>Student Welfare</option>
              <option>International / Visa Support</option>
              <option>Graduation / Careers</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700">Detailed Description</label>
            <textarea
              required
              rows={6}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              onBlur={handleTriage}
              placeholder="Please provide as much detail as possible..."
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all resize-none"
            />
          </div>

          {/* AI Suggestion Panel */}
          {(triageLoading || aiSuggestion) && (
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-teal-600">
                  <Sparkles className="w-5 h-5" />
                  <span className="text-sm font-bold uppercase tracking-wider">AI Triage Insights</span>
                </div>
                {triageLoading && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
              </div>

              {aiSuggestion && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Suggested Priority</p>
                    <p className="text-sm font-semibold text-slate-700 capitalize">{aiSuggestion.suggested_priority}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">Complexity</p>
                    <p className="text-sm font-semibold text-slate-700 capitalize">{aiSuggestion.suggested_complexity}</p>
                  </div>
                  <div className="md:col-span-2 space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase">AI Summary</p>
                    <p className="text-sm text-slate-600 italic">"{aiSuggestion.summary}"</p>
                  </div>
                  {aiSuggestion.sensitivity_flags?.length > 0 && (
                    <div className="md:col-span-2 flex items-center gap-2 p-2 rounded-lg bg-red-50 text-red-700 border border-red-100">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <p className="text-xs font-medium">Sensitivity detected: {aiSuggestion.sensitivity_flags.join(', ')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="pt-4">
            <button
              disabled={loading}
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white font-bold py-4 rounded-xl hover:bg-teal-700 transition-all shadow-lg shadow-teal-100 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              Submit Enquiry
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
