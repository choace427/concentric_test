export interface Database {
  teacher_groups: TeacherGroupTable;
  users: UserTable;
  classes: ClassTable;
  class_students: ClassStudentTable;
  assignments: AssignmentTable;
  submissions: SubmissionTable;
}

export interface TeacherGroupTable {
  id: string;
  name: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface UserTable {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
  suspended: boolean;
  teacher_group_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface ClassTable {
  id: string;
  name: string;
  description: string | null;
  teacher_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface ClassStudentTable {
  id: string;
  class_id: string;
  student_id: string;
  enrolled_at: Date;
}

export interface AssignmentTable {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  due_date: string;
  published: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface SubmissionTable {
  id: string;
  assignment_id: string;
  student_id: string;
  content: string;
  submitted_at: Date;
  grade: number | null;
  feedback: string | null;
  created_at: Date;
  updated_at: Date;
}

export type DB = Database;

