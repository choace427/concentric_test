# Backend API - Complete Setup Guide

## Overview

The backend is built with **Fastify 5.x**, **TypeScript**, **Kysely ORM**, and connects to **Supabase PostgreSQL**. All API routes are protected with JWT authentication using HTTP-only cookies.

## Quick Start

1. **Navigate to backend directory:**
```bash
cd backend
```

2. **Install dependencies:**
```bash
npm install
```

3. **Set up environment variables:**
```bash
cp .env.example .env
```

4. **Update `.env` file with your credentials:**
   - Get Supabase database password from Supabase dashboard
   - Set a strong JWT_SECRET (minimum 32 characters)
   - Configure Redis connection (if using)

5. **Run development server:**
```bash
npm run dev
```

The server will start on `http://localhost:3001`

## API Endpoints

### Authentication
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout  
- `GET /api/auth/me` - Get current user

### Admin Routes (`/api/admin`)
- Teacher Groups: CRUD operations
- Users: CRUD operations
- Suspend/Unsuspend users

### Teacher Routes (`/api/teacher`)
- Classes: CRUD operations
- Add/Remove students from classes
- Assignments: CRUD operations
- Publish assignments
- Grade submissions

### Student Routes (`/api/student`)
- View enrolled classes
- View assignments
- Submit assignments
- View grades

### Statistics API (`/api/v0/stats`)
- Average grades (all classes or specific class)
- Teacher names
- Student names
- Classes list
- Students in a class

## Database Connection

The backend connects to Supabase PostgreSQL. Make sure you have:
1. Database password from Supabase dashboard
2. Correct database host in `.env`
3. SSL enabled for production

## Authentication Flow

1. User logs in via `POST /api/auth/login`
2. Server generates JWT token
3. Token is set as HTTP-only cookie
4. All subsequent requests include the cookie automatically
5. Middleware validates token and extracts user info

## Testing

```bash
npm test              # Run tests
npm run test:coverage # Run with coverage
```

## Production Build

```bash
npm run build  # Compile TypeScript
npm start      # Run production server
```

## Project Structure

```
backend/
├── src/
│   ├── config/        # Database, Redis, Environment
│   ├── middleware/    # Auth middleware
│   ├── routes/        # API route handlers
│   ├── types/         # TypeScript types
│   ├── utils/         # Utility functions
│   └── server.ts      # Fastify server
├── .env.example
├── package.json
└── tsconfig.json
```

## Dependencies Updated

- `@fastify/cookie`: Updated to `^10.0.0` (compatible with Fastify 5.x)
- `@fastify/cors`: Updated to `^10.0.0` (compatible with Fastify 5.x)
- `fastify`: `^5.2.0` (latest stable)

All other dependencies match the requirements from the root `package.json`.

