import 'server-only';
import { createHash } from 'node:crypto';
import type { PoolClient } from 'pg';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { withTransaction } from '@/lib/db/transaction';
import { query } from '@/lib/db/pool';

/**
 * Deterministic demonstration dataset. Every row is a real database row; the UI
 * never invents values. Academic-policy settings remain JSON null because the
 * implementation contract forbids seeding guessed weights, thresholds or rules.
 *
 * Demo credentials (development only):
 *   admin@acadflow.test       / AcadFlow#2026
 *   faculty1..24@acadflow.test / AcadFlow#2026
 *   student1..240@acadflow.test / AcadFlow#2026
 *
 * Run `npm run db:reset` to truncate and rebuild this dataset from scratch.
 */

const DEMO_PASSWORD = 'AcadFlow#2026';
const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const MINUTE = 60 * 1000;
const NOW = new Date();

const TERM_SEEDS = [
  {
    academicYear: '2024-25',
    termNo: 1,
    label: 'Semester 1',
    startsOn: '2024-07-01',
    endsOn: '2024-12-20',
    isCurrent: false,
  },
  {
    academicYear: '2024-25',
    termNo: 2,
    label: 'Semester 2',
    startsOn: '2025-01-06',
    endsOn: '2025-05-30',
    isCurrent: false,
  },
  {
    academicYear: '2025-26',
    termNo: 1,
    label: 'Semester 1',
    startsOn: '2025-07-01',
    endsOn: '2025-12-19',
    isCurrent: false,
  },
  {
    academicYear: '2025-26',
    termNo: 2,
    label: 'Semester 2',
    startsOn: '2026-01-05',
    endsOn: '2026-05-29',
    isCurrent: false,
  },
  {
    academicYear: '2026-27',
    termNo: 1,
    label: 'Semester 1',
    startsOn: '2026-07-01',
    endsOn: '2026-12-18',
    isCurrent: true,
  },
  {
    academicYear: '2026-27',
    termNo: 2,
    label: 'Semester 2',
    startsOn: '2027-01-04',
    endsOn: '2027-05-28',
    isCurrent: false,
  },
] as const;

const DEPARTMENT_SEEDS = [
  {
    code: 'CSE',
    name: 'Computer Science and Engineering',
    program: 'B.Tech Computer Science',
    courses: [
      ['CS301', 'Database Systems', 4],
      ['CS302', 'Operating Systems', 4],
      ['CS303', 'Data Structures and Algorithms', 4],
      ['CS304', 'Computer Networks', 3],
      ['CS305', 'Software Engineering', 3],
    ],
  },
  {
    code: 'ECE',
    name: 'Electronics and Communication Engineering',
    program: 'B.Tech Electronics and Communication',
    courses: [
      ['EC201', 'Digital Circuits', 3],
      ['EC202', 'Signals and Systems', 4],
      ['EC203', 'Analog Electronics', 3],
      ['EC204', 'Communication Systems', 4],
      ['EC205', 'Microprocessors and Microcontrollers', 3],
    ],
  },
  {
    code: 'MECH',
    name: 'Mechanical Engineering',
    program: 'B.Tech Mechanical Engineering',
    courses: [
      ['ME210', 'Thermodynamics', 4],
      ['ME211', 'Fluid Mechanics', 3],
      ['ME212', 'Strength of Materials', 4],
      ['ME213', 'Manufacturing Processes', 3],
      ['ME214', 'Machine Design', 3],
    ],
  },
  {
    code: 'CIVIL',
    name: 'Civil Engineering',
    program: 'B.Tech Civil Engineering',
    courses: [
      ['CE220', 'Structural Analysis', 4],
      ['CE221', 'Geotechnical Engineering', 3],
      ['CE222', 'Surveying and Geomatics', 3],
      ['CE223', 'Transportation Engineering', 4],
      ['CE224', 'Environmental Engineering', 3],
    ],
  },
  {
    code: 'IT',
    name: 'Information Technology',
    program: 'B.Tech Information Technology',
    courses: [
      ['IT230', 'Web Technologies', 3],
      ['IT231', 'Information Security', 4],
      ['IT232', 'Cloud Computing', 3],
      ['IT233', 'Data Mining', 4],
      ['IT234', 'Mobile Application Development', 3],
    ],
  },
  {
    code: 'AIML',
    name: 'Artificial Intelligence and Machine Learning',
    program: 'B.Tech Artificial Intelligence and Machine Learning',
    courses: [
      ['AI240', 'Machine Learning', 4],
      ['AI241', 'Deep Learning', 4],
      ['AI242', 'Natural Language Processing', 3],
      ['AI243', 'Computer Vision', 3],
      ['AI244', 'Reinforcement Learning', 3],
    ],
  },
  {
    code: 'EEE',
    name: 'Electrical and Electronics Engineering',
    program: 'B.Tech Electrical and Electronics Engineering',
    courses: [
      ['EE250', 'Power Systems', 4],
      ['EE251', 'Control Systems', 3],
      ['EE252', 'Electrical Machines', 4],
      ['EE253', 'Power Electronics', 3],
      ['EE254', 'Renewable Energy Systems', 3],
    ],
  },
  {
    code: 'MBA',
    name: 'School of Management',
    program: 'Master of Business Administration',
    courses: [
      ['MB260', 'Marketing Management', 3],
      ['MB261', 'Financial Accounting', 3],
      ['MB262', 'Organizational Behaviour', 3],
      ['MB263', 'Business Analytics', 4],
      ['MB264', 'Operations Management', 3],
    ],
  },
] as const;

const FACULTY_NAMES = [
  'Dr. Meera Krishnan',
  'Dr. Arjun Rao',
  'Dr. Kavita Menon',
  'Dr. Rohan Gupta',
  'Dr. Sneha Iyer',
  'Dr. Vikram Desai',
  'Dr. Priya Nair',
  'Dr. Aditya Kulkarni',
  'Dr. Farah Khan',
  'Dr. Sanjay Bose',
  'Dr. Nandini Reddy',
  'Dr. Harish Pillai',
  'Dr. Anjali Mehta',
  'Dr. Sameer Joshi',
  'Dr. Lakshmi Subramanian',
  'Dr. Rajesh Chawla',
  'Dr. Pooja Bhat',
  'Dr. Imran Sheikh',
  'Dr. Deepa Ranganathan',
  'Dr. Manoj Tiwari',
  'Dr. Shruti Kapoor',
  'Dr. Nikhil Saxena',
  'Dr. Ayesha Siddiqui',
  'Dr. Girish Patel',
] as const;

const FIRST_NAMES = [
  'Aarav',
  'Diya',
  'Kabir',
  'Isha',
  'Vivaan',
  'Anaya',
  'Reyansh',
  'Myra',
  'Advik',
  'Sara',
  'Dhruv',
  'Aadhya',
  'Arnav',
  'Kiara',
  'Vihaan',
  'Anika',
  'Krishna',
  'Navya',
  'Rudra',
  'Pari',
  'Aryan',
  'Riya',
  'Dev',
  'Nitya',
  'Yash',
  'Tara',
  'Om',
  'Mahika',
  'Veer',
  'Zara',
] as const;

const LAST_NAMES = [
  'Sharma',
  'Patel',
  'Nair',
  'Verma',
  'Iyer',
  'Rao',
  'Menon',
  'Gupta',
  'Desai',
  'Mehta',
  'Kulkarni',
  'Reddy',
  'Bose',
  'Pillai',
  'Joshi',
  'Chawla',
  'Bhat',
  'Sheikh',
  'Tiwari',
  'Kapoor',
  'Saxena',
  'Siddiqui',
  'Ranganathan',
  'Subramanian',
] as const;

const FIXED_STUDENT_NAMES = ['Aarav Sharma', 'Diya Patel', 'Kabir Nair', 'Isha Verma'] as const;

const SESSION_TOPICS = [
  'Foundations and course orientation',
  'Core concepts and worked examples',
  'Applied problem solving',
  'Case discussion and group work',
  'Lab / tutorial session',
  'Mid-unit review',
  'Advanced topics and extensions',
  'Assessment briefing',
  'Student presentations',
  'Wrap-up and revision',
] as const;

const FEEDBACK = [
  'Clear structure and correct use of terminology. Add one worked example next time.',
  'Good analysis overall; tighten the justification for the chosen approach.',
  'Accurate work with sound reasoning. Review the final section for clarity.',
  'Solid understanding demonstrated. Watch the assumptions in the middle section.',
  'Well organised submission. Expand the evaluation to earn full marks.',
  'Mostly correct. Revisit the edge cases discussed in class.',
] as const;

const CURRENT_ASSIGNMENT_DEFS = [
  {
    title: 'Case study analysis',
    instructions:
      'Analyse the supplied scenario using the frameworks covered in class. State assumptions, show your reasoning and finish with a short recommendation.',
    dueOffset: -38,
    maxMarks: 50,
    allowResubmission: false,
    status: 'published' as const,
  },
  {
    title: 'Problem set 1',
    instructions:
      'Complete every question in the problem set. Show intermediate steps; answers without working receive partial credit only.',
    dueOffset: -21,
    maxMarks: 50,
    allowResubmission: false,
    status: 'published' as const,
  },
  {
    title: 'Quiz 1',
    instructions:
      'Short-answer quiz covering the first three units. One page of handwritten notes is permitted.',
    dueOffset: -10,
    maxMarks: 25,
    allowResubmission: true,
    status: 'published' as const,
  },
  {
    title: 'Lab report',
    instructions:
      'Submit a lab report with methodology, observations, results and a brief discussion of sources of error.',
    dueOffset: 7,
    maxMarks: 50,
    allowResubmission: false,
    status: 'published' as const,
  },
  {
    title: 'Project proposal',
    instructions:
      'Draft a two-page proposal with problem statement, scope, planned method and milestones. This is a draft assignment for planning purposes.',
    dueOffset: 21,
    maxMarks: 100,
    allowResubmission: false,
    status: 'draft' as const,
  },
] as const;

const PAST_ASSIGNMENT_DEFS = [
  {
    title: 'Case study analysis',
    instructions:
      'Analyse the supplied case and justify your recommendation with evidence from the course material.',
    maxMarks: 50,
  },
  {
    title: 'End-of-unit problem set',
    instructions:
      'Work through the unit problem set and submit a single PDF with all steps and final answers.',
    maxMarks: 50,
  },
] as const;

type SqlValue = string | number | boolean | Date | null;
type Row = Record<string, SqlValue>;

type Department = {
  id: string;
  code: string;
  name: string;
  program: string;
  index: number;
};

type Course = {
  id: string;
  code: string;
  title: string;
  credits: number;
  description: string;
  deptCourseIndex: number;
  department: Department;
  index: number;
};

type Faculty = {
  id: string;
  fullName: string;
  email: string;
  employeeNo: string;
  designation: string;
  joinedOn: string;
  department: Department;
  index: number;
};

type Student = {
  id: string;
  fullName: string;
  email: string;
  rollNo: string;
  admissionYear: number;
  program: string;
  batch: string;
  department: Department;
  index: number;
  localIndex: number;
};

type Term = {
  id: string;
  academicYear: string;
  termNo: number;
  label: string;
  startsOn: string;
  endsOn: string;
  isCurrent: boolean;
  index: number;
};

type Offering = {
  id: string;
  course: Course;
  term: Term;
  faculty: Faculty;
  sectionCode: string;
  status: 'draft' | 'active' | 'closed';
  capacity: number;
  createdBy: string;
  index: number;
  enrollments: Enrollment[];
  sessions: Session[];
  assignments: Assignment[];
};

type Enrollment = {
  id: string;
  offering: Offering;
  student: Student;
  status: 'active' | 'dropped' | 'completed';
  droppedAt: Date | null;
  pastTerm: boolean;
  index: number;
};

type Session = {
  id: string;
  offering: Offering;
  startsAt: Date;
  endsAt: Date;
  topic: string;
  status: 'scheduled' | 'completed' | 'cancelled';
  index: number;
};

type Assignment = {
  id: string;
  offering: Offering;
  title: string;
  instructions: string;
  dueAt: Date;
  maxMarks: number;
  latePenaltyPercent: number;
  allowResubmission: boolean;
  status: 'draft' | 'published' | 'closed';
  publishedAt: Date | null;
  index: number;
};

type SubmissionSeed = {
  id: string;
  offering: Offering;
  assignment: Assignment;
  enrollment: Enrollment;
  submittedAt: Date;
  marksAwarded: number | null;
  gradeStatus: 'pending' | 'graded' | 'released';
  feedback: string | null;
  gradedAt: Date | null;
  releasedAt: Date | null;
  index: number;
};

type AttendanceSeed = {
  id: string;
  session: Session;
  offering: Offering;
  enrollment: Enrollment;
  status: 'present' | 'absent' | 'excused';
  note: string | null;
};

export type SeedCounts = {
  departments: number;
  faculty: number;
  students: number;
  terms: number;
  courses: number;
  offerings: number;
  enrollments: number;
  sessions: number;
  attendance: number;
  assignments: number;
  submissions: number;
  gradeChanges: number;
};

export type SeedResult = {
  skipped: boolean;
  passwordValid: boolean;
  counts?: SeedCounts;
};

function seedId(scope: string, index: number): string {
  const hash = createHash('sha1').update(`acadflow-demo:${scope}:${index}`).digest('hex');
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-4${hash.slice(13, 16)}-8${hash.slice(
    17,
    20,
  )}-${hash.slice(20, 32)}`;
}

/** Small deterministic integer roll in [0, modulus). */
function roll(seed: number, modulus: number): number {
  let value = (seed + 0x9e3779b9) | 0;
  value = Math.imul(value ^ (value >>> 16), 0x21f0aaad);
  value = Math.imul(value ^ (value >>> 15), 0x735a2d97);
  value ^= value >>> 15;
  return (value >>> 0) % modulus;
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * DAY);
}

function addHours(base: Date, hours: number): Date {
  return new Date(base.getTime() + hours * HOUR);
}

function setHour(base: Date, hour: number): Date {
  const value = new Date(base);
  value.setHours(hour, 0, 0, 0);
  return value;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

async function insertRows(
  client: PoolClient,
  table: string,
  columns: string[],
  rows: Row[],
  batchSize = 500,
): Promise<void> {
  for (const batch of chunk(rows, batchSize)) {
    if (batch.length === 0) continue;
    const params: SqlValue[] = [];
    const tuples = batch.map((row) => {
      const placeholders = columns.map((column) => {
        params.push(row[column] ?? null);
        return `$${params.length}`;
      });
      return `(${placeholders.join(', ')})`;
    });
    await client.query(
      `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${tuples.join(', ')}`,
      params,
    );
  }
}

async function setActor(
  client: PoolClient,
  actorUserId: string,
  requestId: string,
  reason = '',
): Promise<void> {
  await client.query(
    `SELECT set_config('app.actor_user_id', $1, true),
            set_config('app.request_id', $2, true),
            set_config('app.change_reason', $3, true)`,
    [actorUserId, requestId, reason],
  );
}

function studentName(index: number): string {
  const fixed = FIXED_STUDENT_NAMES[index];
  if (fixed) return fixed;
  const first = FIRST_NAMES[index % FIRST_NAMES.length]!;
  const last =
    LAST_NAMES[
      (index * 7 + Math.floor(index / FIRST_NAMES.length) * 5) % LAST_NAMES.length
    ]!;
  return `${first} ${last}`;
}

function buildDemoData() {
  const departments: Department[] = DEPARTMENT_SEEDS.map((seed, index) => ({
    id: seedId('department', index),
    code: seed.code,
    name: seed.name,
    program: seed.program,
    index,
  }));

  const terms: Term[] = TERM_SEEDS.map((seed, index) => ({
    ...seed,
    id: seedId('term', index),
    index,
  }));

  const faculty: Faculty[] = [];
  for (const department of departments) {
    for (let local = 0; local < 3; local += 1) {
      const index = department.index * 3 + local;
      faculty.push({
        id: seedId('faculty', index),
        fullName: FACULTY_NAMES[index]!,
        email: `faculty${index + 1}@acadflow.test`,
        employeeNo: `${department.code}-FAC-${String(local + 1).padStart(3, '0')}`,
        designation: ['Professor', 'Associate Professor', 'Assistant Professor'][local]!,
        joinedOn: `${2010 + (index % 13)}-07-${String(1 + (index % 27)).padStart(2, '0')}`,
        department,
        index,
      });
    }
  }

  const students: Student[] = [];
  for (const department of departments) {
    for (let local = 0; local < 30; local += 1) {
      const index = department.index * 30 + local;
      const admissionYear = 2023 + (local % 4);
      students.push({
        id: seedId('student', index),
        fullName: studentName(index),
        email: `student${index + 1}@acadflow.test`,
        rollNo: `${department.code}${admissionYear}${String(local + 1).padStart(3, '0')}`,
        admissionYear,
        program: department.program,
        batch: `${admissionYear}-${String(admissionYear + 4).slice(-2)}`,
        department,
        index,
        localIndex: local,
      });
    }
  }

  const courses: Course[] = [];
  let courseIndex = 0;
  for (const department of departments) {
    const seed = DEPARTMENT_SEEDS[department.index]!;
    seed.courses.forEach(([code, title, credits], deptCourseIndex) => {
      courses.push({
        id: seedId('course', courseIndex),
        code,
        title,
        credits,
        description: `${title} combines core theory, applied problem solving and continuous assessment for the ${department.program} programme.`,
        deptCourseIndex,
        department,
        index: courseIndex,
      });
      courseIndex += 1;
    });
  }

  const adminId = seedId('admin', 0);
  const offerings: Offering[] = [];
  let offeringIndex = 0;
  const offeringTermIndexes = [2, 3, 4];

  for (const course of courses) {
    const departmentFaculty = faculty.filter(
      (person) => person.department.index === course.department.index,
    );
    for (const termIndex of offeringTermIndexes) {
      const term = terms[termIndex]!;
      offerings.push({
        id: seedId('offering', offeringIndex),
        course,
        term,
        faculty:
          departmentFaculty[(course.deptCourseIndex + termIndex) % departmentFaculty.length]!,
        sectionCode: 'A',
        status: term.isCurrent ? 'active' : 'closed',
        capacity: 60,
        createdBy: adminId,
        index: offeringIndex,
        enrollments: [],
        sessions: [],
        assignments: [],
      });
      offeringIndex += 1;
    }

    // A small number of future draft offerings so the admin can demonstrate the
    // offering lifecycle without inventing any student records.
    if (course.deptCourseIndex < 2) {
      const term = terms[5]!;
      offerings.push({
        id: seedId('offering', offeringIndex),
        course,
        term,
        faculty: departmentFaculty[(course.deptCourseIndex + 1) % departmentFaculty.length]!,
        sectionCode: 'A',
        status: 'draft',
        capacity: 60,
        createdBy: adminId,
        index: offeringIndex,
        enrollments: [],
        sessions: [],
        assignments: [],
      });
      offeringIndex += 1;
    }
  }

  const offeringsFor = (departmentIndex: number, termIndex: number): Offering[] =>
    offerings
      .filter(
        (offering) =>
          offering.course.department.index === departmentIndex &&
          offering.term.index === termIndex &&
          offering.status !== 'draft',
      )
      .sort((left, right) => left.course.deptCourseIndex - right.course.deptCourseIndex);

  const enrollments: Enrollment[] = [];
  let enrollmentIndex = 0;
  const currentTermIndex = 4;
  const pastTermIndexes = [2, 3];

  for (const department of departments) {
    const departmentStudents = students.filter(
      (student) => student.department.index === department.index,
    );
    const currentOfferings = offeringsFor(department.index, currentTermIndex);

    for (const student of departmentStudents) {
      for (let slot = 0; slot < 4; slot += 1) {
        const offering = currentOfferings[(student.localIndex + slot) % currentOfferings.length]!;
        const dropped = student.localIndex % 31 === 0 && slot === 0;
        const enrollment: Enrollment = {
          id: seedId('enrollment', enrollmentIndex),
          offering,
          student,
          status: dropped ? 'dropped' : 'active',
          droppedAt: dropped ? addDays(NOW, -30) : null,
          pastTerm: false,
          index: enrollmentIndex,
        };
        enrollments.push(enrollment);
        offering.enrollments.push(enrollment);
        enrollmentIndex += 1;
      }

      for (const termIndex of pastTermIndexes) {
        const term = terms[termIndex]!;
        const startYear = Number(term.academicYear.slice(0, 4));
        if (student.admissionYear > startYear) continue;
        const pastOfferings = offeringsFor(department.index, termIndex);
        for (let slot = 0; slot < 3; slot += 1) {
          const offering =
            pastOfferings[(student.localIndex + termIndex + slot) % pastOfferings.length]!;
          const enrollment: Enrollment = {
            id: seedId('enrollment', enrollmentIndex),
            offering,
            student,
            status: 'active',
            droppedAt: null,
            pastTerm: true,
            index: enrollmentIndex,
          };
          enrollments.push(enrollment);
          offering.enrollments.push(enrollment);
          enrollmentIndex += 1;
        }
      }
    }
  }

  let sessionIndex = 0;
  for (const offering of offerings) {
    if (offering.status === 'draft') continue;
    const current = offering.term.isCurrent;

    for (let week = 0; week < 8; week += 1) {
      const startsAt = current
        ? setHour(addDays(NOW, -(21 - week * 2)), 9 + (offering.index % 5))
        : setHour(
            addDays(
              new Date(`${offering.term.startsOn}T09:00:00`),
              week * 7 + (offering.index % 5),
            ),
            9 + (offering.index % 4),
          );
      offering.sessions.push({
        id: seedId('session', sessionIndex),
        offering,
        startsAt,
        endsAt: new Date(startsAt.getTime() + 90 * MINUTE),
        topic: `${offering.course.code} · ${SESSION_TOPICS[(week + offering.index) % SESSION_TOPICS.length]!}`,
        status: 'completed',
        index: sessionIndex,
      });
      sessionIndex += 1;
    }

    if (current) {
      for (let upcoming = 0; upcoming < 2; upcoming += 1) {
        const startsAt = setHour(
          addDays(NOW, 3 + upcoming * 7 + (offering.index % 3)),
          10 + (offering.index % 4),
        );
        offering.sessions.push({
          id: seedId('session', sessionIndex),
          offering,
          startsAt,
          endsAt: new Date(startsAt.getTime() + 90 * MINUTE),
          topic: `${offering.course.code} · ${SESSION_TOPICS[(8 + upcoming + offering.index) % SESSION_TOPICS.length]!}`,
          status: 'scheduled',
          index: sessionIndex,
        });
        sessionIndex += 1;
      }
    }
  }

  let assignmentIndex = 0;
  for (const offering of offerings) {
    if (offering.status === 'draft') continue;

    const definitions = offering.term.isCurrent
      ? CURRENT_ASSIGNMENT_DEFS
      : PAST_ASSIGNMENT_DEFS.map((definition, index) => ({
          ...definition,
          dueOffset: index,
          allowResubmission: false,
          status: 'published' as const,
        }));

    for (const definition of definitions) {
      let dueAt: Date;
      if (offering.term.isCurrent) {
        dueAt = setHour(addDays(NOW, definition.dueOffset), 23);
      } else {
        dueAt = setHour(
          addDays(new Date(`${offering.term.startsOn}T09:00:00`), 42 + definition.dueOffset * 42),
          23,
        );
      }

      const publishedAt =
        definition.status === 'published' ? addDays(dueAt, -14) : null;

      offering.assignments.push({
        id: seedId('assignment', assignmentIndex),
        offering,
        title: definition.title,
        instructions: definition.instructions,
        dueAt,
        maxMarks: definition.maxMarks,
        latePenaltyPercent: 0,
        allowResubmission: definition.allowResubmission,
        status: definition.status,
        publishedAt,
        index: assignmentIndex,
      });
      assignmentIndex += 1;
    }
  }

  const assignments = offerings.flatMap((offering) => offering.assignments);
  const submissions: SubmissionSeed[] = [];
  let submissionIndex = 0;

  for (const assignment of assignments) {
    if (assignment.status !== 'published') continue;
    const future = assignment.dueAt.getTime() > NOW.getTime();
    const eligible = assignment.offering.enrollments.filter(
      (enrollment) => enrollment.status === 'active',
    );

    for (const enrollment of eligible) {
      const seed =
        enrollment.student.index * 7919 + assignment.index * 104729 + enrollment.index * 31 + 17;
      const probability = assignment.offering.term.isCurrent
        ? future
          ? 35
          : 82
        : 86;
      if (roll(seed, 100) >= probability) continue;

      const late = !future && roll(seed + 1, 100) < 16;
      let submittedAt = future
        ? addHours(NOW, -(6 + roll(seed + 2, 36)))
        : addDays(
            assignment.dueAt,
            late ? 1 + roll(seed + 3, 3) : -(1 + roll(seed + 4, 4)),
          );
      if (submittedAt.getTime() > NOW.getTime()) submittedAt = addHours(NOW, -2);

      let gradeStatus: SubmissionSeed['gradeStatus'] = 'pending';
      if (!future) {
        const gradeRoll = roll(seed + 5, 100);
        if (assignment.offering.term.isCurrent) {
          const daysPastDue = (NOW.getTime() - assignment.dueAt.getTime()) / DAY;
          if (daysPastDue < 14) {
            gradeStatus = gradeRoll < 15 ? 'released' : gradeRoll < 40 ? 'graded' : 'pending';
          } else {
            gradeStatus = gradeRoll < 25 ? 'released' : gradeRoll < 65 ? 'graded' : 'pending';
          }
        } else {
          gradeStatus = gradeRoll < 50 ? 'released' : gradeRoll < 88 ? 'graded' : 'pending';
        }
      }

      let marksAwarded: number | null = null;
      let feedback: string | null = null;
      let gradedAt: Date | null = null;
      let releasedAt: Date | null = null;

      if (gradeStatus !== 'pending') {
        marksAwarded = round2(
          (assignment.maxMarks * (52 + roll(seed + 6, 47))) / 100,
        );
        feedback = FEEDBACK[roll(seed + 7, FEEDBACK.length)]!;
        const proposedGradedAt = addHours(submittedAt, 24 * (2 + roll(seed + 8, 5)));
        gradedAt = new Date(
          Math.min(proposedGradedAt.getTime(), NOW.getTime() - 2 * HOUR),
        );
        if (gradedAt.getTime() <= submittedAt.getTime()) {
          gradedAt = addHours(submittedAt, 1);
        }
        if (gradeStatus === 'released') {
          releasedAt = new Date(
            Math.min(gradedAt.getTime() + DAY, NOW.getTime() - HOUR),
          );
          if (releasedAt.getTime() <= gradedAt.getTime()) {
            releasedAt = addHours(gradedAt, 1);
          }
        }
      }

      submissions.push({
        id: seedId('submission', submissionIndex),
        offering: assignment.offering,
        assignment,
        enrollment,
        submittedAt,
        marksAwarded,
        gradeStatus,
        feedback,
        gradedAt,
        releasedAt,
        index: submissionIndex,
      });
      submissionIndex += 1;
    }
  }

  const attendance: AttendanceSeed[] = [];
  let attendanceIndex = 0;
  for (const offering of offerings) {
    const completedSessions = offering.sessions.filter(
      (session) => session.status === 'completed',
    );
    const activeEnrollments = offering.enrollments.filter(
      (enrollment) => enrollment.status === 'active',
    );
    for (const session of completedSessions) {
      for (const enrollment of activeEnrollments) {
        const value = roll(
          enrollment.student.index * 37 + session.index * 19 + offering.index * 11,
          100,
        );
        const status = value < 80 ? 'present' : value < 92 ? 'absent' : 'excused';
        attendance.push({
          id: seedId('attendance', attendanceIndex),
          session,
          offering,
          enrollment,
          status,
          note: status === 'excused' ? 'Approved leave' : null,
        });
        attendanceIndex += 1;
      }
    }
  }

  return {
    adminId,
    departments,
    terms,
    faculty,
    students,
    courses,
    offerings,
    enrollments,
    assignments,
    submissions,
    attendance,
    passwordHashSeed: DEMO_PASSWORD,
  };
}

export async function runSeed(): Promise<SeedResult> {
  const existing = await query<{ count: string }>('SELECT count(*) AS count FROM app_user');
  if (Number(existing[0]?.count ?? 0) > 0) {
    return { skipped: true, passwordValid: false };
  }

  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const passwordValid = await verifyPassword(passwordHash, DEMO_PASSWORD);
  if (!passwordValid) {
    throw new Error('Password hashing verification failed while seeding.');
  }

  const data = buildDemoData();

  await withTransaction(
    { actorUserId: data.adminId, requestId: `seed_${Date.now()}` },
    async (client) => {
      // ----- configuration (policy values remain JSON null until approved) ------
      await client.query(
        `INSERT INTO app_setting (key, value, description) VALUES
           ('institution.name', '"AcadFlow Institute of Technology"'::jsonb, 'Institution display name'),
           ('attendance.excused_policy', 'null'::jsonb, 'D3 pending: treatment of excused attendance'),
           ('attendance.unmarked_policy', 'null'::jsonb, 'D4 pending: treatment of unmarked sessions'),
           ('attendance.denominator_policy', 'null'::jsonb, 'D14 pending: eligible session denominator'),
           ('attendance.deficit_threshold_percent', 'null'::jsonb, 'D13 pending: deficit threshold'),
           ('grading.rounding_decimals', 'null'::jsonb, 'D15 pending: authoritative rounding'),
           ('grading.late_penalty_mode', 'null'::jsonb, 'D5 pending: late penalty mode'),
           ('upload.max_bytes', 'null'::jsonb, 'D9 pending: maximum upload size'),
           ('upload.allowed_mime_types', 'null'::jsonb, 'D9 pending: allowed MIME types'),
           ('upload.allowed_extensions', 'null'::jsonb, 'D9 pending: allowed extensions'),
           ('upload.retention_days', 'null'::jsonb, 'D9 pending: retention period'),
           ('submission.allow_late', 'null'::jsonb, 'D6 pending: late submission acceptance'),
           ('submission.resubmission_policy', 'null'::jsonb, 'D7 pending: resubmission policy')
         ON CONFLICT (key) DO NOTHING`,
      );

      await insertRows(
        client,
        'department',
        ['id', 'code', 'name'],
        data.departments.map((department) => ({
          id: department.id,
          code: department.code,
          name: department.name,
        })),
      );

      await insertRows(
        client,
        'app_user',
        ['id', 'email', 'password_hash', 'full_name', 'role'],
        [
          {
            id: data.adminId,
            email: 'admin@acadflow.test',
            password_hash: passwordHash,
            full_name: 'Ananya Iyer',
            role: 'admin',
          },
          ...data.faculty.map((person) => ({
            id: person.id,
            email: person.email,
            password_hash: passwordHash,
            full_name: person.fullName,
            role: 'faculty',
          })),
          ...data.students.map((student) => ({
            id: student.id,
            email: student.email,
            password_hash: passwordHash,
            full_name: student.fullName,
            role: 'student',
          })),
        ],
      );

      await insertRows(
        client,
        'faculty_profile',
        ['user_id', 'department_id', 'employee_no', 'designation', 'joined_on'],
        data.faculty.map((person) => ({
          user_id: person.id,
          department_id: person.department.id,
          employee_no: person.employeeNo,
          designation: person.designation,
          joined_on: person.joinedOn,
        })),
      );

      await insertRows(
        client,
        'student_profile',
        ['user_id', 'department_id', 'roll_no', 'admission_year', 'program', 'batch'],
        data.students.map((student) => ({
          user_id: student.id,
          department_id: student.department.id,
          roll_no: student.rollNo,
          admission_year: student.admissionYear,
          program: student.program,
          batch: student.batch,
        })),
      );

      await insertRows(
        client,
        'academic_term',
        ['id', 'academic_year', 'term_no', 'label', 'starts_on', 'ends_on', 'is_current'],
        data.terms.map((term) => ({
          id: term.id,
          academic_year: term.academicYear,
          term_no: term.termNo,
          label: term.label,
          starts_on: term.startsOn,
          ends_on: term.endsOn,
          is_current: term.isCurrent,
        })),
      );

      await insertRows(
        client,
        'course',
        ['id', 'department_id', 'code', 'title', 'credits', 'description'],
        data.courses.map((course) => ({
          id: course.id,
          department_id: course.department.id,
          code: course.code,
          title: course.title,
          credits: course.credits,
          description: course.description,
        })),
      );

      await insertRows(
        client,
        'course_offering',
        [
          'id',
          'course_id',
          'term_id',
          'faculty_user_id',
          'section_code',
          'status',
          'capacity',
          'created_by',
        ],
        data.offerings.map((offering) => ({
          id: offering.id,
          course_id: offering.course.id,
          term_id: offering.term.id,
          faculty_user_id: offering.faculty.id,
          section_code: offering.sectionCode,
          status: offering.status,
          capacity: offering.capacity,
          created_by: offering.createdBy,
        })),
      );

      await insertRows(
        client,
        'enrollment',
        ['id', 'offering_id', 'student_user_id', 'status', 'dropped_at', 'created_by'],
        data.enrollments.map((enrollment) => ({
          id: enrollment.id,
          offering_id: enrollment.offering.id,
          student_user_id: enrollment.student.id,
          status: enrollment.status,
          dropped_at: enrollment.droppedAt,
          created_by: data.adminId,
        })),
        500,
      );

      await insertRows(
        client,
        'class_session',
        ['id', 'offering_id', 'starts_at', 'ends_at', 'topic', 'status', 'created_by'],
        data.offerings.flatMap((offering) =>
          offering.sessions.map((session) => ({
            id: session.id,
            offering_id: offering.id,
            starts_at: session.startsAt,
            ends_at: session.endsAt,
            topic: session.topic,
            status: session.status,
            created_by: offering.faculty.id,
          })),
        ),
        400,
      );

      await insertRows(
        client,
        'assignment',
        [
          'id',
          'offering_id',
          'title',
          'instructions',
          'due_at',
          'max_marks',
          'late_penalty_percent',
          'allow_resubmission',
          'status',
          'published_at',
          'created_by',
        ],
        data.assignments.map((assignment) => ({
          id: assignment.id,
          offering_id: assignment.offering.id,
          title: assignment.title,
          instructions: assignment.instructions,
          due_at: assignment.dueAt,
          max_marks: assignment.maxMarks,
          late_penalty_percent: assignment.latePenaltyPercent,
          allow_resubmission: assignment.allowResubmission,
          status: assignment.status,
          published_at: assignment.publishedAt,
          created_by: assignment.offering.faculty.id,
        })),
        500,
      );

      const submissionGroups = new Map<string, SubmissionSeed[]>();
      for (const submission of data.submissions) {
        const group = submissionGroups.get(submission.offering.id) ?? [];
        group.push(submission);
        submissionGroups.set(submission.offering.id, group);
      }

      for (const group of submissionGroups.values()) {
        const offering = group[0]!.offering;
        await setActor(
          client,
          offering.faculty.id,
          `seed_submissions_${offering.id}`,
        );
        await insertRows(
          client,
          'submission',
          [
            'id',
            'assignment_id',
            'enrollment_id',
            'offering_id',
            'submitted_at',
            'marks_awarded',
            'grade_status',
            'feedback',
            'graded_by',
            'graded_at',
            'released_at',
          ],
          group.map((submission) => ({
            id: submission.id,
            assignment_id: submission.assignment.id,
            enrollment_id: submission.enrollment.id,
            offering_id: submission.offering.id,
            submitted_at: submission.submittedAt,
            marks_awarded: submission.marksAwarded,
            grade_status: submission.gradeStatus,
            feedback: submission.feedback,
            graded_by:
              submission.gradeStatus === 'pending' ? null : submission.offering.faculty.id,
            graded_at: submission.gradedAt,
            released_at: submission.releasedAt,
          })),
          200,
        );

        // A handful of moderated marks create real `update` audit rows so the
        // grade audit log demonstrates both initial grading and later changes.
        const moderated = group
          .filter((submission, index) => submission.marksAwarded !== null && index % 17 === 3)
          .slice(0, 2);
        if (moderated.length > 0) {
          await setActor(
            client,
            offering.faculty.id,
            `seed_moderation_${offering.id}`,
            'Moderation after rubric review',
          );
          await client.query(
            `UPDATE submission s
                SET marks_awarded = LEAST(s.marks_awarded + 1.5, a.max_marks)
               FROM assignment a
              WHERE a.id = s.assignment_id
                AND s.id = ANY($1::uuid[])`,
            [moderated.map((submission) => submission.id)],
          );
        }
      }

      await insertRows(
        client,
        'attendance',
        ['id', 'session_id', 'enrollment_id', 'offering_id', 'status', 'note', 'marked_by'],
        data.attendance.map((record) => ({
          id: record.id,
          session_id: record.session.id,
          enrollment_id: record.enrollment.id,
          offering_id: record.offering.id,
          status: record.status,
          note: record.note,
          marked_by: record.offering.faculty.id,
        })),
        800,
      );

      // Past-term enrollments become completed only after their historical
      // attendance and submissions exist. The submission trigger requires an
      // active enrollment on insert, and historical rows must remain valid.
      for (const termIndex of [2, 3]) {
        const term = data.terms[termIndex]!;
        const ids = data.enrollments
          .filter((enrollment) => enrollment.pastTerm && enrollment.offering.term.index === termIndex)
          .map((enrollment) => enrollment.id);
        for (const batch of chunk(ids, 1500)) {
          await client.query(
            `UPDATE enrollment
                SET status = 'completed',
                    status_changed_at = $2
              WHERE id = ANY($1::uuid[])`,
            [batch, new Date(`${term.endsOn}T17:00:00`)],
          );
        }
      }
    },
    { importMode: true },
  );

  const countRows = await query<Record<string, string>>(
    `SELECT
       (SELECT count(*) FROM department)      AS departments,
       (SELECT count(*) FROM faculty_profile) AS faculty,
       (SELECT count(*) FROM student_profile) AS students,
       (SELECT count(*) FROM academic_term)   AS terms,
       (SELECT count(*) FROM course)          AS courses,
       (SELECT count(*) FROM course_offering) AS offerings,
       (SELECT count(*) FROM enrollment)      AS enrollments,
       (SELECT count(*) FROM class_session)   AS sessions,
       (SELECT count(*) FROM attendance)      AS attendance,
       (SELECT count(*) FROM assignment)      AS assignments,
       (SELECT count(*) FROM submission)       AS submissions,
       (SELECT count(*) FROM grade_change_log) AS "gradeChanges"`,
  );
  const countsRow = countRows[0] ?? {};
  const counts: SeedCounts = {
    departments: Number(countsRow.departments ?? 0),
    faculty: Number(countsRow.faculty ?? 0),
    students: Number(countsRow.students ?? 0),
    terms: Number(countsRow.terms ?? 0),
    courses: Number(countsRow.courses ?? 0),
    offerings: Number(countsRow.offerings ?? 0),
    enrollments: Number(countsRow.enrollments ?? 0),
    sessions: Number(countsRow.sessions ?? 0),
    attendance: Number(countsRow.attendance ?? 0),
    assignments: Number(countsRow.assignments ?? 0),
    submissions: Number(countsRow.submissions ?? 0),
    gradeChanges: Number(countsRow.gradeChanges ?? 0),
  };

  return { skipped: false, passwordValid, counts };
}

export function formatSeedCounts(counts: SeedCounts): string {
  return [
    `${counts.departments} departments`,
    `${counts.faculty} faculty`,
    `${counts.students} students`,
    `${counts.terms} terms`,
    `${counts.courses} courses`,
    `${counts.offerings} offerings`,
    `${counts.enrollments} enrollments`,
    `${counts.sessions} sessions`,
    `${counts.attendance} attendance records`,
    `${counts.assignments} assignments`,
    `${counts.submissions} submissions`,
    `${counts.gradeChanges} grade-audit entries`,
  ].join(' · ');
}
