'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Plus,
  Edit,
  Trash2,
  Send,
  FileText,
  Calendar,
  BookOpen,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface Class {
  id: string;
  name: string;
  description: string | null;
}

interface Assignment {
  id: string;
  class_id: string;
  title: string;
  description: string | null;
  due_date: string;
  published: boolean;
  created_at: string;
  updated_at: string;
}

export default function AssignmentsTab() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<Assignment | null>(
    null
  );
  const [formData, setFormData] = useState({
    classId: '',
    title: '',
    description: '',
    dueDate: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const [classesRes, assignmentsRes] = await Promise.all([
          api.getTeacherClasses(),
          api.getTeacherAssignments(),
        ]);

        if (classesRes.data?.classes) {
          setClasses(classesRes.data.classes);
        }
        if (assignmentsRes.data?.assignments) {
          setAssignments(assignmentsRes.data.assignments);
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
      classId: '',
      title: '',
      description: '',
      dueDate: '',
    });
    setEditingAssignment(null);
  };

  const handleOpenDialog = (assignment?: Assignment) => {
    if (assignment) {
      setEditingAssignment(assignment);
      setFormData({
        classId: assignment.class_id,
        title: assignment.title,
        description: assignment.description || '',
        dueDate: assignment.due_date,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.classId || !formData.title || !formData.dueDate) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingAssignment) {
        const response = await api.updateAssignment(editingAssignment.id, {
          class_id: formData.classId,
          title: formData.title,
          description: formData.description || undefined,
          due_date: formData.dueDate,
        });

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
          description: 'Assignment updated successfully',
        });
      } else {
        const response = await api.createAssignment(
          formData.classId,
          formData.title,
          formData.description,
          formData.dueDate
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
          description: 'Assignment created successfully',
        });
      }

      const assignmentsRes = await api.getTeacherAssignments();
      if (assignmentsRes.data?.assignments) {
        setAssignments(assignmentsRes.data.assignments);
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save assignment',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await api.deleteAssignment(id);
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
        description: 'Assignment deleted successfully',
      });

      const assignmentsRes = await api.getTeacherAssignments();
      if (assignmentsRes.data?.assignments) {
        setAssignments(assignmentsRes.data.assignments);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete assignment',
        variant: 'destructive',
      });
    }
  };

  const handlePublish = async (id: string) => {
    try {
      const response = await api.publishAssignment(id);
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
        description: 'Assignment published successfully',
      });

      const assignmentsRes = await api.getTeacherAssignments();
      if (assignmentsRes.data?.assignments) {
        setAssignments(assignmentsRes.data.assignments);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to publish assignment',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading assignments...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 p-2 text-white">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h2 className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-3xl font-bold text-transparent">
              Assignments
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Create and manage assignments for your classes
            </p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 shadow-lg hover:from-teal-700 hover:to-cyan-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {editingAssignment
                  ? 'Edit Assignment'
                  : 'Create New Assignment'}
              </DialogTitle>
              <DialogDescription>
                {editingAssignment
                  ? 'Update assignment information below.'
                  : 'Create a new assignment for your class.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="class">Class</Label>
                <Select
                  value={formData.classId}
                  onValueChange={(value) =>
                    setFormData({ ...formData, classId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="min-h-[6rem]"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {assignments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">No assignments yet</h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Create your first assignment to get started
            </p>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Assignment
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {assignments.map((assignment) => {
            const classInfo = classes.find((c) => c.id === assignment.class_id);
            return (
              <Card
                key={assignment.id}
                className="hover:border-primary/50 group overflow-hidden border-2 transition-all duration-300 hover:shadow-xl"
              >
                <div
                  className={`h-2 ${
                    assignment.published
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                      : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                  }`}
                ></div>
                <CardHeader>
                  <CardTitle className="group-hover:text-primary mb-2 line-clamp-2 text-xl transition-colors">
                    {assignment.title}
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    {classInfo?.name || 'Unknown'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-muted/50 flex items-center gap-2 rounded-lg p-3">
                      <Calendar className="text-primary h-5 w-5" />
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Due Date
                        </p>
                        <p className="text-sm font-semibold">
                          {new Date(assignment.due_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t pt-2">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                          assignment.published
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                        }`}
                      >
                        {assignment.published ? 'Published' : 'Draft'}
                      </span>

                      <div className="flex items-center gap-2">
                        {!assignment.published && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePublish(assignment.id)}
                            className="border-0 bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700"
                          >
                            <Send className="mr-2 h-4 w-4" />
                            Publish
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(assignment)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(assignment.id)}
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
