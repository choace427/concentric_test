const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface ApiResponse<T> {
  data?: T;
  error?: string;
  details?: any;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const hasBody = options.body !== undefined && options.body !== null;
    const headers: HeadersInit = new Headers(options.headers);
    
    if (hasBody && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    } else if (!hasBody) {
      headers.delete('Content-Type');
    }

    const config: RequestInit = {
      ...options,
      headers,
      credentials: 'include',
    };

    try {
      const response = await fetch(url, config);
      let data;
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = text ? { error: text } : { error: 'An error occurred' };
      }

      if (!response.ok) {
        return {
          error: data.error || 'An error occurred',
          details: data.details,
        };
      }

      return { data };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }
  async login(email: string, password: string, role?: string) {
    return this.request<{ user: any }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, role }),
    });
  }

  async logout() {
    return this.request('/api/auth/logout', {
      method: 'POST',
    });
  }

  async getCurrentUser() {
    return this.request<{ user: any }>('/api/auth/me');
  }

  // Student endpoints
  async getStudentClasses() {
    return this.request<{ classes: any[] }>('/api/student/classes');
  }

  async getStudentAssignments() {
    return this.request<{ assignments: any[] }>('/api/student/assignments');
  }

  async submitAssignment(assignmentId: string, content: string) {
    return this.request<{ submission: any }>('/api/student/submissions', {
      method: 'POST',
      body: JSON.stringify({ assignment_id: assignmentId, content }),
    });
  }

  async getStudentGrades() {
    return this.request<{ submissions: any[]; average: number }>(
      '/api/student/grades'
    );
  }

  // Teacher endpoints
  async getTeacherClasses() {
    return this.request<{ classes: any[] }>('/api/teacher/classes');
  }

  async createClass(name: string, description?: string) {
    return this.request<{ class: any }>('/api/teacher/classes', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async updateClass(id: string, name: string, description?: string) {
    return this.request<{ class: any }>(`/api/teacher/classes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, description }),
    });
  }

  async deleteClass(id: string) {
    return this.request(`/api/teacher/classes/${id}`, {
      method: 'DELETE',
    });
  }

  async addStudentToClass(classId: string, studentId: string) {
    return this.request<{ enrollment: any }>(
      `/api/teacher/classes/${classId}/students/${studentId}`,
      {
        method: 'POST',
      }
    );
  }

  async removeStudentFromClass(classId: string, studentId: string) {
    return this.request(
      `/api/teacher/classes/${classId}/students/${studentId}`,
      {
        method: 'DELETE',
      }
    );
  }

  async getTeacherAssignments() {
    return this.request<{ assignments: any[] }>('/api/teacher/assignments');
  }

  async createAssignment(
    classId: string,
    title: string,
    description: string,
    dueDate: string
  ) {
    return this.request<{ assignment: any }>('/api/teacher/assignments', {
      method: 'POST',
      body: JSON.stringify({
        class_id: classId,
        title,
        description,
        due_date: dueDate,
      }),
    });
  }

  async updateAssignment(
    id: string,
    data: {
      class_id?: string;
      title?: string;
      description?: string;
      due_date?: string;
      published?: boolean;
    }
  ) {
    return this.request<{ assignment: any }>(`/api/teacher/assignments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAssignment(id: string) {
    return this.request(`/api/teacher/assignments/${id}`, {
      method: 'DELETE',
    });
  }

  async publishAssignment(id: string) {
    return this.request<{ assignment: any }>(
      `/api/teacher/assignments/${id}/publish`,
      {
        method: 'POST',
      }
    );
  }

  async getAssignmentSubmissions(assignmentId: string) {
    return this.request<{ submissions: any[] }>(
      `/api/teacher/assignments/${assignmentId}/submissions`
    );
  }

  async gradeSubmission(
    assignmentId: string,
    submissionId: string,
    grade: number,
    feedback?: string
  ) {
    return this.request<{ submission: any }>(
      `/api/teacher/assignments/${assignmentId}/submissions/${submissionId}/grade`,
      {
        method: 'PUT',
        body: JSON.stringify({ grade, feedback }),
      }
    );
  }

  // Admin endpoints
  async getUsers() {
    return this.request<{ users: any[] }>('/api/admin/users');
  }

  async createUser(data: {
    email: string;
    name: string;
    role: string;
    teacher_group_id?: string;
  }) {
    return this.request<{ user: any }>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateUser(
    id: string,
    data: Partial<{
      email: string;
      name: string;
      role: string;
      teacher_group_id?: string;
    }>
  ) {
    return this.request<{ user: any }>(`/api/admin/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteUser(id: string) {
    return this.request(`/api/admin/users/${id}`, {
      method: 'DELETE',
    });
  }

  async suspendUser(id: string) {
    return this.request<{ user: any; message: string }>(
      `/api/admin/users/${id}/suspend`,
      {
        method: 'POST',
      }
    );
  }

  async unsuspendUser(id: string) {
    return this.request<{ user: any; message: string }>(
      `/api/admin/users/${id}/unsuspend`,
      {
        method: 'POST',
      }
    );
  }

  async getTeacherGroups() {
    return this.request<{ groups: any[] }>('/api/admin/teacher-groups');
  }

  async createTeacherGroup(name: string, description?: string) {
    return this.request<{ group: any }>('/api/admin/teacher-groups', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  async updateTeacherGroup(id: string, name: string, description?: string) {
    return this.request<{ group: any }>(`/api/admin/teacher-groups/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name, description }),
    });
  }

  async deleteTeacherGroup(id: string) {
    return this.request(`/api/admin/teacher-groups/${id}`, {
      method: 'DELETE',
    });
  }

  // Stats endpoints
  async getStudentNames() {
    return this.request<{ students: any[] }>('/api/v0/stats/student-names');
  }

  async getTeacherNames() {
    return this.request<{ teachers: any[] }>('/api/v0/stats/teacher-names');
  }

  async getClasses() {
    return this.request<{ classes: any[] }>('/api/v0/stats/classes');
  }

  async getClassStudents(classId: string) {
    return this.request<{ students: any[] }>(
      `/api/v0/stats/classes/${classId}`
    );
  }

  async getAverageGrades() {
    return this.request<{ average_grade: number; total_submissions: number }>(
      '/api/v0/stats/average-grades'
    );
  }

  async getAverageGradesByClass(classId: string) {
    return this.request<{
      class_id: string;
      average_grade: number;
      total_submissions: number;
    }>(`/api/v0/stats/average-grades/${classId}`);
  }

  // Chatbot endpoints
  async sendChatMessage(
    message: string,
    conversationHistory?: Array<{ role: 'user' | 'assistant'; content: string }>
  ) {
    return this.request<{ message: string }>('/api/chatbot/chat', {
      method: 'POST',
      body: JSON.stringify({ message, conversationHistory }),
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
