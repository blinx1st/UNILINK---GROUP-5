import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserRole } from './AuthContext';

export type EnquiryStatus = 'submitted' | 'triaged' | 'assigned' | 'in_progress' | 'escalated' | 'resolved' | 'closed';
export type EnquiryType = 'general' | 'complex';
export type AppointmentStatus = 'requested' | 'confirmed' | 'rescheduled' | 'cancelled' | 'completed';
export type StudentStatus = 'active' | 'at_risk' | 'graduating' | 'inactive';

export interface StudentRecord {
  id: string;
  student_number: string;
  full_name: string;
  email: string;
  program: string;
  year_level: number;
  status: StudentStatus;
  phone: string;
  created_at: string;
}

export interface EnquiryResponse {
  id: string;
  enquiry_id: string;
  author_id: string;
  author_name: string;
  author_role: UserRole;
  content: string;
  created_at: string;
}

export interface Feedback {
  id: string;
  enquiry_id: string;
  student_id: string;
  rating: number;
  comment: string;
  created_at: string;
}

export interface Enquiry {
  id: string;
  enquiry_code: string;
  student_id: string;
  student_name: string;
  title: string;
  description: string;
  category: string;
  status: EnquiryStatus;
  type?: EnquiryType;
  priority: 'low' | 'medium' | 'high';
  assigned_to?: string; // staff uid
  assigned_role?: UserRole;
  ai_triage_summary?: string;
  created_at: string;
  updated_at: string;
  responses: EnquiryResponse[];
  feedback?: Feedback;
}

export interface Appointment {
  id: string;
  student_id: string;
  student_name: string;
  staff_id?: string;
  staff_name?: string;
  appointment_type: string;
  description: string;
  scheduled_start: string;
  scheduled_end: string;
  status: AppointmentStatus;
  related_enquiry_id?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string; // recipient
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  link?: string;
  read: boolean;
  created_at: string;
}

export type StudentFormInput = Omit<StudentRecord, 'id' | 'created_at'>;

export type StudentMutationResult =
  | { ok: true }
  | { ok: false; error: string };

export interface StudentLinkedCounts {
  enquiries: number;
  appointments: number;
  notifications: number;
}

export type StudentDeleteResult =
  | { ok: true }
  | { ok: false; error: string; linkedCounts?: StudentLinkedCounts };

interface DemoContextType {
  enquiries: Enquiry[];
  appointments: Appointment[];
  notifications: Notification[];
  students: StudentRecord[];
  addStudent: (input: StudentFormInput) => StudentMutationResult;
  updateStudent: (id: string, updates: StudentFormInput) => StudentMutationResult;
  deleteStudent: (id: string) => StudentDeleteResult;
  addEnquiry: (enquiry: Omit<Enquiry, 'id' | 'enquiry_code' | 'created_at' | 'updated_at' | 'responses'>) => void;
  updateEnquiry: (id: string, updates: Partial<Enquiry>) => void;
  addResponse: (enquiryId: string, response: Omit<EnquiryResponse, 'id' | 'created_at'>) => void;
  addFeedback: (feedback: Omit<Feedback, 'id' | 'created_at'>) => void;
  addAppointment: (appointment: Omit<Appointment, 'id' | 'created_at'>) => void;
  updateAppointment: (id: string, updates: Partial<Appointment>) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'created_at' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: (userId: string) => void;
}

interface DemoSeedData {
  students: StudentRecord[];
  enquiries: Enquiry[];
  appointments: Appointment[];
  notifications: Notification[];
}

interface PersistedDemoState extends DemoSeedData {
  version: number;
}

const DemoContext = createContext<DemoContextType | undefined>(undefined);

const STORAGE_KEY = 'unilink_demo_state';
const STORAGE_VERSION = 2;
const DAY_IN_MS = 86_400_000;
const HOUR_IN_MS = 3_600_000;
const MINUTE_IN_MS = 60_000;
const DEMO_ROLE_IDS = [
  'demo-admin_officer',
  'demo-student_support_officer',
  'demo-manager',
  'demo-director',
  'demo-it_support',
] as const;

function normalizeStudentString(value: string) {
  return value.trim().toLowerCase();
}

function getStudentLinkedCounts(
  studentId: string,
  enquiries: Enquiry[],
  appointments: Appointment[],
  notifications: Notification[],
): StudentLinkedCounts {
  return {
    enquiries: enquiries.filter(enquiry => enquiry.student_id === studentId).length,
    appointments: appointments.filter(appointment => appointment.student_id === studentId).length,
    notifications: notifications.filter(notification => notification.user_id === studentId).length,
  };
}

function isPersistedDemoState(value: unknown): value is PersistedDemoState {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const candidate = value as Partial<PersistedDemoState>;
  return (
    candidate.version === STORAGE_VERSION &&
    Array.isArray(candidate.students) &&
    Array.isArray(candidate.enquiries) &&
    Array.isArray(candidate.appointments) &&
    Array.isArray(candidate.notifications)
  );
}

function validateDemoSeedData(seedData: DemoSeedData) {
  const studentIds = new Set(seedData.students.map(student => student.id));
  const studentNames = new Map(seedData.students.map(student => [student.id, student.full_name]));
  const enquiryIds = new Set(seedData.enquiries.map(enquiry => enquiry.id));
  const notificationUsers = new Set<string>([...studentIds, ...DEMO_ROLE_IDS]);

  for (const enquiry of seedData.enquiries) {
    if (!studentIds.has(enquiry.student_id)) {
      throw new Error(`Seed data error: enquiry ${enquiry.id} references unknown student ${enquiry.student_id}`);
    }

    if (studentNames.get(enquiry.student_id) !== enquiry.student_name) {
      throw new Error(`Seed data error: enquiry ${enquiry.id} has a mismatched student_name`);
    }

    if (enquiry.feedback) {
      if (enquiry.feedback.enquiry_id !== enquiry.id) {
        throw new Error(`Seed data error: feedback ${enquiry.feedback.id} is linked to the wrong enquiry`);
      }

      if (enquiry.feedback.student_id !== enquiry.student_id) {
        throw new Error(`Seed data error: feedback ${enquiry.feedback.id} does not belong to the enquiry student`);
      }

      if (!['resolved', 'closed'].includes(enquiry.status)) {
        throw new Error(`Seed data error: feedback ${enquiry.feedback.id} is attached to an unresolved enquiry`);
      }
    }
  }

  for (const appointment of seedData.appointments) {
    if (!studentIds.has(appointment.student_id)) {
      throw new Error(`Seed data error: appointment ${appointment.id} references unknown student ${appointment.student_id}`);
    }

    if (studentNames.get(appointment.student_id) !== appointment.student_name) {
      throw new Error(`Seed data error: appointment ${appointment.id} has a mismatched student_name`);
    }

    if (appointment.related_enquiry_id && !enquiryIds.has(appointment.related_enquiry_id)) {
      throw new Error(`Seed data error: appointment ${appointment.id} references unknown enquiry ${appointment.related_enquiry_id}`);
    }
  }

  for (const notification of seedData.notifications) {
    if (!notificationUsers.has(notification.user_id)) {
      throw new Error(`Seed data error: notification ${notification.id} targets unknown user ${notification.user_id}`);
    }
  }
}

function createDemoSeedData(): DemoSeedData {
  const now = Date.now();
  const at = (offsetMs: number) => new Date(now + offsetMs).toISOString();
  const daysAgo = (days: number, hours = 0) => at(-(days * DAY_IN_MS + hours * HOUR_IN_MS));
  const daysFromNow = (days: number, hours = 0, minutes = 0) => at(days * DAY_IN_MS + hours * HOUR_IN_MS + minutes * MINUTE_IN_MS);

  const studentDefinitions: Omit<StudentRecord, 'created_at'>[] = [
    { id: 'demo-student', student_number: 'S10293847', full_name: 'Demo Student', email: 'student@unilink.edu', program: 'Bachelor of Computer Science', year_level: 3, status: 'active', phone: '+61 412 345 678' },
    { id: 'student-2', student_number: 'S10293848', full_name: 'Alice Johnson', email: 'alice.j@unilink.edu', program: 'Bachelor of Arts', year_level: 2, status: 'at_risk', phone: '+61 412 345 679' },
    { id: 'student-3', student_number: 'S10293849', full_name: 'Bob Smith', email: 'bob.s@unilink.edu', program: 'Master of Engineering', year_level: 1, status: 'active', phone: '+61 412 345 680' },
    { id: 'student-4', student_number: 'S10293850', full_name: 'Charlie Brown', email: 'charlie.b@unilink.edu', program: 'Bachelor of Business Administration', year_level: 4, status: 'graduating', phone: '+61 412 345 681' },
    { id: 'student-5', student_number: 'S10293851', full_name: 'David Wilson', email: 'david.w@unilink.edu', program: 'Bachelor of Computer Science', year_level: 1, status: 'active', phone: '+61 412 345 682' },
    { id: 'student-6', student_number: 'S10293852', full_name: 'Emma Davis', email: 'emma.d@unilink.edu', program: 'Bachelor of Arts', year_level: 3, status: 'at_risk', phone: '+61 412 345 683' },
    { id: 'student-7', student_number: 'S10293853', full_name: 'Frank Miller', email: 'frank.m@unilink.edu', program: 'Master of Engineering', year_level: 2, status: 'active', phone: '+61 412 345 684' },
    { id: 'student-8', student_number: 'S10293854', full_name: 'Grace Hopper', email: 'grace.h@unilink.edu', program: 'Bachelor of Computer Science', year_level: 2, status: 'active', phone: '+61 412 345 685' },
    { id: 'student-9', student_number: 'S10293855', full_name: 'Henry Ford', email: 'henry.f@unilink.edu', program: 'Bachelor of Business Administration', year_level: 3, status: 'inactive', phone: '+61 412 345 686' },
    { id: 'student-10', student_number: 'S10293856', full_name: 'Isabella Rossellini', email: 'isabella.r@unilink.edu', program: 'Bachelor of Design', year_level: 1, status: 'active', phone: '+61 412 345 687' },
    { id: 'student-11', student_number: 'S10293857', full_name: 'Jack Sparrow', email: 'jack.s@unilink.edu', program: 'Bachelor of International Business', year_level: 2, status: 'at_risk', phone: '+61 412 345 688' },
    { id: 'student-12', student_number: 'S10293858', full_name: 'Katherine Johnson', email: 'katherine.j@unilink.edu', program: 'Bachelor of Finance', year_level: 4, status: 'graduating', phone: '+61 412 345 689' },
    { id: 'student-13', student_number: 'S10293859', full_name: 'Liam Neeson', email: 'liam.n@unilink.edu', program: 'Bachelor of Communication', year_level: 3, status: 'active', phone: '+61 412 345 690' },
    { id: 'student-14', student_number: 'S10293860', full_name: 'Mia Hamm', email: 'mia.h@unilink.edu', program: 'Bachelor of Information Systems', year_level: 2, status: 'active', phone: '+61 412 345 691' },
    { id: 'student-15', student_number: 'S10293861', full_name: 'Noah Centineo', email: 'noah.c@unilink.edu', program: 'Bachelor of Computer Science', year_level: 1, status: 'at_risk', phone: '+61 412 345 692' },
    { id: 'student-16', student_number: 'S10293862', full_name: 'Olivia Chen', email: 'olivia.c@unilink.edu', program: 'Bachelor of Nursing', year_level: 2, status: 'active', phone: '+61 412 345 693' },
    { id: 'student-17', student_number: 'S10293863', full_name: 'Peter Parker', email: 'peter.p@unilink.edu', program: 'Bachelor of Media Studies', year_level: 3, status: 'active', phone: '+61 412 345 694' },
    { id: 'student-18', student_number: 'S10293864', full_name: 'Priya Patel', email: 'priya.p@unilink.edu', program: 'Master of Data Science', year_level: 2, status: 'graduating', phone: '+61 412 345 695' },
    { id: 'student-19', student_number: 'S10293865', full_name: 'Quentin Blake', email: 'quentin.b@unilink.edu', program: 'Bachelor of Architecture', year_level: 4, status: 'inactive', phone: '+61 412 345 696' },
    { id: 'student-20', student_number: 'S10293866', full_name: 'Ruby Martinez', email: 'ruby.m@unilink.edu', program: 'Bachelor of Laws', year_level: 2, status: 'active', phone: '+61 412 345 697' },
    { id: 'student-21', student_number: 'S10293867', full_name: 'Sophia Turner', email: 'sophia.t@unilink.edu', program: 'Bachelor of Psychology', year_level: 1, status: 'at_risk', phone: '+61 412 345 698' },
    { id: 'student-22', student_number: 'S10293868', full_name: 'Thomas Anderson', email: 'thomas.a@unilink.edu', program: 'Bachelor of Cyber Security', year_level: 3, status: 'active', phone: '+61 412 345 699' },
    { id: 'student-23', student_number: 'S10293869', full_name: 'Uma Narayan', email: 'uma.n@unilink.edu', program: 'Master of Public Health', year_level: 1, status: 'active', phone: '+61 412 345 700' },
    { id: 'student-24', student_number: 'S10293870', full_name: 'Victor Alvarez', email: 'victor.a@unilink.edu', program: 'Bachelor of Information Systems', year_level: 4, status: 'graduating', phone: '+61 412 345 701' },
  ];

  const students = studentDefinitions.map((student, index) => ({
    ...student,
    created_at: daysAgo(120 - index * 2),
  }));

  const studentMap = new Map(students.map(student => [student.id, student]));
  const getStudent = (studentId: string) => {
    const student = studentMap.get(studentId);
    if (!student) throw new Error(`Unknown demo student: ${studentId}`);
    return student;
  };

  const createResponse = (id: string, enquiryId: string, authorId: string, authorName: string, authorRole: UserRole, content: string, createdAt: string): EnquiryResponse => ({
    id,
    enquiry_id: enquiryId,
    author_id: authorId,
    author_name: authorName,
    author_role: authorRole,
    content,
    created_at: createdAt,
  });

  const createFeedback = (id: string, enquiryId: string, studentId: string, rating: number, comment: string, createdAt: string): Feedback => ({
    id,
    enquiry_id: enquiryId,
    student_id: studentId,
    rating,
    comment,
    created_at: createdAt,
  });

  const createEnquiry = (seed: Omit<Enquiry, 'student_name' | 'responses'> & { responses?: EnquiryResponse[] }): Enquiry => ({
    ...seed,
    student_name: getStudent(seed.student_id).full_name,
    responses: seed.responses ?? [],
  });

  const createAppointment = (seed: Omit<Appointment, 'student_name'>): Appointment => ({
    ...seed,
    student_name: getStudent(seed.student_id).full_name,
  });

  const createNotification = (seed: Omit<Notification, 'read'> & { read?: boolean }): Notification => ({
    ...seed,
    read: seed.read ?? false,
  });

  const enquiries: Enquiry[] = [
    createEnquiry({
      id: 'enq-1',
      enquiry_code: 'ENQ-102938',
      student_id: 'demo-student',
      title: 'Tuition Fee Installment Plan',
      description: 'I would like to request an installment plan for my next semester tuition fees.',
      category: 'Financial Services',
      status: 'resolved',
      type: 'general',
      priority: 'medium',
      assigned_role: 'admin_officer',
      ai_triage_summary: 'Student is requesting a payment plan for tuition fees. This is a standard financial enquiry.',
      created_at: daysAgo(7),
      updated_at: daysAgo(1),
      responses: [
        createResponse('res-1', 'enq-1', 'demo-admin_officer', 'Demo Admin Officer', 'admin_officer', 'Hello! I can certainly help with that. We offer a 3-month installment plan for tuition fees. Would you like me to send you the application form?', daysAgo(3)),
        createResponse('res-2', 'enq-1', 'demo-student', 'Demo Student', 'student', 'Yes, please send the form. Thank you!', daysAgo(2)),
        createResponse('res-3', 'enq-1', 'demo-admin_officer', 'Demo Admin Officer', 'admin_officer', 'The form has been sent to your student email. Please complete it and return it by Friday.', daysAgo(1)),
      ],
      feedback: createFeedback('fb-1', 'enq-1', 'demo-student', 5, 'Very helpful and quick response. The process was smooth.', daysAgo(0, 2)),
    }),
    createEnquiry({
      id: 'enq-2',
      enquiry_code: 'ENQ-493827',
      student_id: 'demo-student',
      title: 'Visa Extension Documents',
      description: 'I need a letter from the university to support my student visa extension application.',
      category: 'International / Visa Support',
      status: 'escalated',
      type: 'complex',
      priority: 'high',
      assigned_role: 'student_support_officer',
      ai_triage_summary: 'Urgent request for visa support documentation. Requires verification of enrollment status and international student records.',
      created_at: daysAgo(1),
      updated_at: daysAgo(1),
      responses: [
        createResponse('res-4', 'enq-2', 'demo-student_support_officer', 'Demo Support Officer', 'student_support_officer', 'I have reviewed your request. Due to some discrepancies in your attendance records, I need to escalate this to the manager for final approval.', daysAgo(0, 6)),
      ],
    }),
    createEnquiry({
      id: 'enq-3',
      enquiry_code: 'ENQ-772839',
      student_id: 'student-11',
      title: 'Academic Support for Accounting',
      description: 'I am struggling with my Accounting 101 course and need some tutoring or extra resources.',
      category: 'Academic Support',
      status: 'in_progress',
      type: 'general',
      priority: 'medium',
      assigned_role: 'student_support_officer',
      ai_triage_summary: 'Student is requesting academic assistance for a specific course. Suggesting peer tutoring or faculty consultation.',
      created_at: daysAgo(3),
      updated_at: daysAgo(2),
      responses: [
        createResponse('res-5', 'enq-3', 'demo-student_support_officer', 'Demo Support Officer', 'student_support_officer', 'We have a peer tutoring program starting next week. I have registered you for the Accounting session on Tuesdays at 2 PM.', daysAgo(2)),
      ],
    }),
    createEnquiry({
      id: 'enq-4',
      enquiry_code: 'ENQ-112233',
      student_id: 'student-12',
      title: 'Graduation Clearance Check',
      description: 'I want to make sure I have met all the requirements for graduation this semester.',
      category: 'Graduation & Careers',
      status: 'assigned',
      type: 'general',
      priority: 'low',
      assigned_role: 'admin_officer',
      ai_triage_summary: 'Final year student checking graduation eligibility. Requires audit of completed credits and core units.',
      created_at: daysAgo(1),
      updated_at: daysAgo(1),
    }),
    createEnquiry({
      id: 'enq-5',
      enquiry_code: 'ENQ-998877',
      student_id: 'student-2',
      title: 'Scholarship Payment Delay',
      description: 'My scholarship payment for this month has not been received yet.',
      category: 'Financial Services',
      status: 'escalated',
      type: 'complex',
      priority: 'high',
      assigned_role: 'admin_officer',
      ai_triage_summary: 'Student reporting missing scholarship funds. High priority financial matter.',
      created_at: daysAgo(2),
      updated_at: daysAgo(1),
      responses: [
        createResponse('res-6', 'enq-5', 'demo-admin_officer', 'Demo Admin Officer', 'admin_officer', 'I have checked with the finance department. There was a technical glitch in the batch processing. The manager is looking into it now.', daysAgo(1, 4)),
      ],
    }),
    createEnquiry({
      id: 'enq-6',
      enquiry_code: 'ENQ-554433',
      student_id: 'student-15',
      title: 'Mental Health Support',
      description: 'I have been feeling very overwhelmed lately and would like to speak with a counselor.',
      category: 'Student Welfare',
      status: 'in_progress',
      type: 'complex',
      priority: 'high',
      assigned_role: 'student_support_officer',
      ai_triage_summary: 'Student requesting mental health assistance. Urgent welfare concern.',
      created_at: daysAgo(1),
      updated_at: at(0),
      responses: [
        createResponse('res-7', 'enq-6', 'demo-student_support_officer', 'Demo Support Officer', 'student_support_officer', 'I have scheduled an urgent appointment for you with our campus counselor today at 3 PM. Please let me know if you can make it.', at(-30 * MINUTE_IN_MS)),
      ],
    }),
    createEnquiry({
      id: 'enq-7',
      enquiry_code: 'ENQ-332211',
      student_id: 'student-4',
      title: 'Internship Credit Approval',
      description: 'I have secured an internship and want to know if it can count towards my degree credits.',
      category: 'Graduation & Careers',
      status: 'resolved',
      type: 'general',
      priority: 'medium',
      assigned_role: 'student_support_officer',
      ai_triage_summary: 'Student seeking credit for external internship. Requires review of internship duties and duration.',
      created_at: daysAgo(7),
      updated_at: daysAgo(3),
      responses: [
        createResponse('res-8', 'enq-7', 'demo-student_support_officer', 'Demo Support Officer', 'student_support_officer', 'Yes, this internship meets our criteria. I have updated your records to include 6 credits for this placement.', daysAgo(3)),
      ],
      feedback: createFeedback('fb-2', 'enq-7', 'student-4', 4, 'Good support, although it took a few days to get the final confirmation.', daysAgo(2)),
    }),
    createEnquiry({
      id: 'enq-8',
      enquiry_code: 'ENQ-441166',
      student_id: 'student-6',
      title: 'Attendance Risk Review',
      description: 'I have received an at-risk notice and want advice on how to recover my attendance standing.',
      category: 'Academic Support',
      status: 'triaged',
      type: 'complex',
      priority: 'high',
      assigned_role: 'student_support_officer',
      ai_triage_summary: 'Student flagged as at-risk is requesting intervention planning and attendance recovery support.',
      created_at: daysAgo(4),
      updated_at: daysAgo(1),
      responses: [
        createResponse('res-9', 'enq-8', 'demo-student_support_officer', 'Demo Support Officer', 'student_support_officer', 'Thank you for reaching out early. We are preparing a support plan and will book a check-in with your course coordinator.', daysAgo(1, 2)),
      ],
    }),
    createEnquiry({
      id: 'enq-9',
      enquiry_code: 'ENQ-673245',
      student_id: 'student-14',
      title: 'Timetable Conflict with Core Unit',
      description: 'Two of my scheduled classes overlap next month and I need help resolving the clash.',
      category: 'Academic Support',
      status: 'resolved',
      type: 'general',
      priority: 'medium',
      assigned_role: 'admin_officer',
      ai_triage_summary: 'Routine timetable clash requiring class swap and admin confirmation.',
      created_at: daysAgo(8),
      updated_at: daysAgo(5),
      responses: [
        createResponse('res-10', 'enq-9', 'demo-admin_officer', 'Demo Admin Officer', 'admin_officer', 'We moved you into the Wednesday tutorial stream. The updated timetable is now visible in the student portal.', daysAgo(5)),
      ],
    }),
    createEnquiry({
      id: 'enq-10',
      enquiry_code: 'ENQ-275510',
      student_id: 'student-16',
      title: 'Clinical Placement Documentation',
      description: 'I need confirmation that my immunization and police check documents have been uploaded correctly for placement.',
      category: 'Admissions',
      status: 'submitted',
      type: 'general',
      priority: 'medium',
      assigned_role: 'admin_officer',
      ai_triage_summary: 'Placement readiness check that requires reviewing submitted compliance documents.',
      created_at: daysAgo(2),
      updated_at: daysAgo(2),
    }),
    createEnquiry({
      id: 'enq-11',
      enquiry_code: 'ENQ-801944',
      student_id: 'student-18',
      title: 'Capstone Presentation Scheduling',
      description: 'I need to confirm the presentation date for my final capstone project before I book family travel.',
      category: 'Graduation & Careers',
      status: 'resolved',
      type: 'general',
      priority: 'medium',
      assigned_role: 'admin_officer',
      ai_triage_summary: 'Graduating postgraduate student seeking confirmation of capstone presentation timeline.',
      created_at: daysAgo(6),
      updated_at: daysAgo(3),
      responses: [
        createResponse('res-11', 'enq-11', 'demo-admin_officer', 'Demo Admin Officer', 'admin_officer', 'Your capstone presentation has been confirmed for the final assessment week on 15 May at 10:00 AM.', daysAgo(3)),
      ],
      feedback: createFeedback('fb-3', 'enq-11', 'student-18', 5, 'Clear and prompt confirmation. This helped me plan around graduation deadlines.', daysAgo(2)),
    }),
    createEnquiry({
      id: 'enq-12',
      enquiry_code: 'ENQ-390122',
      student_id: 'student-9',
      title: 'Return from Leave Consultation',
      description: 'I am considering returning from my leave of absence next semester and need advice on re-enrollment steps.',
      category: 'Admissions',
      status: 'closed',
      type: 'general',
      priority: 'low',
      assigned_role: 'admin_officer',
      ai_triage_summary: 'Inactive student seeking guidance on returning from leave and reactivating enrollment.',
      created_at: daysAgo(18),
      updated_at: daysAgo(10),
      responses: [
        createResponse('res-12', 'enq-12', 'demo-admin_officer', 'Demo Admin Officer', 'admin_officer', 'We have outlined the re-enrollment checklist and sent you the return-from-leave form.', daysAgo(10)),
      ],
    }),
    createEnquiry({
      id: 'enq-13',
      enquiry_code: 'ENQ-654001',
      student_id: 'student-21',
      title: 'Counseling Referral Follow-up',
      description: 'My tutor recommended I speak with student support about stress and missed classes. I would like help with next steps.',
      category: 'Student Welfare',
      status: 'assigned',
      type: 'complex',
      priority: 'high',
      assigned_role: 'student_support_officer',
      ai_triage_summary: 'At-risk first-year student requesting coordinated wellbeing support and attendance follow-up.',
      created_at: daysAgo(2),
      updated_at: daysAgo(1),
      responses: [
        createResponse('res-13', 'enq-13', 'demo-student_support_officer', 'Demo Support Officer', 'student_support_officer', 'I have assigned your case to a support advisor and booked a check-in appointment for tomorrow afternoon.', daysAgo(1, 3)),
      ],
    }),
    createEnquiry({
      id: 'enq-14',
      enquiry_code: 'ENQ-885420',
      student_id: 'student-24',
      title: 'Employer Letter for Graduate Program Interview',
      description: 'I have been shortlisted for a graduate program and need a letter confirming I will complete all degree requirements this semester.',
      category: 'Graduation & Careers',
      status: 'resolved',
      type: 'general',
      priority: 'medium',
      assigned_role: 'admin_officer',
      ai_triage_summary: 'Final-year student requires completion confirmation for external employer screening.',
      created_at: daysAgo(5),
      updated_at: daysAgo(2),
      responses: [
        createResponse('res-14', 'enq-14', 'demo-admin_officer', 'Demo Admin Officer', 'admin_officer', 'Your completion confirmation letter has been issued and emailed to your university account.', daysAgo(2)),
      ],
    }),
    createEnquiry({
      id: 'enq-15',
      enquiry_code: 'ENQ-917731',
      student_id: 'student-22',
      title: 'Multi-Factor Authentication Access Issue',
      description: 'I am locked out of the student portal after resetting my phone and need help restoring access before my lab assessment.',
      category: 'Academic Support',
      status: 'in_progress',
      type: 'general',
      priority: 'medium',
      assigned_role: 'admin_officer',
      ai_triage_summary: 'Routine service desk style request affecting portal access ahead of an assessment.',
      created_at: daysAgo(1, 4),
      updated_at: daysAgo(0, 5),
      responses: [
        createResponse('res-15', 'enq-15', 'demo-admin_officer', 'Demo Admin Officer', 'admin_officer', 'We have reset your MFA enrollment and sent a fresh setup link. Please try again and reply if the issue continues.', daysAgo(0, 5)),
      ],
    }),
    createEnquiry({
      id: 'enq-16',
      enquiry_code: 'ENQ-303019',
      student_id: 'student-19',
      title: 'Portfolio Access After Withdrawal',
      description: 'I withdrew last semester and need temporary access to download my architecture portfolio files.',
      category: 'Admissions',
      status: 'closed',
      type: 'general',
      priority: 'low',
      assigned_role: 'admin_officer',
      ai_triage_summary: 'Inactive student requesting limited account access after withdrawal.',
      created_at: daysAgo(20),
      updated_at: daysAgo(12),
      responses: [
        createResponse('res-16', 'enq-16', 'demo-admin_officer', 'Demo Admin Officer', 'admin_officer', 'Your temporary portfolio access was approved for seven days and the download instructions have been emailed to you.', daysAgo(12)),
      ],
    }),
    createEnquiry({
      id: 'enq-17',
      enquiry_code: 'ENQ-742600',
      student_id: 'student-23',
      title: 'Placement Vaccination Record Review',
      description: 'Could someone confirm whether my uploaded vaccination records are sufficient for the upcoming community health placement?',
      category: 'Admissions',
      status: 'resolved',
      type: 'general',
      priority: 'medium',
      assigned_role: 'admin_officer',
      ai_triage_summary: 'Routine compliance review for placement preparation with document verification.',
      created_at: daysAgo(9),
      updated_at: daysAgo(6),
      responses: [
        createResponse('res-17', 'enq-17', 'demo-admin_officer', 'Demo Admin Officer', 'admin_officer', 'All required records have been approved and your placement clearance is complete.', daysAgo(6)),
      ],
    }),
  ];

  const appointments: Appointment[] = [
    createAppointment({ id: 'apt-1', student_id: 'demo-student', staff_name: 'Dr. Sarah Smith', appointment_type: 'Academic Advising', description: 'Discussing course selection for next year.', scheduled_start: daysFromNow(1, 10), scheduled_end: daysFromNow(1, 10, 30), status: 'confirmed', created_at: daysAgo(2) }),
    createAppointment({ id: 'apt-2', student_id: 'student-15', staff_name: 'Counselor Jane Doe', appointment_type: 'Welfare Counseling', description: 'Urgent mental health support session.', scheduled_start: daysFromNow(0, 1), scheduled_end: daysFromNow(0, 2), status: 'confirmed', related_enquiry_id: 'enq-6', created_at: at(0) }),
    createAppointment({ id: 'apt-3', student_id: 'student-11', staff_name: 'Peer Tutor: Mark', appointment_type: 'Peer Tutoring', description: 'Accounting 101 support.', scheduled_start: daysAgo(1), scheduled_end: at(-23 * HOUR_IN_MS), status: 'completed', related_enquiry_id: 'enq-3', created_at: daysAgo(3) }),
    createAppointment({ id: 'apt-4', student_id: 'student-2', staff_name: 'Finance Manager', appointment_type: 'Financial Consultation', description: 'Discussing scholarship payment delay.', scheduled_start: daysFromNow(2, 11), scheduled_end: daysFromNow(2, 11, 30), status: 'rescheduled', related_enquiry_id: 'enq-5', created_at: daysAgo(2) }),
    createAppointment({ id: 'apt-5', student_id: 'student-6', staff_name: 'Student Success Advisor', appointment_type: 'Attendance Recovery Check-In', description: 'Planning interventions to improve attendance and assessment completion.', scheduled_start: daysFromNow(3, 9), scheduled_end: daysFromNow(3, 9, 30), status: 'confirmed', related_enquiry_id: 'enq-8', created_at: daysAgo(1) }),
    createAppointment({ id: 'apt-6', student_id: 'student-12', staff_name: 'Graduation Office', appointment_type: 'Graduation Audit', description: 'Reviewing graduation checklist and outstanding requirements.', scheduled_start: daysFromNow(3, 14), scheduled_end: daysFromNow(3, 14, 30), status: 'confirmed', related_enquiry_id: 'enq-4', created_at: daysAgo(1) }),
    createAppointment({ id: 'apt-7', student_id: 'student-21', staff_name: 'Wellbeing Advisor', appointment_type: 'Student Support Check-In', description: 'Initial wellbeing support session following counseling referral.', scheduled_start: daysFromNow(1, 15), scheduled_end: daysFromNow(1, 15, 45), status: 'confirmed', related_enquiry_id: 'enq-13', created_at: daysAgo(1) }),
    createAppointment({ id: 'apt-8', student_id: 'student-4', staff_name: 'Careers Consultant', appointment_type: 'Internship Review', description: 'Confirming internship learning outcomes and credit mapping.', scheduled_start: daysAgo(6), scheduled_end: daysAgo(6, -1), status: 'completed', related_enquiry_id: 'enq-7', created_at: daysAgo(8) }),
    createAppointment({ id: 'apt-9', student_id: 'student-9', staff_name: 'Admissions Officer', appointment_type: 'Return from Leave Consultation', description: 'Discussing reactivation timelines and paperwork.', scheduled_start: daysAgo(11), scheduled_end: daysAgo(11, -1), status: 'cancelled', related_enquiry_id: 'enq-12', created_at: daysAgo(13) }),
    createAppointment({ id: 'apt-10', student_id: 'student-18', staff_name: 'Capstone Coordinator', appointment_type: 'Capstone Briefing', description: 'Reviewing presentation logistics and assessor expectations.', scheduled_start: daysAgo(4), scheduled_end: daysAgo(4, -1), status: 'completed', related_enquiry_id: 'enq-11', created_at: daysAgo(6) }),
    createAppointment({ id: 'apt-11', student_id: 'student-19', staff_name: 'Architecture Faculty Services', appointment_type: 'Portfolio Retrieval Support', description: 'Assisting with temporary account access for archived coursework.', scheduled_start: daysAgo(13), scheduled_end: daysAgo(13, -1), status: 'cancelled', related_enquiry_id: 'enq-16', created_at: daysAgo(15) }),
    createAppointment({ id: 'apt-12', student_id: 'student-24', staff_name: 'Graduate Employment Advisor', appointment_type: 'Employer Readiness Review', description: 'Final check of degree completion evidence before interview week.', scheduled_start: daysAgo(3), scheduled_end: daysAgo(3, -1), status: 'completed', related_enquiry_id: 'enq-14', created_at: daysAgo(5) }),
  ];

  const notifications: Notification[] = [
    createNotification({ id: 'not-1', user_id: 'demo-student', title: 'Enquiry Updated', message: 'Your enquiry "Tuition Fee Installment Plan" has a new response.', type: 'info', link: '/enquiries/enq-1', read: false, created_at: daysAgo(1) }),
    createNotification({ id: 'not-2', user_id: 'demo-admin_officer', title: 'New Enquiry Submitted', message: 'Mia Hamm submitted a new enquiry about a timetable conflict.', type: 'info', link: '/enquiries', read: false, created_at: daysAgo(0, 1) }),
    createNotification({ id: 'not-3', user_id: 'demo-manager', title: 'Case Escalated', message: 'Enquiry "Visa Extension Documents" has been escalated for manager review.', type: 'warning', link: '/enquiries/enq-2', read: false, created_at: daysAgo(0, 1) }),
    createNotification({ id: 'not-4', user_id: 'student-2', title: 'Finance Review Escalated', message: 'Your scholarship payment case has been escalated to the finance manager.', type: 'warning', link: '/enquiries/enq-5', read: false, created_at: daysAgo(1) }),
    createNotification({ id: 'not-5', user_id: 'student-12', title: 'Graduation Audit Scheduled', message: 'A graduation audit appointment has been booked for later this week.', type: 'info', link: '/appointments', read: false, created_at: daysAgo(1) }),
    createNotification({ id: 'not-6', user_id: 'student-15', title: 'Urgent Support Appointment Confirmed', message: 'Your welfare counseling appointment has been confirmed for today.', type: 'success', link: '/appointments', read: false, created_at: at(-20 * MINUTE_IN_MS) }),
    createNotification({ id: 'not-7', user_id: 'student-21', title: 'Support Advisor Assigned', message: 'A student support advisor has been assigned to your wellbeing case.', type: 'info', link: '/enquiries/enq-13', read: false, created_at: daysAgo(1) }),
    createNotification({ id: 'not-8', user_id: 'student-4', title: 'Internship Credits Approved', message: 'Your internship credit approval has been finalized.', type: 'success', link: '/enquiries/enq-7', read: true, created_at: daysAgo(3) }),
    createNotification({ id: 'not-9', user_id: 'student-9', title: 'Consultation Cancelled', message: 'Your return-from-leave consultation was cancelled after the requested documents were emailed instead.', type: 'warning', link: '/appointments', read: true, created_at: daysAgo(10) }),
    createNotification({ id: 'not-10', user_id: 'student-24', title: 'Employer Letter Ready', message: 'Your completion confirmation letter is ready and has been sent to your inbox.', type: 'success', link: '/enquiries/enq-14', read: false, created_at: daysAgo(2) }),
    createNotification({ id: 'not-11', user_id: 'student-6', title: 'Attendance Check-In Booked', message: 'A student success appointment has been booked to review your recovery plan.', type: 'info', link: '/appointments', read: false, created_at: daysAgo(1) }),
    createNotification({ id: 'not-12', user_id: 'student-19', title: 'Temporary Access Window Sent', message: 'Instructions for downloading your portfolio archive have been emailed to you.', type: 'info', link: '/enquiries/enq-16', read: true, created_at: daysAgo(12) }),
    createNotification({ id: 'not-13', user_id: 'student-16', title: 'Placement Docs Received', message: 'We have received your placement compliance documents and will review them shortly.', type: 'info', link: '/enquiries/enq-10', read: false, created_at: daysAgo(2) }),
  ];

  validateDemoSeedData({ students, enquiries, appointments, notifications });

  return { students, enquiries, appointments, notifications };
}

export function DemoProvider({ children }: { children: React.ReactNode }) {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (isPersistedDemoState(parsed)) {
          setEnquiries(parsed.enquiries);
          setAppointments(parsed.appointments);
          setNotifications(parsed.notifications);
          setStudents(parsed.students);
        } else {
          seedInitialData();
        }
      } catch (error) {
        console.error('Failed to parse demo state', error);
        seedInitialData();
      }
    } else {
      seedInitialData();
    }

    setHasHydrated(true);
  }, []);

  useEffect(() => {
    if (!hasHydrated) return;

    const persistedState: PersistedDemoState = {
      version: STORAGE_VERSION,
      enquiries,
      appointments,
      notifications,
      students,
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistedState));
  }, [appointments, enquiries, hasHydrated, notifications, students]);

  const seedInitialData = () => {
    const seedData = createDemoSeedData();
    setEnquiries(seedData.enquiries);
    setAppointments(seedData.appointments);
    setNotifications(seedData.notifications);
    setStudents(seedData.students);
  };

  const validateStudentUniqueness = (input: StudentFormInput, excludeId?: string): StudentMutationResult => {
    const normalizedEmail = normalizeStudentString(input.email);
    const normalizedStudentNumber = normalizeStudentString(input.student_number);

    const hasDuplicateEmail = students.some(student => (
      student.id !== excludeId &&
      normalizeStudentString(student.email) === normalizedEmail
    ));

    if (hasDuplicateEmail) {
      return { ok: false, error: 'Student email must be unique.' };
    }

    const hasDuplicateStudentNumber = students.some(student => (
      student.id !== excludeId &&
      normalizeStudentString(student.student_number) === normalizedStudentNumber
    ));

    if (hasDuplicateStudentNumber) {
      return { ok: false, error: 'Student number must be unique.' };
    }

    return { ok: true };
  };

  const addStudent = (input: StudentFormInput): StudentMutationResult => {
    const uniquenessCheck = validateStudentUniqueness(input);
    if (!uniquenessCheck.ok) return uniquenessCheck;

    const nextNumericId = students.reduce((maxId, student) => {
      const match = /^student-(\d+)$/.exec(student.id);
      return match ? Math.max(maxId, Number(match[1])) : maxId;
    }, 1);

    const newStudent: StudentRecord = {
      ...input,
      id: `student-${nextNumericId + 1}`,
      created_at: new Date().toISOString(),
    };

    setStudents(prev => [newStudent, ...prev]);
    return { ok: true };
  };

  const updateStudent = (id: string, updates: StudentFormInput): StudentMutationResult => {
    const studentExists = students.some(student => student.id === id);
    if (!studentExists) {
      return { ok: false, error: 'Student not found.' };
    }

    const uniquenessCheck = validateStudentUniqueness(updates, id);
    if (!uniquenessCheck.ok) return uniquenessCheck;

    setStudents(prev => prev.map(student => (
      student.id === id
        ? { ...student, ...updates }
        : student
    )));

    setEnquiries(prev => prev.map(enquiry => (
      enquiry.student_id === id
        ? { ...enquiry, student_name: updates.full_name }
        : enquiry
    )));

    setAppointments(prev => prev.map(appointment => (
      appointment.student_id === id
        ? { ...appointment, student_name: updates.full_name }
        : appointment
    )));

    return { ok: true };
  };

  const deleteStudent = (id: string): StudentDeleteResult => {
    const studentExists = students.some(student => student.id === id);
    if (!studentExists) {
      return { ok: false, error: 'Student not found.' };
    }

    const linkedCounts = getStudentLinkedCounts(id, enquiries, appointments, notifications);
    const hasLinks = Object.values(linkedCounts).some(count => count > 0);

    if (hasLinks) {
      return {
        ok: false,
        error: 'Cannot delete a student with linked service records.',
        linkedCounts,
      };
    }

    setStudents(prev => prev.filter(student => student.id !== id));
    return { ok: true };
  };

  const addEnquiry = (enq: Omit<Enquiry, 'id' | 'enquiry_code' | 'created_at' | 'updated_at' | 'responses'>) => {
    const newEnq: Enquiry = {
      ...enq,
      id: `enq-${Math.random().toString(36).substr(2, 9)}`,
      enquiry_code: `ENQ-${Math.floor(100000 + Math.random() * 900000)}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      responses: [],
    };
    setEnquiries(prev => [newEnq, ...prev]);
    
    // Auto-notify relevant roles (demo logic)
    addNotification({
      user_id: 'demo-admin_officer',
      title: 'New Enquiry Submitted',
      message: `A new enquiry "${newEnq.title}" has been submitted.`,
      type: 'info',
      link: `/enquiries/${newEnq.id}`,
    });
  };

  const updateEnquiry = (id: string, updates: Partial<Enquiry>) => {
    setEnquiries(prev => prev.map(enq => {
      if (enq.id === id) {
        const updated = { ...enq, ...updates, updated_at: new Date().toISOString() };
        
        // Notify student if status changed
        if (updates.status && updates.status !== enq.status) {
          addNotification({
            user_id: enq.student_id,
            title: 'Enquiry Status Updated',
            message: `Your enquiry "${enq.title}" status is now ${updates.status.replace('_', ' ')}.`,
            type: 'info',
            link: `/enquiries/${enq.id}`,
          });
        }
        
        return updated;
      }
      return enq;
    }));
  };

  const addResponse = (enquiryId: string, response: Omit<EnquiryResponse, 'id' | 'created_at'>) => {
    const newResponse: EnquiryResponse = {
      ...response,
      id: `res-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
    };

    setEnquiries(prev => prev.map(enq => {
      if (enq.id === enquiryId) {
        // Notify the other party
        const recipientId = response.author_id === enq.student_id ? (enq.assigned_to || 'demo-admin_officer') : enq.student_id;
        addNotification({
          user_id: recipientId,
          title: 'New Response',
          message: `New response on enquiry "${enq.title}" from ${response.author_name}.`,
          type: 'info',
          link: `/enquiries/${enq.id}`,
        });

        return {
          ...enq,
          responses: [...enq.responses, newResponse],
          updated_at: new Date().toISOString(),
        };
      }
      return enq;
    }));
  };

  const addFeedback = (feedback: Omit<Feedback, 'id' | 'created_at'>) => {
    const newFeedback: Feedback = {
      ...feedback,
      id: `fb-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
    };

    setEnquiries(prev => prev.map(enq => {
      if (enq.id === feedback.enquiry_id) {
        return { ...enq, feedback: newFeedback };
      }
      return enq;
    }));

    // Notify manager
    addNotification({
      user_id: 'demo-manager',
      title: 'New Feedback Received',
      message: `A student provided ${feedback.rating}/5 stars for enquiry resolution.`,
      type: 'success',
    });
  };

  const addAppointment = (apt: Omit<Appointment, 'id' | 'created_at'>) => {
    const newApt: Appointment = {
      ...apt,
      id: `apt-${Math.random().toString(36).substr(2, 9)}`,
      created_at: new Date().toISOString(),
    };
    setAppointments(prev => [newApt, ...prev]);

    addNotification({
      user_id: apt.student_id,
      title: 'Appointment Requested',
      message: `Your ${apt.appointment_type} appointment has been requested.`,
      type: 'success',
      link: '/appointments',
    });
  };

  const updateAppointment = (id: string, updates: Partial<Appointment>) => {
    setAppointments(prev => prev.map(apt => {
      if (apt.id === id) {
        const updated = { ...apt, ...updates };
        
        // Notify student of status change
        if (updates.status && updates.status !== apt.status) {
          addNotification({
            user_id: apt.student_id,
            title: 'Appointment Status Updated',
            message: `Your appointment is now ${updates.status}.`,
            type: updates.status === 'cancelled' ? 'warning' : 'info',
            link: '/appointments',
          });
        }
        
        return updated;
      }
      return apt;
    }));
  };

  const addNotification = (notif: Omit<Notification, 'id' | 'created_at' | 'read'>) => {
    const newNotif: Notification = {
      ...notif,
      id: `not-${Math.random().toString(36).substr(2, 9)}`,
      read: false,
      created_at: new Date().toISOString(),
    };
    setNotifications(prev => [newNotif, ...prev]);
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsRead = (userId: string) => {
    setNotifications(prev => prev.map(n => n.user_id === userId ? { ...n, read: true } : n));
  };

  return (
    <DemoContext.Provider value={{ 
      enquiries, appointments, notifications, students,
      addStudent, updateStudent, deleteStudent,
      addEnquiry, updateEnquiry, addResponse, addFeedback,
      addAppointment, updateAppointment,
      addNotification, markNotificationRead, markAllNotificationsRead
    }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemoData() {
  const context = useContext(DemoContext);
  if (context === undefined) {
    throw new Error('useDemoData must be used within a DemoProvider');
  }
  return context;
}

