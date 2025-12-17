# Supabase Database Setup

## Project Information

- **Project ID**: `retdeavipeqdeugirrri`
- **Project Name**: `concentrate-quiz`
- **Region**: `us-east-1`
- **Status**: `ACTIVE_HEALTHY`
- **Database Version**: PostgreSQL 17.6.1.062

## Database Schema

### Tables Created

1. **teacher_groups** - Teacher department/group information
2. **users** - All users (admin, teachers, students)
3. **classes** - Class/course information
4. **class_students** - Junction table for many-to-many relationship between classes and students
5. **assignments** - Assignment information
6. **submissions** - Student submissions with grades and feedback

### Table Structures

#### teacher_groups
- `id` (UUID, Primary Key)
- `name` (VARCHAR(255))
- `description` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### users
- `id` (UUID, Primary Key)
- `email` (VARCHAR(255), Unique)
- `name` (VARCHAR(255))
- `role` (VARCHAR(20), CHECK: 'admin', 'teacher', 'student')
- `suspended` (BOOLEAN, Default: FALSE)
- `teacher_group_id` (UUID, Foreign Key → teacher_groups.id)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### classes
- `id` (UUID, Primary Key)
- `name` (VARCHAR(255))
- `description` (TEXT)
- `teacher_id` (UUID, Foreign Key → users.id)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### class_students
- `id` (UUID, Primary Key)
- `class_id` (UUID, Foreign Key → classes.id)
- `student_id` (UUID, Foreign Key → users.id)
- `enrolled_at` (TIMESTAMP)
- Unique constraint on (class_id, student_id)

#### assignments
- `id` (UUID, Primary Key)
- `class_id` (UUID, Foreign Key → classes.id)
- `title` (VARCHAR(255))
- `description` (TEXT)
- `due_date` (DATE)
- `published` (BOOLEAN, Default: FALSE)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### submissions
- `id` (UUID, Primary Key)
- `assignment_id` (UUID, Foreign Key → assignments.id)
- `student_id` (UUID, Foreign Key → users.id)
- `content` (TEXT)
- `submitted_at` (TIMESTAMP)
- `grade` (INTEGER, CHECK: 0-100)
- `feedback` (TEXT)
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

## Data Summary

All tables have been populated with **10 records each**:

- ✅ **teacher_groups**: 10 groups (Mathematics, Science, English, History, Arts, PE, Computer Science, Foreign Languages, Chemistry, Physics)
- ✅ **users**: 10 users (1 admin, 4 teachers, 5 students)
- ✅ **classes**: 10 classes (Algebra 101, Biology 101, English Literature, Computer Science 101, Calculus 201, Chemistry Lab, World History, Data Structures, Geometry 101, Physics 201)
- ✅ **class_students**: 10 enrollment relationships
- ✅ **assignments**: 10 assignments (various subjects)
- ✅ **submissions**: 10 submissions (some with grades and feedback)

## Sample Data

### Users
- Admin: `admin@school.com`
- Teachers: `teacher1@school.com`, `teacher2@school.com`, `teacher3@school.com`, `teacher4@school.com`
- Students: `student1@school.com`, `student2@school.com`, `student3@school.com`, `student4@school.com`, `student5@school.com`

### Teacher Groups
- Mathematics Department
- Science Department
- English Department
- History Department
- Arts Department
- Physical Education
- Computer Science
- Foreign Languages
- Chemistry Department
- Physics Department

## Indexes Created

For better query performance, indexes have been created on:
- `users.email`
- `users.role`
- `classes.teacher_id`
- `class_students.class_id`
- `class_students.student_id`
- `assignments.class_id`
- `submissions.assignment_id`
- `submissions.student_id`

## Migration

The schema was created using a migration named: `create_school_portal_schema`

## Next Steps

1. Connect your backend to this Supabase project
2. Use the Supabase client libraries to interact with the database
3. Implement authentication using Supabase Auth
4. Set up Row Level Security (RLS) policies for data access control
5. Create API endpoints that query these tables

## Connection Details

- **Database Host**: `db.retdeavipeqdeugirrri.supabase.co`
- **Connection Pooling**: Available via Supabase dashboard
- **API URL**: Available via `mcp_supabase_get_project_url`

To get the project URL and API keys:
```typescript
// Use Supabase MCP tools or Supabase dashboard
```

