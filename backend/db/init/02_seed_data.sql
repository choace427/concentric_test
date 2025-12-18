-- Seed teacher groups
INSERT INTO teacher_groups (id, name, description, created_at, updated_at) VALUES
    ('550e8400-e29b-41d4-a716-446655440001', 'Mathematics Department', 'Department of Mathematics and Statistics', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('550e8400-e29b-41d4-a716-446655440002', 'Science Department', 'Department of Natural Sciences', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('550e8400-e29b-41d4-a716-446655440003', 'English Department', 'Department of English Language and Literature', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Seed users (admin, teachers, students)
INSERT INTO users (id, email, name, role, suspended, teacher_group_id, created_at, updated_at) VALUES
    -- Admin user
    ('650e8400-e29b-41d4-a716-446655440001', 'admin@school.com', 'Admin User', 'admin', FALSE, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- Teacher users
    ('650e8400-e29b-41d4-a716-446655440002', 'teacher1@school.com', 'John Smith', 'teacher', FALSE, '550e8400-e29b-41d4-a716-446655440001', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('650e8400-e29b-41d4-a716-446655440003', 'teacher2@school.com', 'Sarah Johnson', 'teacher', FALSE, '550e8400-e29b-41d4-a716-446655440002', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('650e8400-e29b-41d4-a716-446655440004', 'teacher3@school.com', 'Michael Brown', 'teacher', FALSE, '550e8400-e29b-41d4-a716-446655440003', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    
    -- Student users
    ('650e8400-e29b-41d4-a716-446655440005', 'student1@school.com', 'Alice Williams', 'student', FALSE, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('650e8400-e29b-41d4-a716-446655440006', 'student2@school.com', 'Bob Davis', 'student', FALSE, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('650e8400-e29b-41d4-a716-446655440007', 'student3@school.com', 'Charlie Miller', 'student', FALSE, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('650e8400-e29b-41d4-a716-446655440008', 'student4@school.com', 'Diana Wilson', 'student', FALSE, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('650e8400-e29b-41d4-a716-446655440009', 'student5@school.com', 'Ethan Moore', 'student', FALSE, NULL, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (email) DO NOTHING;

-- Seed classes
INSERT INTO classes (id, name, description, teacher_id, created_at, updated_at) VALUES
    ('750e8400-e29b-41d4-a716-446655440001', 'Algebra 101', 'Introduction to Algebra', '650e8400-e29b-41d4-a716-446655440002', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('750e8400-e29b-41d4-a716-446655440002', 'Biology 101', 'Introduction to Biology', '650e8400-e29b-41d4-a716-446655440003', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('750e8400-e29b-41d4-a716-446655440003', 'English Literature', 'Classic English Literature', '650e8400-e29b-41d4-a716-446655440004', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Seed class_students (enrollments)
INSERT INTO class_students (id, class_id, student_id, enrolled_at) VALUES
    ('850e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440005', CURRENT_TIMESTAMP),
    ('850e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440006', CURRENT_TIMESTAMP),
    ('850e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440007', CURRENT_TIMESTAMP),
    ('850e8400-e29b-41d4-a716-446655440004', '750e8400-e29b-41d4-a716-446655440002', '650e8400-e29b-41d4-a716-446655440008', CURRENT_TIMESTAMP),
    ('850e8400-e29b-41d4-a716-446655440005', '750e8400-e29b-41d4-a716-446655440003', '650e8400-e29b-41d4-a716-446655440009', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Seed assignments
INSERT INTO assignments (id, class_id, title, description, due_date, published, created_at, updated_at) VALUES
    ('950e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440001', 'Linear Equations Homework', 'Complete exercises 1-20 on linear equations', CURRENT_DATE + INTERVAL '7 days', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('950e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440002', 'Cell Biology Quiz', 'Study chapters 1-3 for the quiz', CURRENT_DATE + INTERVAL '3 days', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
    ('950e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440003', 'Shakespeare Essay', 'Write a 1000-word essay on Hamlet', CURRENT_DATE + INTERVAL '14 days', FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

-- Seed submissions (optional - some students have submitted work)
INSERT INTO submissions (id, assignment_id, student_id, content, submitted_at, grade, feedback, created_at, updated_at) VALUES
    ('a50e8400-e29b-41d4-a716-446655440001', '950e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440005', 'Completed all exercises. Answers attached.', CURRENT_TIMESTAMP - INTERVAL '2 days', 95, 'Excellent work! Great understanding of linear equations.', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '1 day'),
    ('a50e8400-e29b-41d4-a716-446655440002', '950e8400-e29b-41d4-a716-446655440001', '650e8400-e29b-41d4-a716-446655440006', 'Completed exercises 1-15. Still working on the rest.', CURRENT_TIMESTAMP - INTERVAL '1 day', 75, 'Good progress. Please complete the remaining exercises.', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO NOTHING;

