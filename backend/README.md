# Backend API - Concentrate School Portal

Fastify-based backend API for the Concentrate School Portal.

## Tech Stack

- **Framework**: Fastify 5.x
- **Language**: TypeScript
- **Database**: PostgreSQL (via Supabase) with Kysely ORM
- **Caching**: Redis (ioredis)
- **Authentication**: JWT with HTTP-only cookies
- **Validation**: Zod

## Setup

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
   - Database credentials (Supabase)
   - JWT secret (minimum 32 characters)
   - Redis connection details
   - OAuth credentials (optional)

4. Run development server:
```bash
npm run dev
```

5. Build for production:
```bash
npm run build
npm start
```

## API Endpoints

### Authentication (`/api/auth`)
- `POST /api/auth/login` - Login with email/password
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user (protected)

### Admin Routes (`/api/admin`)
All routes require `admin` role.

- `GET /api/admin/teacher-groups` - List all teacher groups
- `POST /api/admin/teacher-groups` - Create teacher group
- `PUT /api/admin/teacher-groups/:id` - Update teacher group
- `DELETE /api/admin/teacher-groups/:id` - Delete teacher group
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create user
- `PUT /api/admin/users/:id` - Update user
- `DELETE /api/admin/users/:id` - Delete user
- `POST /api/admin/users/:id/suspend` - Suspend user
- `POST /api/admin/users/:id/unsuspend` - Unsuspend user

### Teacher Routes (`/api/teacher`)
All routes require `teacher` role.

- `GET /api/teacher/classes` - List teacher's classes
- `POST /api/teacher/classes` - Create class
- `PUT /api/teacher/classes/:id` - Update class
- `DELETE /api/teacher/classes/:id` - Delete class
- `POST /api/teacher/classes/:id/students/:studentId` - Add student to class
- `DELETE /api/teacher/classes/:id/students/:studentId` - Remove student from class
- `GET /api/teacher/assignments` - List teacher's assignments
- `POST /api/teacher/assignments` - Create assignment
- `PUT /api/teacher/assignments/:id` - Update assignment
- `DELETE /api/teacher/assignments/:id` - Delete assignment
- `POST /api/teacher/assignments/:id/publish` - Publish assignment
- `GET /api/teacher/assignments/:id/submissions` - Get submissions for assignment
- `PUT /api/teacher/assignments/:assignmentId/submissions/:submissionId/grade` - Grade submission

### Student Routes (`/api/student`)
All routes require `student` role.

- `GET /api/student/classes` - List enrolled classes
- `GET /api/student/assignments` - List available assignments
- `POST /api/student/submissions` - Submit assignment
- `GET /api/student/grades` - Get grades and feedback

### Statistics API (`/api/v0/stats`)
All routes require authentication.

- `GET /api/v0/stats/average-grades` - Average grade across all classes
- `GET /api/v0/stats/average-grades/:id` - Average grade for specific class
- `GET /api/v0/stats/teacher-names` - List all teacher names
- `GET /api/v0/stats/student-names` - List all student names
- `GET /api/v0/stats/classes` - List all classes
- `GET /api/v0/stats/classes/:id` - List students in a class

## Authentication

All protected routes require a JWT token stored in an HTTP-only cookie named `token`.

The token is set automatically on successful login and cleared on logout.

## Database Connection

The backend connects to Supabase PostgreSQL database. Make sure to:
1. Get your database password from Supabase dashboard
2. Set `DB_PASSWORD` or `SUPABASE_DB_PASSWORD` in `.env`
3. Ensure the database host is correct

## Testing

Run tests:
```bash
npm test
```

Run tests with coverage:
```bash
npm run test:coverage
```

## Environment Variables

See `.env.example` for all required environment variables.

## Project Structure

```
backend/
├── src/
│   ├── config/
│   │   ├── database.ts    # Kysely database connection
│   │   ├── redis.ts       # Redis connection
│   │   └── env.ts         # Environment validation
│   ├── middleware/
│   │   └── auth.ts        # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.ts        # Authentication routes
│   │   ├── admin.ts       # Admin routes
│   │   ├── teacher.ts     # Teacher routes
│   │   ├── student.ts     # Student routes
│   │   └── stats.ts       # Statistics API routes
│   ├── types/
│   │   └── database.ts    # Kysely database types
│   ├── utils/
│   │   └── jwt.ts         # JWT utilities
│   └── server.ts          # Fastify server setup
├── .env.example
├── package.json
├── tsconfig.json
└── README.md
```

