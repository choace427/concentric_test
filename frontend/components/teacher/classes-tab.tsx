'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Multiselect, Option } from '@/components/ui/multiselect';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Edit,
  Trash2,
  Users,
  BookOpen,
  GraduationCap,
} from 'lucide-react';

interface Class {
  id: string;
  name: string;
  description: string | null;
  teacher_id: string;
  created_at: string;
  updated_at: string;
  student_count?: number;
}

interface Student {
  id: string;
  name: string;
  email: string;
}

export default function ClassesTab() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [classStudentsMap, setClassStudentsMap] = useState<
    Record<string, Student[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isManageStudentsOpen, setIsManageStudentsOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [managingClass, setManagingClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    selectedStudents: [] as string[],
  });
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const [classesRes, studentsRes] = await Promise.all([
          api.getTeacherClasses(),
          api.getStudentNames(),
        ]);

        if (classesRes.data?.classes) {
          setClasses(classesRes.data.classes);
        }
        if (studentsRes.data?.students) {
          setAllStudents(studentsRes.data.students);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      selectedStudents: [],
    });
    setEditingClass(null);
  };

  const handleOpenDialog = async (cls?: Class) => {
    if (cls) {
      setEditingClass(cls);
      setFormData({
        name: cls.name,
        description: cls.description || '',
        selectedStudents: [],
      });
      try {
        const response = await api.getClassStudents(cls.id);
        if (response.data?.students) {
          setFormData((prev) => ({
            ...prev,
            selectedStudents:
              response.data?.students.map((s: Student) => s.id) || [],
          }));
          setClassStudentsMap((prev) => ({
            ...prev,
            [cls.id]: response.data?.students as Student[],
          }));
        }
      } catch (error) {}
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !user) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      let classId: string | undefined;

      if (editingClass) {
        const response = await api.updateClass(
          editingClass.id,
          formData.name,
          formData.description
        );
        if (response.error) {
          toast({
            title: 'Error',
            description: response.error,
            variant: 'destructive',
          });
          return;
        }
        classId = editingClass.id;
        toast({
          title: 'Success',
          description: 'Class updated successfully',
        });
      } else {
        const response = await api.createClass(
          formData.name,
          formData.description
        );
        if (response.error) {
          toast({
            title: 'Error',
            description: response.error,
            variant: 'destructive',
          });
          return;
        }
        if (response.data?.class?.id) {
          classId = response.data.class.id;
        } else {
          const classesRes = await api.getTeacherClasses();
          if (classesRes.data?.classes) {
            const newClass = classesRes.data.classes.find(
              (c: Class) => c.name === formData.name
            );
            if (newClass) {
              classId = newClass.id;
            }
          }
        }
        toast({
          title: 'Success',
          description: 'Class created successfully',
        });
      }

      if (classId) {
        const currentStudentsRes = await api.getClassStudents(classId);
        const currentStudentIds =
          currentStudentsRes.data?.students?.map((s: Student) => s.id) || [];

        const studentsToAdd = formData.selectedStudents.filter(
          (id) => !currentStudentIds.includes(id)
        );
        for (const studentId of studentsToAdd) {
          await api.addStudentToClass(classId, studentId);
        }

        const studentsToRemove = currentStudentIds.filter(
          (id: string) => !formData.selectedStudents.includes(id)
        );
        for (const studentId of studentsToRemove) {
          await api.removeStudentFromClass(classId, studentId);
        }
      }

      const classesRes = await api.getTeacherClasses();
      if (classesRes.data?.classes) {
        setClasses(classesRes.data.classes);
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save class',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await api.deleteClass(id);
      if (response.error) {
        toast({
          title: 'Error',
          description: response.error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Class deleted successfully',
      });

      const classesRes = await api.getTeacherClasses();
      if (classesRes.data?.classes) {
        setClasses(classesRes.data.classes);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete class',
        variant: 'destructive',
      });
    }
  };

  const handleManageStudents = async (cls: Class) => {
    setManagingClass(cls);
    setIsManageStudentsOpen(true);

    try {
      const response = await api.getClassStudents(cls.id);
      if (response.data?.students) {
        setClassStudentsMap((prev) => ({
          ...prev,
          [cls.id]: response.data?.students as Student[],
        }));
      }
    } catch (error) {}
  };

  const handleAddStudent = async (studentId: string) => {
    if (!managingClass) return;

    try {
      const response = await api.addStudentToClass(managingClass.id, studentId);
      if (response.error) {
        toast({
          title: 'Error',
          description: response.error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Student added to class',
      });

      const studentsRes = await api.getClassStudents(managingClass.id);
      if (studentsRes.data?.students) {
        setClassStudentsMap((prev) => ({
          ...prev,
          [managingClass.id]: studentsRes.data?.students as Student[],
        }));
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to add student',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!managingClass) return;

    try {
      const response = await api.removeStudentFromClass(
        managingClass.id,
        studentId
      );
      if (response.error) {
        toast({
          title: 'Error',
          description: response.error,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Student removed from class',
      });

      const studentsRes = await api.getClassStudents(managingClass.id);
      if (studentsRes.data?.students) {
        setClassStudentsMap((prev) => ({
          ...prev,
          [managingClass.id]: studentsRes.data?.students || [],
        }));
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to remove student',
        variant: 'destructive',
      });
    }
  };

  const studentOptions: Option[] = allStudents.map((student) => ({
    label: `${student.name} (${student.email})`,
    value: student.id,
  }));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading classes...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-2 text-white">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h2 className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-3xl font-bold text-transparent">
              My Classes
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Manage your classes and students
            </p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Class
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {editingClass ? 'Edit Class' : 'Create New Class'}
              </DialogTitle>
              <DialogDescription>
                {editingClass
                  ? 'Update class information and manage students.'
                  : 'Create a new class and add students in one step.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base font-semibold">
                  Class Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Mathematics 101"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="description"
                  className="text-base font-semibold"
                >
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Enter class description..."
                  className="min-h-[4rem]"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold">Students</Label>
                <Multiselect
                  options={studentOptions}
                  selected={formData.selectedStudents}
                  onChange={(selected) =>
                    setFormData({ ...formData, selectedStudents: selected })
                  }
                  placeholder="Select students to add to this class..."
                />
                <p className="text-muted-foreground mt-1 text-xs">
                  {formData.selectedStudents.length} student
                  {formData.selectedStudents.length !== 1 ? 's' : ''} selected
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {editingClass ? 'Update Class' : 'Create Class'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {classes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GraduationCap className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">No classes yet</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Create your first class to get started
            </p>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Class
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <Card
              key={cls.id}
              className="hover:border-primary/50 group overflow-hidden border-2 transition-all duration-300 hover:shadow-xl"
            >
              <div className="h-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="group-hover:text-primary mb-2 text-xl transition-colors">
                      {cls.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 min-h-[3rem]">
                      {cls.description || 'No description provided'}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="bg-muted/50 flex items-center gap-2 rounded-lg p-3">
                    <Users className="text-primary h-5 w-5" />
                    <div>
                      <p className="text-sm font-semibold">
                        {cls.student_count ??
                          classStudentsMap[cls.id]?.length ??
                          0}
                        <span className="text-muted-foreground ml-1 font-normal">
                          {cls.student_count === 1 ? 'student' : 'students'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 border-t pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenDialog(cls)}
                      className="flex-1"
                    >
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleManageStudents(cls)}
                      className="flex-1"
                    >
                      <Users className="mr-2 h-4 w-4" />
                      Manage
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(cls.id)}
                      className="text-red-600 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={isManageStudentsOpen}
        onOpenChange={setIsManageStudentsOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              Manage Students - {managingClass?.name}
            </DialogTitle>
            <DialogDescription>
              Add or remove students from this class using the multiselect below
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Students</Label>
              <Multiselect
                options={studentOptions}
                selected={
                  managingClass
                    ? classStudentsMap[managingClass.id]?.map((s) => s.id) || []
                    : []
                }
                onChange={async (selected) => {
                  if (!managingClass) return;

                  const currentStudentIds =
                    classStudentsMap[managingClass.id]?.map((s) => s.id) || [];

                  const studentsToAdd = selected.filter(
                    (id) => !currentStudentIds.includes(id)
                  );
                  for (const studentId of studentsToAdd) {
                    await handleAddStudent(studentId);
                  }

                  const studentsToRemove = currentStudentIds.filter(
                    (id) => !selected.includes(id)
                  );
                  for (const studentId of studentsToRemove) {
                    await handleRemoveStudent(studentId);
                  }
                }}
                placeholder="Select students for this class..."
              />
              <p className="text-muted-foreground mt-1 text-xs">
                {managingClass
                  ? classStudentsMap[managingClass.id]?.length || 0
                  : 0}{' '}
                student
                {(classStudentsMap[managingClass?.id || '']?.length || 0) !== 1
                  ? 's'
                  : ''}{' '}
                currently enrolled
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsManageStudentsOpen(false)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
