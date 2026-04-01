import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from './firebase';

export async function seedDatabase(uid?: string) {
  const path = 'departments';
  try {
    const deptsSnap = await getDocs(collection(db, path));
    if (!deptsSnap.empty) return; // Already seeded

    console.log('Seeding database...');

    const departments = [
      { name: 'Admissions', description: 'Undergraduate and postgraduate admissions support.', office_location: 'Building A, Ground Floor', contact_email: 'admissions@abcuniversity.edu' },
      { name: 'Academic Support', description: 'Timetabling, course selection, and academic advising.', office_location: 'Building B, Level 2', contact_email: 'academic@abcuniversity.edu' },
      { name: 'Financial Services', description: 'Tuition fees, scholarships, and financial aid.', office_location: 'Building A, Level 1', contact_email: 'finance@abcuniversity.edu' },
      { name: 'Student Welfare', description: 'Counseling, disability support, and health services.', office_location: 'Student Hub, Level 1', contact_email: 'welfare@abcuniversity.edu' },
      { name: 'International / Visa Support', description: 'Visa guidance and international student integration.', office_location: 'International House', contact_email: 'international@abcuniversity.edu' },
      { name: 'Graduation / Careers', description: 'Career counseling, internships, and graduation clearance.', office_location: 'Career Center', contact_email: 'careers@abcuniversity.edu' },
    ];

    for (const dept of departments) {
      await addDoc(collection(db, 'departments'), {
        ...dept,
        is_active: true,
        created_at: serverTimestamp(),
      });
    }

    // Seed some initial enquiries for demo
    const targetUid = uid || auth.currentUser?.uid;
    if (targetUid) {
      const mockEnquiries = [
        {
          enquiry_code: 'ENQ-102938',
          student_id: targetUid,
          title: 'Tuition Fee Installment Plan',
          description: 'I would like to request an installment plan for my next semester tuition fees.',
          category: 'Financial Services',
          status: 'in_progress',
          priority: 'medium',
          complexity: 'general',
          created_at: new Date(Date.now() - 86400000 * 2),
        },
        {
          enquiry_code: 'ENQ-493827',
          student_id: targetUid,
          title: 'Visa Extension Documents',
          description: 'I need a letter from the university to support my student visa extension application.',
          category: 'International / Visa Support',
          status: 'awaiting_staff',
          priority: 'high',
          complexity: 'complex',
          created_at: new Date(Date.now() - 86400000 * 1),
        },
      ];

      for (const enq of mockEnquiries) {
        await addDoc(collection(db, 'enquiries'), {
          ...enq,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp(),
        });
      }
    }

    console.log('Seeding complete.');
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
