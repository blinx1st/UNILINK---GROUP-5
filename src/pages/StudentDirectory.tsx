import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import {
  StudentDeleteResult,
  StudentFormInput,
  StudentMutationResult,
  StudentRecord,
  useDemoData,
} from '../DemoContext';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  GraduationCap,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  Users,
  X,
} from 'lucide-react';

type StudentModalMode = 'create' | 'edit' | null;

const EMPTY_FORM: StudentFormInput = {
  student_number: '',
  full_name: '',
  email: '',
  program: '',
  year_level: 1,
  status: 'active',
  phone: '',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function StudentDirectory() {
  const { profile } = useAuth();
  const { students, addStudent, updateStudent, deleteStudent } = useDemoData();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [programFilter, setProgramFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [modalMode, setModalMode] = useState<StudentModalMode>(null);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [formData, setFormData] = useState<StudentFormInput>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<StudentRecord | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const canManageStudents = profile?.role === 'admin_officer' || profile?.role === 'manager';
  const filteredStudents = students.filter(student => {
    const matchesSearch =
      student.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_number.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesProgram = programFilter === 'all' || student.program === programFilter;
    const matchesStatus = statusFilter === 'all' || student.status === statusFilter;
    const matchesRisk = riskFilter === 'all' || (riskFilter === 'at_risk' ? student.status === 'at_risk' : student.status !== 'at_risk');

    return matchesSearch && matchesProgram && matchesStatus && matchesRisk;
  });

  const stats = {
    total: students.length,
    atRisk: students.filter(student => student.status === 'at_risk').length,
    active: students.filter(student => student.status === 'active').length,
    graduating: students.filter(student => student.status === 'graduating').length,
  };

  const programs = Array.from(new Set(students.map(student => student.program))).sort();

  const openCreateModal = () => {
    setModalMode('create');
    setEditingStudentId(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
  };

  const openEditModal = (student: StudentRecord) => {
    setModalMode('edit');
    setEditingStudentId(student.id);
    setFormData({
      student_number: student.student_number,
      full_name: student.full_name,
      email: student.email,
      program: student.program,
      year_level: student.year_level,
      status: student.status,
      phone: student.phone,
    });
    setFormError(null);
  };

  const closeStudentModal = () => {
    setModalMode(null);
    setEditingStudentId(null);
    setFormData(EMPTY_FORM);
    setFormError(null);
  };

  const openDeleteModal = (student: StudentRecord) => {
    setPendingDelete(student);
    setDeleteError(null);
  };

  const closeDeleteModal = () => {
    setPendingDelete(null);
    setDeleteError(null);
  };

  const handleFormSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateStudentForm(formData);
    if (validationError) {
      setFormError(validationError);
      return;
    }

    const sanitizedInput: StudentFormInput = {
      student_number: formData.student_number.trim(),
      full_name: formData.full_name.trim(),
      email: formData.email.trim(),
      program: formData.program.trim(),
      year_level: Number(formData.year_level),
      status: formData.status,
      phone: formData.phone.trim(),
    };

    const result = modalMode === 'create'
      ? addStudent(sanitizedInput)
      : updateStudent(editingStudentId!, sanitizedInput);

    if (isStudentMutationError(result)) {
      setFormError(result.error);
      return;
    }

    closeStudentModal();
  };

  const handleDeleteStudent = () => {
    if (!pendingDelete) return;

    const result = deleteStudent(pendingDelete.id);
    if (isStudentDeleteError(result)) {
      setDeleteError(formatDeleteError(result.error, result.linkedCounts));
      return;
    }

    closeDeleteModal();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Student Directory</h1>
          <p className="text-slate-500">Manage and monitor student service records</p>
        </div>
        {canManageStudents && (
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 font-semibold text-white shadow-sm transition-colors hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            Add Student
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Students" value={stats.total} icon={Users} color="bg-blue-50 text-blue-600" />
        <StatCard label="At Risk" value={stats.atRisk} icon={AlertCircle} color="bg-red-50 text-red-600" />
        <StatCard label="Active" value={stats.active} icon={CheckCircle2} color="bg-emerald-50 text-emerald-600" />
        <StatCard label="Graduating" value={stats.graduating} icon={GraduationCap} color="bg-amber-50 text-amber-600" />
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email, or student ID..."
            value={searchTerm}
            onChange={event => setSearchTerm(event.target.value)}
            className="w-full rounded-xl border border-slate-200 py-2 pl-10 pr-4 outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <div className="flex flex-wrap gap-4">
          <select
            value={programFilter}
            onChange={event => setProgramFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Programs</option>
            {programs.map(program => (
              <option key={program} value={program}>
                {program}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={event => setStatusFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="at_risk">At Risk</option>
            <option value="graduating">Graduating</option>
            <option value="inactive">Inactive</option>
          </select>
          <select
            value={riskFilter}
            onChange={event => setRiskFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">Risk Level: All</option>
            <option value="at_risk">At Risk Only</option>
            <option value="normal">Normal Only</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Student</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Program & Year</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold uppercase tracking-wider text-slate-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map(student => (
                <tr
                  key={student.id}
                  className="group cursor-pointer transition-colors hover:bg-slate-50"
                  onClick={() => navigate(`/students/${student.id}`)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-bold text-slate-600 transition-colors group-hover:bg-teal-100 group-hover:text-teal-700">
                        {student.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{student.full_name}</p>
                        <p className="text-xs text-slate-500">{student.student_number}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-700">{student.program}</p>
                    <p className="text-xs text-slate-500">Year {student.year_level}</p>
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={student.status} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <ActionButton
                        label="View"
                        onClick={event => {
                          event.stopPropagation();
                          navigate(`/students/${student.id}`);
                        }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </ActionButton>
                      {canManageStudents && (
                        <>
                          <ActionButton
                            label="Edit"
                            onClick={event => {
                              event.stopPropagation();
                              openEditModal(student);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </ActionButton>
                          <ActionButton
                            label="Delete"
                            danger
                            onClick={event => {
                              event.stopPropagation();
                              openDeleteModal(student);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </ActionButton>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    No students found matching your criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalMode && (
        <ModalShell title={modalMode === 'create' ? 'Add Student' : 'Edit Student'} onClose={closeStudentModal}>
          <form className="space-y-4" onSubmit={handleFormSubmit}>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Student Number">
                <input
                  required
                  type="text"
                  value={formData.student_number}
                  onChange={event => setFormData(prev => ({ ...prev, student_number: event.target.value }))}
                  className={inputClassName}
                  placeholder="e.g. S10293899"
                />
              </FormField>
              <FormField label="Full Name">
                <input
                  required
                  type="text"
                  value={formData.full_name}
                  onChange={event => setFormData(prev => ({ ...prev, full_name: event.target.value }))}
                  className={inputClassName}
                  placeholder="e.g. Taylor Brooks"
                />
              </FormField>
              <FormField label="Email">
                <input
                  required
                  type="email"
                  value={formData.email}
                  onChange={event => setFormData(prev => ({ ...prev, email: event.target.value }))}
                  className={inputClassName}
                  placeholder="e.g. taylor.b@unilink.edu"
                />
              </FormField>
              <FormField label="Phone">
                <input
                  required
                  type="text"
                  value={formData.phone}
                  onChange={event => setFormData(prev => ({ ...prev, phone: event.target.value }))}
                  className={inputClassName}
                  placeholder="e.g. +61 412 345 702"
                />
              </FormField>
              <FormField label="Program">
                <input
                  required
                  type="text"
                  list="student-program-options"
                  value={formData.program}
                  onChange={event => setFormData(prev => ({ ...prev, program: event.target.value }))}
                  className={inputClassName}
                  placeholder="e.g. Bachelor of Cyber Security"
                />
                <datalist id="student-program-options">
                  {programs.map(program => (
                    <option key={program} value={program} />
                  ))}
                </datalist>
              </FormField>
              <FormField label="Year Level">
                <input
                  required
                  min={1}
                  step={1}
                  type="number"
                  value={formData.year_level}
                  onChange={event => setFormData(prev => ({ ...prev, year_level: Number(event.target.value) }))}
                  className={inputClassName}
                />
              </FormField>
              <FormField label="Status">
                <select
                  value={formData.status}
                  onChange={event => setFormData(prev => ({ ...prev, status: event.target.value as StudentRecord['status'] }))}
                  className={inputClassName}
                >
                  <option value="active">Active</option>
                  <option value="at_risk">At Risk</option>
                  <option value="graduating">Graduating</option>
                  <option value="inactive">Inactive</option>
                </select>
              </FormField>
            </div>

            {formError && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {formError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeStudentModal}
                className="rounded-xl border border-slate-200 px-4 py-2 font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-teal-700"
              >
                <Save className="h-4 w-4" />
                {modalMode === 'create' ? 'Create Student' : 'Save Changes'}
              </button>
            </div>
          </form>
        </ModalShell>
      )}

      {pendingDelete && (
        <ModalShell title="Delete Student" onClose={closeDeleteModal}>
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-slate-600">
              Delete <span className="font-semibold text-slate-900">{pendingDelete.full_name}</span> from the demo dataset.
              This only works when the student has no linked enquiries, appointments, or notifications.
            </p>

            {deleteError && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="rounded-xl border border-slate-200 px-4 py-2 font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Close
              </button>
              {!deleteError && (
                <button
                  type="button"
                  onClick={handleDeleteStudent}
                  className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 font-semibold text-white transition-colors hover:bg-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Student
                </button>
              )}
            </div>
          </div>
        </ModalShell>
      )}
    </div>
  );
}

function validateStudentForm(formData: StudentFormInput) {
  if (!formData.student_number.trim()) return 'Student number is required.';
  if (!formData.full_name.trim()) return 'Full name is required.';
  if (!formData.email.trim()) return 'Email is required.';
  if (!EMAIL_REGEX.test(formData.email.trim())) return 'Please enter a valid email address.';
  if (!formData.program.trim()) return 'Program is required.';
  if (!formData.phone.trim()) return 'Phone is required.';
  if (!Number.isInteger(Number(formData.year_level)) || Number(formData.year_level) < 1) {
    return 'Year level must be a whole number greater than 0.';
  }

  return null;
}

function isStudentMutationError(
  result: StudentMutationResult,
): result is Extract<StudentMutationResult, { ok: false }> {
  return !result.ok;
}

function isStudentDeleteError(
  result: StudentDeleteResult,
): result is Extract<StudentDeleteResult, { ok: false }> {
  return !result.ok;
}

function formatDeleteError(
  error: string,
  linkedCounts?: { enquiries: number; appointments: number; notifications: number },
) {
  if (!linkedCounts) return error;

  const parts = [
    linkedCounts.enquiries > 0 ? `${linkedCounts.enquiries} enquiries` : null,
    linkedCounts.appointments > 0 ? `${linkedCounts.appointments} appointments` : null,
    linkedCounts.notifications > 0 ? `${linkedCounts.notifications} notifications` : null,
  ].filter(Boolean);

  if (parts.length === 0) return error;

  return `${error} Linked records found: ${parts.join(', ')}.`;
}

function StatCard({ label, value, icon: Icon, color }: any) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className={`rounded-xl p-2 ${color}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: StudentRecord['status'] }) {
  const styles = {
    active: 'border-emerald-100 bg-emerald-50 text-emerald-700',
    at_risk: 'border-red-100 bg-red-50 text-red-700',
    graduating: 'border-amber-100 bg-amber-50 text-amber-700',
    inactive: 'border-slate-100 bg-slate-50 text-slate-700',
  };

  return (
    <span className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
}

function ActionButton({
  children,
  danger = false,
  label,
  onClick,
}: {
  children: React.ReactNode;
  danger?: boolean;
  label: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`rounded-lg border px-2.5 py-2 transition-colors ${
        danger
          ? 'border-red-100 text-red-600 hover:bg-red-50'
          : 'border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-teal-600'
      }`}
    >
      {children}
    </button>
  );
}

function ModalShell({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-5">
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

function FormField({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const inputClassName =
  'w-full rounded-xl border border-slate-200 px-4 py-3 outline-none transition focus:border-transparent focus:ring-2 focus:ring-teal-500';
