import { UserProfile, UserRole } from '../AuthContext';
import { Appointment, Enquiry, Notification, StudentRecord } from '../DemoContext';

export interface ChatHistoryTurn {
  role: 'user' | 'ai';
  text: string;
}

export interface AIRelevantRecord {
  type: 'student' | 'enquiry' | 'appointment' | 'notification';
  id: string;
  title: string;
  status?: string;
  date?: string;
  summary: string;
}

export interface AIContextSummary {
  openEnquiryCount: number;
  escalatedEnquiryCount: number;
  upcomingAppointmentCount: number;
  unreadNotificationCount: number;
  matchedRecordCount: number;
  latestEnquiryStatus?: string;
  nextAppointment?: {
    appointment_type: string;
    scheduled_start: string;
    status: string;
  };
  visibleStudentCount?: number;
  atRiskStudentCount?: number;
}

export interface AIContextEnquiry {
  id: string;
  enquiry_code: string;
  title: string;
  category: string;
  status: string;
  priority: string;
  student_name?: string;
  created_at: string;
  updated_at: string;
}

export interface AIContextAppointment {
  id: string;
  appointment_type: string;
  description: string;
  status: string;
  student_name?: string;
  staff_name?: string;
  scheduled_start: string;
  scheduled_end: string;
  related_enquiry_id?: string;
}

export interface AIContextNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
}

export interface AIViewerContext {
  scope: 'student_self' | 'student_unmatched' | 'staff_role';
  generatedAt: string;
  viewer: {
    uid: string;
    full_name: string;
    email: string;
    role: UserRole;
  };
  studentProfile?: Pick<StudentRecord, 'id' | 'student_number' | 'full_name' | 'email' | 'program' | 'year_level' | 'status' | 'phone'>;
  summary: AIContextSummary;
  recentEnquiries: AIContextEnquiry[];
  upcomingAppointments: AIContextAppointment[];
  recentNotifications: AIContextNotification[];
  relevantRecords: AIRelevantRecord[];
  notes: string[];
}

interface BuildAIContextInput {
  message: string;
  profile: UserProfile;
  students: StudentRecord[];
  enquiries: Enquiry[];
  appointments: Appointment[];
  notifications: Notification[];
}

const MAX_RECENT_ENQUIRIES = 5;
const MAX_UPCOMING_APPOINTMENTS = 3;
const MAX_RECENT_NOTIFICATIONS = 5;
const MAX_RELEVANT_RECORDS = 6;

const OPEN_ENQUIRY_STATUSES = new Set(['submitted', 'triaged', 'assigned', 'in_progress', 'escalated']);
const ACTIVE_APPOINTMENT_STATUSES = new Set(['requested', 'confirmed', 'rescheduled']);
const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'that',
  'this',
  'have',
  'what',
  'when',
  'where',
  'which',
  'how',
  'many',
  'does',
  'your',
  'from',
  'about',
  'into',
  'need',
  'want',
  'please',
  'tell',
  'show',
  'latest',
  'next',
  'my',
  'are',
  'is',
]);

function normalizeText(value: string | undefined) {
  return (value ?? '').trim().toLowerCase();
}

function toTimestamp(value: string | undefined) {
  const timestamp = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function extractKeywords(message: string) {
  const tokens: string[] = message.toLowerCase().match(/[a-z0-9_]+/g) ?? [];
  return Array.from(new Set(tokens.filter(token => token.length > 2 && !STOP_WORDS.has(token))));
}

function countKeywordMatches(text: string, keywords: string[]) {
  const haystack = normalizeText(text);
  return keywords.reduce((score, keyword) => (
    haystack.includes(keyword) ? score + 1 : score
  ), 0);
}

function sortByNewest<T>(items: T[], getDate: (item: T) => string) {
  return [...items].sort((left, right) => toTimestamp(getDate(right)) - toTimestamp(getDate(left)));
}

function sortBySoonest<T>(items: T[], getDate: (item: T) => string) {
  return [...items].sort((left, right) => toTimestamp(getDate(left)) - toTimestamp(getDate(right)));
}

function findStudentForProfile(profile: UserProfile, students: StudentRecord[]) {
  return (
    students.find(student => student.id === profile.uid) ??
    students.find(student => normalizeText(student.email) === normalizeText(profile.email)) ??
    (profile.student_number
      ? students.find(student => normalizeText(student.student_number) === normalizeText(profile.student_number))
      : undefined)
  );
}

function mapEnquiry(enquiry: Enquiry): AIContextEnquiry {
  return {
    id: enquiry.id,
    enquiry_code: enquiry.enquiry_code,
    title: enquiry.title,
    category: enquiry.category,
    status: enquiry.status,
    priority: enquiry.priority,
    student_name: enquiry.student_name,
    created_at: enquiry.created_at,
    updated_at: enquiry.updated_at,
  };
}

function mapAppointment(appointment: Appointment): AIContextAppointment {
  return {
    id: appointment.id,
    appointment_type: appointment.appointment_type,
    description: appointment.description,
    status: appointment.status,
    student_name: appointment.student_name,
    staff_name: appointment.staff_name,
    scheduled_start: appointment.scheduled_start,
    scheduled_end: appointment.scheduled_end,
    related_enquiry_id: appointment.related_enquiry_id,
  };
}

function mapNotification(notification: Notification): AIContextNotification {
  return {
    id: notification.id,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    read: notification.read,
    created_at: notification.created_at,
  };
}

function buildRelevantRecords({
  keywords,
  student,
  enquiries,
  appointments,
  notifications,
}: {
  keywords: string[];
  student?: StudentRecord;
  enquiries: Enquiry[];
  appointments: Appointment[];
  notifications: Notification[];
}) {
  const scoredRecords: Array<{ score: number; recency: number; record: AIRelevantRecord }> = [];

  if (student) {
    const studentScore = countKeywordMatches(
      [student.full_name, student.student_number, student.email, student.program, student.status].join(' '),
      keywords,
    );

    scoredRecords.push({
      score: studentScore,
      recency: toTimestamp(student.created_at),
      record: {
        type: 'student',
        id: student.id,
        title: student.full_name,
        status: student.status,
        date: student.created_at,
        summary: `${student.full_name} is in ${student.program}, year ${student.year_level}, with status ${student.status}.`,
      },
    });
  }

  enquiries.forEach(enquiry => {
    const score = countKeywordMatches(
      [
        enquiry.enquiry_code,
        enquiry.title,
        enquiry.description,
        enquiry.category,
        enquiry.status,
        enquiry.priority,
        enquiry.student_name,
      ].join(' '),
      keywords,
    );

    scoredRecords.push({
      score,
      recency: toTimestamp(enquiry.updated_at || enquiry.created_at),
      record: {
        type: 'enquiry',
        id: enquiry.id,
        title: enquiry.title,
        status: enquiry.status,
        date: enquiry.updated_at || enquiry.created_at,
        summary: `${enquiry.title} is ${enquiry.status} in ${enquiry.category} with ${enquiry.priority} priority.`,
      },
    });
  });

  appointments.forEach(appointment => {
    const score = countKeywordMatches(
      [
        appointment.appointment_type,
        appointment.description,
        appointment.status,
        appointment.staff_name,
        appointment.student_name,
      ].join(' '),
      keywords,
    );

    scoredRecords.push({
      score,
      recency: toTimestamp(appointment.scheduled_start),
      record: {
        type: 'appointment',
        id: appointment.id,
        title: appointment.appointment_type,
        status: appointment.status,
        date: appointment.scheduled_start,
        summary: `${appointment.appointment_type} is ${appointment.status} and scheduled for ${appointment.scheduled_start}.`,
      },
    });
  });

  notifications.forEach(notification => {
    const score = countKeywordMatches(
      [notification.title, notification.message, notification.type].join(' '),
      keywords,
    );

    scoredRecords.push({
      score,
      recency: toTimestamp(notification.created_at),
      record: {
        type: 'notification',
        id: notification.id,
        title: notification.title,
        status: notification.read ? 'read' : 'unread',
        date: notification.created_at,
        summary: `${notification.title}: ${notification.message}`,
      },
    });
  });

  const matchedRecords = scoredRecords
    .filter(item => item.score > 0)
    .sort((left, right) => right.score - left.score || right.recency - left.recency)
    .map(item => item.record);

  if (matchedRecords.length > 0) {
    return matchedRecords.slice(0, MAX_RELEVANT_RECORDS);
  }

  return scoredRecords
    .sort((left, right) => right.recency - left.recency)
    .map(item => item.record)
    .slice(0, MAX_RELEVANT_RECORDS);
}

export function buildAIContext({
  message,
  profile,
  students,
  enquiries,
  appointments,
  notifications,
}: BuildAIContextInput): AIViewerContext {
  const now = Date.now();
  const keywords = extractKeywords(message);
  const viewer = {
    uid: profile.uid,
    full_name: profile.full_name,
    email: profile.email,
    role: profile.role,
  };

  if (profile.role === 'student') {
    const student = findStudentForProfile(profile, students);

    if (!student) {
      const ownNotifications = sortByNewest(
        notifications.filter(notification => notification.user_id === profile.uid),
        notification => notification.created_at,
      );

      return {
        scope: 'student_unmatched',
        generatedAt: new Date().toISOString(),
        viewer,
        summary: {
          openEnquiryCount: 0,
          escalatedEnquiryCount: 0,
          upcomingAppointmentCount: 0,
          unreadNotificationCount: ownNotifications.filter(notification => !notification.read).length,
          matchedRecordCount: 0,
        },
        recentEnquiries: [],
        upcomingAppointments: [],
        recentNotifications: ownNotifications.slice(0, MAX_RECENT_NOTIFICATIONS).map(mapNotification),
        relevantRecords: [],
        notes: [
          'No matching student profile was found in DemoContext for the current viewer.',
          'Only records linked directly to the current user are visible.',
          'If the requested information is missing here, respond that UniLink does not have enough data to confirm it.',
        ],
      };
    }

    const studentEnquiries = sortByNewest(
      enquiries.filter(enquiry => enquiry.student_id === student.id),
      enquiry => enquiry.updated_at || enquiry.created_at,
    );
    const openEnquiries = studentEnquiries.filter(enquiry => OPEN_ENQUIRY_STATUSES.has(enquiry.status));
    const upcomingAppointments = sortBySoonest(
      appointments.filter(appointment => (
        appointment.student_id === student.id &&
        ACTIVE_APPOINTMENT_STATUSES.has(appointment.status) &&
        toTimestamp(appointment.scheduled_start) >= now
      )),
      appointment => appointment.scheduled_start,
    );
    const studentNotifications = sortByNewest(
      notifications.filter(notification => notification.user_id === student.id),
      notification => notification.created_at,
    );
    const relevantRecords = buildRelevantRecords({
      keywords,
      student,
      enquiries: studentEnquiries,
      appointments: upcomingAppointments.length > 0 ? upcomingAppointments : appointments.filter(appointment => appointment.student_id === student.id),
      notifications: studentNotifications,
    });

    return {
      scope: 'student_self',
      generatedAt: new Date().toISOString(),
      viewer,
      studentProfile: {
        id: student.id,
        student_number: student.student_number,
        full_name: student.full_name,
        email: student.email,
        program: student.program,
        year_level: student.year_level,
        status: student.status,
        phone: student.phone,
      },
      summary: {
        openEnquiryCount: openEnquiries.length,
        escalatedEnquiryCount: studentEnquiries.filter(enquiry => enquiry.status === 'escalated').length,
        upcomingAppointmentCount: upcomingAppointments.length,
        unreadNotificationCount: studentNotifications.filter(notification => !notification.read).length,
        matchedRecordCount: relevantRecords.length,
        latestEnquiryStatus: studentEnquiries[0]?.status,
        nextAppointment: upcomingAppointments[0]
          ? {
              appointment_type: upcomingAppointments[0].appointment_type,
              scheduled_start: upcomingAppointments[0].scheduled_start,
              status: upcomingAppointments[0].status,
            }
          : undefined,
      },
      recentEnquiries: studentEnquiries.slice(0, MAX_RECENT_ENQUIRIES).map(mapEnquiry),
      upcomingAppointments: upcomingAppointments.slice(0, MAX_UPCOMING_APPOINTMENTS).map(mapAppointment),
      recentNotifications: studentNotifications.slice(0, MAX_RECENT_NOTIFICATIONS).map(mapNotification),
      relevantRecords,
      notes: [
        'This is a role-scoped student view. Only the current student records are included.',
        'Use exact record details from the context when answering, especially enquiry statuses and appointment dates.',
        'If the answer is not supported by this context, explicitly say UniLink does not have enough data to confirm it.',
      ],
    };
  }

  const recentEnquiries = sortByNewest(enquiries, enquiry => enquiry.updated_at || enquiry.created_at);
  const openEnquiries = recentEnquiries.filter(enquiry => OPEN_ENQUIRY_STATUSES.has(enquiry.status));
  const upcomingAppointments = sortBySoonest(
    appointments.filter(appointment => (
      ACTIVE_APPOINTMENT_STATUSES.has(appointment.status) &&
      toTimestamp(appointment.scheduled_start) >= now
    )),
    appointment => appointment.scheduled_start,
  );
  const viewerNotifications = sortByNewest(
    notifications.filter(notification => notification.user_id === profile.uid),
    notification => notification.created_at,
  );
  const relevantRecords = buildRelevantRecords({
    keywords,
    enquiries: recentEnquiries,
    appointments: upcomingAppointments.length > 0 ? upcomingAppointments : appointments,
    notifications: viewerNotifications,
  });

  return {
    scope: 'staff_role',
    generatedAt: new Date().toISOString(),
    viewer,
    summary: {
      openEnquiryCount: openEnquiries.length,
      escalatedEnquiryCount: recentEnquiries.filter(enquiry => enquiry.status === 'escalated').length,
      upcomingAppointmentCount: upcomingAppointments.length,
      unreadNotificationCount: viewerNotifications.filter(notification => !notification.read).length,
      matchedRecordCount: relevantRecords.length,
      latestEnquiryStatus: recentEnquiries[0]?.status,
      nextAppointment: upcomingAppointments[0]
        ? {
            appointment_type: upcomingAppointments[0].appointment_type,
            scheduled_start: upcomingAppointments[0].scheduled_start,
            status: upcomingAppointments[0].status,
          }
        : undefined,
      visibleStudentCount: students.length,
      atRiskStudentCount: students.filter(student => student.status === 'at_risk').length,
    },
    recentEnquiries: recentEnquiries.slice(0, MAX_RECENT_ENQUIRIES).map(mapEnquiry),
    upcomingAppointments: upcomingAppointments.slice(0, MAX_UPCOMING_APPOINTMENTS).map(mapAppointment),
    recentNotifications: viewerNotifications.slice(0, MAX_RECENT_NOTIFICATIONS).map(mapNotification),
    relevantRecords,
    notes: [
      'This is a role-scoped staff summary built from DemoContext.',
      'Only matched operational records and aggregate counts are included here.',
      'If a question requires data outside this scoped context, say UniLink does not have enough data to confirm it.',
    ],
  };
}
