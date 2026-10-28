import type { User, LabSession, AttendanceRecord, CorrectionRequest } from '../types';

export const CURRENT_STUDENT: User = {
  id: 'user-student-1',
  name: 'Alex Chen',
  studentId: 'STU-2024-8891',
  email: 'a.chen@university.edu',
  role: 'student',
  programme: 'B.Sc. Computer Science',
  level: 'Level 300 (Year 3)',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80',
};

export const CURRENT_COORDINATOR: User = {
  id: 'user-coord-1',
  name: 'Dr. Elena Vance',
  studentId: 'FAC-8042',
  email: 'e.vance@university.edu',
  role: 'coordinator',
  programme: 'School of Computing & Data Science',
  level: 'Senior Lab Coordinator',
  avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=256&q=80',
};

export const MOCK_STUDENTS: User[] = [
  CURRENT_STUDENT,
  { id: 'user-student-2', name: 'Maya Lin', studentId: 'STU-2024-8892', email: 'm.lin@uni.edu', role: 'student', programme: 'B.Sc. Computer Science', level: 'Level 300' },
  { id: 'user-student-3', name: 'Liam Johnson', studentId: 'STU-2024-8893', email: 'l.johnson@uni.edu', role: 'student', programme: 'B.Sc. Computer Science', level: 'Level 300' },
  { id: 'user-student-4', name: 'Sophia Patel', studentId: 'STU-2024-8894', email: 's.patel@uni.edu', role: 'student', programme: 'B.Sc. Computer Science', level: 'Level 300' },
  { id: 'user-student-5', name: 'Noah Williams', studentId: 'STU-2024-8895', email: 'n.williams@uni.edu', role: 'student', programme: 'B.Sc. Computer Science', level: 'Level 300' },
  { id: 'user-student-6', name: 'Chloe Davis', studentId: 'STU-2024-8896', email: 'c.davis@uni.edu', role: 'student', programme: 'B.Sc. Computer Science', level: 'Level 300' },
  { id: 'user-student-7', name: 'Ethan Brown', studentId: 'STU-2024-8897', email: 'e.brown@uni.edu', role: 'student', programme: 'B.Sc. Computer Science', level: 'Level 300' },
  { id: 'user-student-8', name: 'Olivia Miller', studentId: 'STU-2024-8898', email: 'o.miller@uni.edu', role: 'student', programme: 'B.Sc. Computer Science', level: 'Level 300' },
];

export function getRelativeDate(dayOffset: number, hours: number, minutes: number = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

export function createInitialSessions(): LabSession[] {
  return [
    {
      id: 'session-1',
      title: 'Database Systems & SQL Optimization Practical',
      courseCode: 'CS301',
      labName: 'Advanced Databases Lab',
      room: 'Room 304B, Turing Hall',
      coordinatorId: 'user-coord-1',
      eligibleStudentIds: MOCK_STUDENTS.map(s => s.id),
      startsAt: getRelativeDate(0, 9, 0),
      endsAt: getRelativeDate(0, 11, 30),
      checkInOpensAt: getRelativeDate(0, 8, 45),
      lateAfterMinutes: 15,
      status: 'live',
      requiresCheckOut: true,
      pin: '8492',
      qrCode: 'SESSION-CS301-304B-8492',
      description: 'Hands-on indexing, query execution planning, and distributed transaction locks.',
      notes: 'Please bring your university ID and have pgAdmin or DBeaver installed on your laptop.',
    },
    {
      id: 'session-2',
      title: 'Operating Systems Kernel & Concurrency Lab',
      courseCode: 'CS304',
      labName: 'Systems Architecture Lab',
      room: 'Room 201A, Lovelace Building',
      coordinatorId: 'user-coord-1',
      eligibleStudentIds: MOCK_STUDENTS.map(s => s.id),
      startsAt: getRelativeDate(0, 14, 0),
      endsAt: getRelativeDate(0, 16, 30),
      checkInOpensAt: getRelativeDate(0, 13, 45),
      lateAfterMinutes: 15,
      status: 'scheduled',
      requiresCheckOut: false,
      pin: '3914',
      qrCode: 'SESSION-CS304-201A-3914',
      description: 'POSIX thread synchronization, mutex lock evaluation, and memory paging simulations.',
      notes: 'C compiler and gdb required.',
    },
    {
      id: 'session-3',
      title: 'Embedded Systems & Real-Time Sensors Lab',
      courseCode: 'EE210',
      labName: 'Hardware & Microcontroller Suite',
      room: 'Hardware Lab 3, Faraday Wing',
      coordinatorId: 'user-coord-1',
      eligibleStudentIds: MOCK_STUDENTS.map(s => s.id),
      startsAt: getRelativeDate(-1, 10, 0),
      endsAt: getRelativeDate(-1, 12, 30),
      checkInOpensAt: getRelativeDate(-1, 9, 45),
      lateAfterMinutes: 15,
      status: 'completed',
      requiresCheckOut: true,
      pin: '5170',
      qrCode: 'SESSION-EE210-LAB3-5170',
      description: 'ESP32 SPI communication, interrupt handling, and ADC telemetry gathering.',
    },
    {
      id: 'session-4',
      title: 'Software Engineering Studio & CI/CD Pipelines',
      courseCode: 'CS310',
      labName: 'Software Innovation Studio',
      room: 'Design Studio 1, Hopper Centre',
      coordinatorId: 'user-coord-1',
      eligibleStudentIds: MOCK_STUDENTS.map(s => s.id),
      startsAt: getRelativeDate(-3, 10, 0),
      endsAt: getRelativeDate(-3, 12, 0),
      checkInOpensAt: getRelativeDate(-3, 9, 45),
      lateAfterMinutes: 15,
      status: 'completed',
      requiresCheckOut: true,
      pin: '7721',
      qrCode: 'SESSION-CS310-STUDIO1-7721',
      description: 'Automated GitHub actions pipeline configuration, test suites, and Docker staging.',
    },
    {
      id: 'session-5',
      title: 'Computer Networks & Packet Analysis',
      courseCode: 'CS305',
      labName: 'Cisco Networking Laboratory',
      room: 'Networking Suite 4, Shannon Wing',
      coordinatorId: 'user-coord-1',
      eligibleStudentIds: MOCK_STUDENTS.map(s => s.id),
      startsAt: getRelativeDate(-6, 14, 0),
      endsAt: getRelativeDate(-6, 16, 30),
      checkInOpensAt: getRelativeDate(-6, 13, 45),
      lateAfterMinutes: 15,
      status: 'completed',
      requiresCheckOut: false,
      pin: '9045',
      qrCode: 'SESSION-CS305-NET4-9045',
      description: 'Wireshark packet capture, TCP handshake dissection, and VLAN tagging experiments.',
    },
    {
      id: 'session-6',
      title: 'Data Structures & Algorithmic Complexity Lab',
      courseCode: 'CS208',
      labName: 'Foundational Computing Lab',
      room: 'Lab 102, Turing Hall',
      coordinatorId: 'user-coord-1',
      eligibleStudentIds: MOCK_STUDENTS.map(s => s.id),
      startsAt: getRelativeDate(-10, 11, 0),
      endsAt: getRelativeDate(-10, 13, 0),
      checkInOpensAt: getRelativeDate(-10, 10, 45),
      lateAfterMinutes: 15,
      status: 'completed',
      requiresCheckOut: false,
      pin: '1249',
      qrCode: 'SESSION-CS208-102-1249',
      description: 'Self-balancing AVL trees, red-black tree rotational mechanics, and heap analysis.',
    },
  ];
}

export function createInitialAttendanceRecords(): AttendanceRecord[] {
  return [
    // Session 1 (Today's live session) - Some classmates checked in, Alex is not checked in yet
    {
      id: 'rec-1-2',
      sessionId: 'session-1',
      studentId: 'user-student-2', // Maya Lin
      status: 'present',
      checkedInAt: getRelativeDate(0, 8, 52),
      updatedBy: 'system-qr',
      audit: [{ at: getRelativeDate(0, 8, 52), actorId: 'user-student-2', action: 'Checked in via QR scan' }],
    },
    {
      id: 'rec-1-3',
      sessionId: 'session-1',
      studentId: 'user-student-3', // Liam Johnson
      status: 'present',
      checkedInAt: getRelativeDate(0, 8, 58),
      updatedBy: 'system-pin',
      audit: [{ at: getRelativeDate(0, 8, 58), actorId: 'user-student-3', action: 'Checked in via Session PIN' }],
    },
    {
      id: 'rec-1-4',
      sessionId: 'session-1',
      studentId: 'user-student-4', // Sophia Patel
      status: 'late',
      checkedInAt: getRelativeDate(0, 9, 21),
      updatedBy: 'system-qr',
      note: 'Checked in 21 mins after session start',
      audit: [{ at: getRelativeDate(0, 9, 21), actorId: 'user-student-4', action: 'Late check-in via QR scan' }],
    },
    {
      id: 'rec-1-5',
      sessionId: 'session-1',
      studentId: 'user-student-5', // Noah Williams
      status: 'present',
      checkedInAt: getRelativeDate(0, 9, 4),
      updatedBy: 'system-qr',
      audit: [{ at: getRelativeDate(0, 9, 4), actorId: 'user-student-5', action: 'Checked in via QR scan' }],
    },

    // Session 3 - Completed
    {
      id: 'rec-3-1',
      sessionId: 'session-3',
      studentId: 'user-student-1', // Alex Chen
      status: 'present',
      checkedInAt: getRelativeDate(-1, 9, 54),
      checkedOutAt: getRelativeDate(-1, 12, 32),
      updatedBy: 'system-qr',
      audit: [
        { at: getRelativeDate(-1, 9, 54), actorId: 'user-student-1', action: 'Checked in via QR scan' },
        { at: getRelativeDate(-1, 12, 32), actorId: 'user-student-1', action: 'Checked out via PIN' },
      ],
    },
    {
      id: 'rec-3-2',
      sessionId: 'session-3',
      studentId: 'user-student-2',
      status: 'present',
      checkedInAt: getRelativeDate(-1, 9, 50),
      checkedOutAt: getRelativeDate(-1, 12, 30),
      updatedBy: 'system-qr',
      audit: [{ at: getRelativeDate(-1, 9, 50), actorId: 'user-student-2', action: 'Completed practical' }],
    },

    // Session 4 - Completed (Alex Late)
    {
      id: 'rec-4-1',
      sessionId: 'session-4',
      studentId: 'user-student-1', // Alex Chen
      status: 'late',
      checkedInAt: getRelativeDate(-3, 10, 22),
      checkedOutAt: getRelativeDate(-3, 12, 1),
      note: 'Bus transit delay on North Campus line',
      updatedBy: 'system-qr',
      audit: [
        { at: getRelativeDate(-3, 10, 22), actorId: 'user-student-1', action: 'Late check-in recorded (+22m)' },
        { at: getRelativeDate(-3, 12, 1), actorId: 'user-student-1', action: 'Checked out' },
      ],
    },

    // Session 5 - Completed (Alex Present)
    {
      id: 'rec-5-1',
      sessionId: 'session-5',
      studentId: 'user-student-1', // Alex Chen
      status: 'present',
      checkedInAt: getRelativeDate(-6, 13, 55),
      updatedBy: 'system-qr',
      audit: [{ at: getRelativeDate(-6, 13, 55), actorId: 'user-student-1', action: 'Check-in on time' }],
    },

    // Session 6 - Completed (Alex Absent - Excused pending)
    {
      id: 'rec-6-1',
      sessionId: 'session-6',
      studentId: 'user-student-1', // Alex Chen
      status: 'absent',
      updatedBy: 'user-coord-1',
      note: 'Marked absent at session finalization',
      audit: [{ at: getRelativeDate(-10, 13, 15), actorId: 'user-coord-1', action: 'Session finalized, unrecorded students marked absent' }],
    },
  ];
}

export function createInitialCorrections(): CorrectionRequest[] {
  return [
    {
      id: 'corr-1',
      recordId: 'rec-6-1',
      sessionId: 'session-6',
      studentId: 'user-student-1',
      currentStatus: 'absent',
      requestedStatus: 'excused',
      reason: 'Was attending ACM Student Chapter conference presentation with official faculty travel approval notice.',
      submittedAt: getRelativeDate(-9, 14, 20),
      status: 'pending',
    },
  ];
}
