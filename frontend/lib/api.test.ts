import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './api';

global.fetch = vi.fn();

describe('ApiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('request method', () => {
    it('should make GET request successfully', async () => {
      const mockData = { user: { id: '1', email: 'test@example.com' } };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
      } as Response);

      const response = await api.getCurrentUser();

      const callArgs = vi.mocked(fetch).mock.calls[0];
      expect(callArgs[0]).toContain('/api/auth/me');
      // GET is the default method when not specified, so method should be undefined
      // (fetch defaults to GET when method is not explicitly set)
      const config = callArgs[1] as RequestInit;
      expect(config?.method).toBeUndefined();
      expect(config?.credentials).toBe('include');
      expect(response.data).toEqual(mockData);
    });

    it('should make POST request with body', async () => {
      const mockData = { user: { id: '1', email: 'test@example.com' } };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
      } as Response);

      const response = await api.login('test@example.com', 'password123');

      const callArgs = vi.mocked(fetch).mock.calls[0];
      expect(callArgs[0]).toContain('/api/auth/login');
      expect(callArgs[1]?.method).toBe('POST');
      expect(callArgs[1]?.body).toBe(JSON.stringify({ email: 'test@example.com', password: 'password123', role: undefined }));
      const headers = callArgs[1]?.headers as Headers;
      expect(headers?.get('Content-Type')).toBe('application/json');
      expect(response.data).toEqual(mockData);
    });

    it('should handle DELETE request without body', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ message: 'Deleted' }),
      } as Response);

      await api.deleteClass('class-123');

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const headers = callArgs[1]?.headers as Headers;
      expect(headers?.has('Content-Type')).toBe(false);
    });

    it('should handle non-JSON response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'text/plain' }),
        text: async () => 'Bad Request',
      } as Response);

      const response = await api.getCurrentUser();

      expect(response.error).toBe('Bad Request');
    });

    it('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const response = await api.getCurrentUser();

      expect(response.error).toBe('Network error');
    });

    it('should handle error response with details', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => ({ error: 'Validation failed', details: { field: 'email' } }),
      } as Response);

      const response = await api.login('invalid', 'password');

      expect(response.error).toBe('Validation failed');
      expect(response.details).toEqual({ field: 'email' });
    });
  });

  describe('Student endpoints', () => {
    it('should get student classes', async () => {
      const mockData = { classes: [{ id: '1', name: 'Math' }] };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
      } as Response);

      const response = await api.getStudentClasses();

      expect(response.data).toEqual(mockData);
    });

    it('should submit assignment', async () => {
      const mockData = { submission: { id: '1', content: 'Answer' } };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
      } as Response);

      const response = await api.submitAssignment('assignment-1', 'My answer');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/student/submissions'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ assignment_id: 'assignment-1', content: 'My answer' }),
        })
      );
      expect(response.data).toEqual(mockData);
    });
  });

  describe('Teacher endpoints', () => {
    it('should create class', async () => {
      const mockData = { class: { id: '1', name: 'Math 101' } };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
      } as Response);

      const response = await api.createClass('Math 101', 'Mathematics class');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/teacher/classes'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ name: 'Math 101', description: 'Mathematics class' }),
        })
      );
      expect(response.data).toEqual(mockData);
    });

    it('should add student to class', async () => {
      const mockData = { enrollment: { id: '1' } };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
      } as Response);

      const response = await api.addStudentToClass('class-1', 'student-1');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/teacher/classes/class-1/students/student-1'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(response.data).toEqual(mockData);
    });
  });

  describe('Admin endpoints', () => {
    it('should create user', async () => {
      const mockData = { user: { id: '1', email: 'user@example.com' } };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
      } as Response);

      const response = await api.createUser({
        email: 'user@example.com',
        name: 'User',
        role: 'student',
      });

      expect(response.data).toEqual(mockData);
    });

    it('should suspend user', async () => {
      const mockData = { user: { id: '1', suspended: true }, message: 'User suspended' };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
      } as Response);

      const response = await api.suspendUser('user-1');

      expect(response.data).toEqual(mockData);
    });
  });

  describe('Stats endpoints', () => {
    it('should get average grades', async () => {
      const mockData = { average_grade: 85.5, total_submissions: 10 };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
      } as Response);

      const response = await api.getAverageGrades();

      expect(response.data).toEqual(mockData);
    });

    it('should get class students', async () => {
      const mockData = { students: [{ id: '1', name: 'Student' }] };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
      } as Response);

      const response = await api.getClassStudents('class-1');

      expect(response.data).toEqual(mockData);
    });
  });
});

