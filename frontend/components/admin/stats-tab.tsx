'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  TrendingUp,
  Users,
  GraduationCap,
  BookOpen,
  Award,
  BarChart3,
  UserCheck,
} from 'lucide-react';

interface AverageGrades {
  average_grade: number;
  total_submissions: number;
}

interface ClassAverageGrades extends AverageGrades {
  class_id: string;
}

interface Teacher {
  id: string;
  name: string;
  email: string;
}

interface Student {
  id: string;
  name: string;
  email: string;
}

interface Class {
  id: string;
  name: string;
  description: string | null;
  teacher_id: string;
  teacher_name: string;
}

interface ClassStudents {
  class_id: string;
  students: Array<{
    id: string;
    name: string;
    email: string;
    enrolled_at: string;
  }>;
}

export default function StatsTab() {
  const [loading, setLoading] = useState(true);
  const [averageGrades, setAverageGrades] = useState<AverageGrades | null>(
    null
  );
  const [classAverageGrades, setClassAverageGrades] =
    useState<ClassAverageGrades | null>(null);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [classStudents, setClassStudents] = useState<ClassStudents | null>(
    null
  );
  const [selectedClassId, setSelectedClassId] = useState<string>('');

  useEffect(() => {
    const fetchAllStats = async () => {
      setLoading(true);
      try {
        const [avgGradesRes, teachersRes, studentsRes, classesRes] =
          await Promise.all([
            api.getAverageGrades(),
            api.getTeacherNames(),
            api.getStudentNames(),
            api.getClasses(),
          ]);

        if (avgGradesRes.data) {
          setAverageGrades(avgGradesRes.data);
        }
        if (teachersRes.data?.teachers) {
          setTeachers(teachersRes.data.teachers);
        }
        if (studentsRes.data?.students) {
          setStudents(studentsRes.data.students);
        }
        if (classesRes.data?.classes) {
          setClasses(classesRes.data.classes);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchAllStats();
  }, []);

  const handleClassSelect = async (classId: string) => {
    setSelectedClassId(classId);
    try {
      const [avgRes, studentsRes] = await Promise.all([
        api.getAverageGradesByClass(classId),
        api.getClassStudents(classId),
      ]);

      if (avgRes.data) {
        setClassAverageGrades(avgRes.data);
      }
      if (studentsRes.data) {
        setClassStudents({
          class_id: classId,
          students: studentsRes.data.students as Array<{
            id: string;
            name: string;
            email: string;
            enrolled_at: string;
          }>,
        });
      }
    } catch (error) {}
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 90) return 'text-green-600 dark:text-green-400';
    if (grade >= 80) return 'text-blue-600 dark:text-blue-400';
    if (grade >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading statistics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 p-2 text-white">
          <BarChart3 className="h-6 w-6" />
        </div>
        <div>
          <h2 className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-3xl font-bold text-transparent">
            School Statistics
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            View comprehensive analytics and metrics
          </p>
        </div>
      </div>

      {/* Overall Statistics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-2 transition-all duration-300 hover:shadow-xl">
          <div className="h-2 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4" />
              Average Grade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-3xl font-bold ${getGradeColor(averageGrades?.average_grade || 0)}`}
            >
              {averageGrades?.average_grade.toFixed(1) || '0.0'}%
            </div>
            <p className="text-muted-foreground mt-1 text-xs">
              {averageGrades?.total_submissions || 0} submissions
            </p>
          </CardContent>
        </Card>

        <Card className="border-2 transition-all duration-300 hover:shadow-xl">
          <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
              <UserCheck className="h-4 w-4" />
              Teachers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-primary text-3xl font-bold">
              {teachers.length}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">Total teachers</p>
          </CardContent>
        </Card>

        <Card className="border-2 transition-all duration-300 hover:shadow-xl">
          <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
              <Users className="h-4 w-4" />
              Students
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-primary text-3xl font-bold">
              {students.length}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">Total students</p>
          </CardContent>
        </Card>

        <Card className="border-2 transition-all duration-300 hover:shadow-xl">
          <div className="h-2 bg-gradient-to-r from-orange-500 to-red-500"></div>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground flex items-center gap-2 text-sm font-medium">
              <BookOpen className="h-4 w-4" />
              Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-primary text-3xl font-bold">
              {classes.length}
            </div>
            <p className="text-muted-foreground mt-1 text-xs">Total classes</p>
          </CardContent>
        </Card>
      </div>

      {/* Class-Specific Statistics */}
      <Card className="border-2">
        <div className="h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        <CardHeader>
          <CardTitle className="text-2xl">Class-Specific Statistics</CardTitle>
          <CardDescription>
            View detailed statistics for a specific class
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="class-select" className="text-base font-semibold">
              Select Class
            </Label>
            <Select value={selectedClassId} onValueChange={handleClassSelect}>
              <SelectTrigger id="class-select" className="w-full">
                <SelectValue placeholder="Choose a class to view statistics" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} - {cls.teacher_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedClassId && classAverageGrades && (
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-2">
                <div className="h-2 bg-gradient-to-r from-blue-500 to-cyan-500"></div>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Award className="h-5 w-5" />
                    Class Average Grade
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div
                    className={`text-4xl font-bold ${getGradeColor(classAverageGrades.average_grade)}`}
                  >
                    {classAverageGrades.average_grade.toFixed(1)}%
                  </div>
                  <p className="text-muted-foreground mt-2 text-sm">
                    Based on {classAverageGrades.total_submissions} graded
                    submissions
                  </p>
                </CardContent>
              </Card>

              {classStudents && (
                <Card className="border-2">
                  <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500"></div>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="h-5 w-5" />
                      Enrolled Students
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-primary text-4xl font-bold">
                      {classStudents.students.length}
                    </div>
                    <p className="text-muted-foreground mt-2 text-sm">
                      Students in this class
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {selectedClassId && classStudents && (
            <Card className="border-2">
              <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500"></div>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <GraduationCap className="h-5 w-5" />
                  Student List
                </CardTitle>
                <CardDescription>
                  All students enrolled in the selected class
                </CardDescription>
              </CardHeader>
              <CardContent>
                {classStudents.students.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center">
                    No students enrolled
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {classStudents.students.map((student) => (
                      <div
                        key={student.id}
                        className="bg-muted/50 hover:bg-muted rounded-lg border p-3 transition-colors"
                      >
                        <p className="font-semibold">{student.name}</p>
                        <p className="text-muted-foreground text-sm">
                          {student.email}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          Enrolled:{' '}
                          {new Date(student.enrolled_at).toLocaleDateString()}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Teachers List */}
      <Card className="border-2">
        <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500"></div>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <UserCheck className="h-5 w-5" />
            All Teachers
          </CardTitle>
          <CardDescription>
            Complete list of all teachers in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teachers.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No teachers found
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="bg-muted/50 hover:bg-muted rounded-lg border p-3 transition-colors"
                >
                  <p className="font-semibold">{teacher.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {teacher.email}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Students List */}
      <Card className="border-2">
        <div className="h-2 bg-gradient-to-r from-green-500 to-emerald-500"></div>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5" />
            All Students
          </CardTitle>
          <CardDescription>
            Complete list of all students in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No students found
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {students.map((student) => (
                <div
                  key={student.id}
                  className="bg-muted/50 hover:bg-muted rounded-lg border p-3 transition-colors"
                >
                  <p className="font-semibold">{student.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {student.email}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Classes List */}
      <Card className="border-2">
        <div className="h-2 bg-gradient-to-r from-orange-500 to-red-500"></div>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5" />
            All Classes
          </CardTitle>
          <CardDescription>
            Complete list of all classes in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No classes found
            </p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {classes.map((cls) => (
                <Card
                  key={cls.id}
                  className="hover:border-primary/50 group border-2 transition-all duration-300 hover:shadow-lg"
                >
                  <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                  <CardHeader>
                    <CardTitle className="text-lg">{cls.name}</CardTitle>
                    <CardDescription className="line-clamp-2">
                      {cls.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 text-sm">
                      <UserCheck className="text-muted-foreground h-4 w-4" />
                      <span className="text-muted-foreground">
                        Teacher: {cls.teacher_name}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
