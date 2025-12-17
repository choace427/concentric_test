export type UserRole = 'admin' | 'teacher' | 'student';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  suspended: boolean;
  teacherGroupId?: string;
}

export interface TeacherGroup {
  id: string;
  name: string;
  description: string;
}

export interface Class {
  id: string;
  name: string;
  description: string;
  teacherId: string;
  teacherName: string;
  studentIds: string[];
}

export interface Assignment {
  id: string;
  classId: string;
  title: string;
  description: string;
  dueDate: string;
  published: boolean;
  submissions: Submission[];
}

export interface Submission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  content: string;
  submittedAt: string;
  grade?: number;
  feedback?: string;
}

// Dummy data
let users: User[] = [
  {
    id: '1',
    email: 'admin@school.com',
    name: 'Admin User',
    role: 'admin',
    suspended: false,
  },
  {
    id: '2',
    email: 'teacher1@school.com',
    name: 'John Teacher',
    role: 'teacher',
    suspended: false,
    teacherGroupId: '1',
  },
  {
    id: '3',
    email: 'teacher2@school.com',
    name: 'Jane Teacher',
    role: 'teacher',
    suspended: false,
    teacherGroupId: '2',
  },
  {
    id: '4',
    email: 'student1@school.com',
    name: 'Alice Student',
    role: 'student',
    suspended: false,
  },
  {
    id: '5',
    email: 'student2@school.com',
    name: 'Bob Student',
    role: 'student',
    suspended: false,
  },
  {
    id: '6',
    email: 'student3@school.com',
    name: 'Charlie Student',
    role: 'student',
    suspended: false,
  },
];

let teacherGroups: TeacherGroup[] = [
  {
    id: '1',
    name: 'Mathematics Department',
    description: 'Math teachers group',
  },
  {
    id: '2',
    name: 'Science Department',
    description: 'Science teachers group',
  },
];

let classes: Class[] = [
  {
    id: '1',
    name: 'Algebra 101',
    description: 'Introduction to Algebra',
    teacherId: '2',
    teacherName: 'John Teacher',
    studentIds: ['4', '5'],
  },
  {
    id: '2',
    name: 'Biology 101',
    description: 'Introduction to Biology',
    teacherId: '3',
    teacherName: 'Jane Teacher',
    studentIds: ['4', '6'],
  },
];

let assignments: Assignment[] = [
  {
    id: '1',
    classId: '1',
    title: 'Algebra Homework 1',
    description: 'Complete exercises 1-10',
    dueDate: '2024-12-31',
    published: true,
    submissions: [
      {
        id: '1',
        assignmentId: '1',
        studentId: '4',
        studentName: 'Alice Student',
        content: 'I completed all exercises.',
        submittedAt: '2024-12-15T10:00:00Z',
        grade: 85,
        feedback: 'Good work!',
      },
    ],
  },
  {
    id: '2',
    classId: '2',
    title: 'Biology Lab Report',
    description: 'Write a lab report on cell structure',
    dueDate: '2024-12-25',
    published: true,
    submissions: [],
  },
];

// Data store functions
export const dataStore = {
  // Users
  getUsers: () => users,
  getUser: (id: string) => users.find((u) => u.id === id),
  getUserByEmail: (email: string) => users.find((u) => u.email === email),
  addUser: (user: Omit<User, 'id'>) => {
    const newUser: User = {
      ...user,
      id: String(users.length + 1),
    };
    users.push(newUser);
    return newUser;
  },
  updateUser: (id: string, updates: Partial<User>) => {
    const index = users.findIndex((u) => u.id === id);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates };
      return users[index];
    }
    return null;
  },
  deleteUser: (id: string) => {
    users = users.filter((u) => u.id !== id);
  },
  toggleUserSuspension: (id: string) => {
    const user = users.find((u) => u.id === id);
    if (user) {
      user.suspended = !user.suspended;
      return user;
    }
    return null;
  },

  // Teacher Groups
  getTeacherGroups: () => teacherGroups,
  getTeacherGroup: (id: string) => teacherGroups.find((tg) => tg.id === id),
  addTeacherGroup: (group: Omit<TeacherGroup, 'id'>) => {
    const newGroup: TeacherGroup = {
      ...group,
      id: String(teacherGroups.length + 1),
    };
    teacherGroups.push(newGroup);
    return newGroup;
  },
  updateTeacherGroup: (id: string, updates: Partial<TeacherGroup>) => {
    const index = teacherGroups.findIndex((tg) => tg.id === id);
    if (index !== -1) {
      teacherGroups[index] = { ...teacherGroups[index], ...updates };
      return teacherGroups[index];
    }
    return null;
  },
  deleteTeacherGroup: (id: string) => {
    teacherGroups = teacherGroups.filter((tg) => tg.id !== id);
  },

  // Classes
  getClasses: () => classes,
  getClass: (id: string) => classes.find((c) => c.id === id),
  getClassesByTeacher: (teacherId: string) =>
    classes.filter((c) => c.teacherId === teacherId),
  getClassesByStudent: (studentId: string) =>
    classes.filter((c) => c.studentIds.includes(studentId)),
  addClass: (cls: Omit<Class, 'id'>) => {
    const newClass: Class = {
      ...cls,
      id: String(classes.length + 1),
    };
    classes.push(newClass);
    return newClass;
  },
  updateClass: (id: string, updates: Partial<Class>) => {
    const index = classes.findIndex((c) => c.id === id);
    if (index !== -1) {
      classes[index] = { ...classes[index], ...updates };
      return classes[index];
    }
    return null;
  },
  deleteClass: (id: string) => {
    classes = classes.filter((c) => c.id !== id);
  },
  addStudentToClass: (classId: string, studentId: string) => {
    const cls = classes.find((c) => c.id === classId);
    if (cls && !cls.studentIds.includes(studentId)) {
      cls.studentIds.push(studentId);
      return cls;
    }
    return null;
  },
  removeStudentFromClass: (classId: string, studentId: string) => {
    const cls = classes.find((c) => c.id === classId);
    if (cls) {
      cls.studentIds = cls.studentIds.filter((id) => id !== studentId);
      return cls;
    }
    return null;
  },

  // Assignments
  getAssignments: () => assignments,
  getAssignment: (id: string) => assignments.find((a) => a.id === id),
  getAssignmentsByClass: (classId: string) =>
    assignments.filter((a) => a.classId === classId),
  getAssignmentsByStudent: (studentId: string) => {
    const studentClasses = classes.filter((c) =>
      c.studentIds.includes(studentId)
    );
    return assignments.filter((a) =>
      studentClasses.some((c) => c.id === a.classId)
    );
  },
  addAssignment: (assignment: Omit<Assignment, 'id' | 'submissions'>) => {
    const newAssignment: Assignment = {
      ...assignment,
      id: String(assignments.length + 1),
      submissions: [],
    };
    assignments.push(newAssignment);
    return newAssignment;
  },
  updateAssignment: (id: string, updates: Partial<Assignment>) => {
    const index = assignments.findIndex((a) => a.id === id);
    if (index !== -1) {
      assignments[index] = { ...assignments[index], ...updates };
      return assignments[index];
    }
    return null;
  },
  deleteAssignment: (id: string) => {
    assignments = assignments.filter((a) => a.id !== id);
  },
  publishAssignment: (id: string) => {
    const assignment = assignments.find((a) => a.id === id);
    if (assignment) {
      assignment.published = true;
      return assignment;
    }
    return null;
  },

  // Submissions
  addSubmission: (submission: Omit<Submission, 'id'>) => {
    const assignment = assignments.find(
      (a) => a.id === submission.assignmentId
    );
    if (assignment) {
      const newSubmission: Submission = {
        ...submission,
        id: String(assignment.submissions.length + 1),
      };
      assignment.submissions.push(newSubmission);
      return newSubmission;
    }
    return null;
  },
  gradeSubmission: (
    assignmentId: string,
    submissionId: string,
    grade: number,
    feedback: string
  ) => {
    const assignment = assignments.find((a) => a.id === assignmentId);
    if (assignment) {
      const submission = assignment.submissions.find(
        (s) => s.id === submissionId
      );
      if (submission) {
        submission.grade = grade;
        submission.feedback = feedback;
        return submission;
      }
    }
    return null;
  },
};

