'use client';

import { useState, useEffect } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Trash2, Users, Building2, Info } from 'lucide-react';

interface TeacherGroup {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export default function TeacherGroupsTab() {
  const [teacherGroups, setTeacherGroups] = useState<TeacherGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<TeacherGroup | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });
  const { toast } = useToast();

  useEffect(() => {
    const fetchGroups = async () => {
      setLoading(true);
      try {
        const response = await api.getTeacherGroups();
        if (response.data?.groups) {
          setTeacherGroups(response.data.groups);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
    });
    setEditingGroup(null);
  };

  const handleOpenDialog = (group?: TeacherGroup) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        name: group.name,
        description: group.description || '',
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name) {
      toast({
        title: 'Error',
        description: 'Please fill in the name',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingGroup) {
        const response = await api.updateTeacherGroup(
          editingGroup.id,
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
        toast({
          title: 'Success',
          description: 'Teacher group updated successfully',
        });
      } else {
        const response = await api.createTeacherGroup(
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
        toast({
          title: 'Success',
          description: 'Teacher group created successfully',
        });
      }

      // Refresh groups
      const groupsRes = await api.getTeacherGroups();
      if (groupsRes.data?.groups) {
        setTeacherGroups(groupsRes.data.groups);
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save teacher group',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        'Are you sure you want to delete this teacher group? Teachers assigned to this group will have their group assignment removed.'
      )
    ) {
      return;
    }

    try {
      const response = await api.deleteTeacherGroup(id);
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
        description: 'Teacher group deleted successfully',
      });

      // Refresh groups
      const groupsRes = await api.getTeacherGroups();
      if (groupsRes.data?.groups) {
        setTeacherGroups(groupsRes.data.groups);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete teacher group',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading teacher groups...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-gradient-to-br from-blue-500 to-cyan-600 p-2 text-white">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h2 className="bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-3xl font-bold text-transparent">
              Teacher Groups
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Organize teachers into departments or groups
            </p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 shadow-lg hover:from-blue-700 hover:to-cyan-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {editingGroup
                  ? 'Edit Teacher Group'
                  : 'Create New Teacher Group'}
              </DialogTitle>
              <DialogDescription>
                {editingGroup
                  ? 'Update teacher group information below.'
                  : 'Create a new group to organize teachers (e.g., Math Department, Science Department).'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base font-semibold">
                  Group Name *
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="e.g., Math Department, Science Department"
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
                  placeholder="Describe the purpose of this group..."
                  className="min-h-[4rem]"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Groups Grid */}
      {teacherGroups.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">
              No teacher groups yet
            </h3>
            <p className="text-muted-foreground mb-4 text-sm">
              Create your first teacher group to organize teachers
            </p>
            <Button
              onClick={() => handleOpenDialog()}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {teacherGroups.map((group) => (
            <Card
              key={group.id}
              className="hover:border-primary/50 group overflow-hidden border-2 transition-all duration-300 hover:shadow-xl"
            >
              <div className="h-2 bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500"></div>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex flex-1 items-center gap-3">
                    <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                      <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <CardTitle className="group-hover:text-primary text-xl transition-colors">
                      {group.name}
                    </CardTitle>
                  </div>
                </div>
                {group.description && (
                  <CardDescription className="mt-2 line-clamp-2">
                    {group.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 border-t pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenDialog(group)}
                    className="flex-1"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(group.id)}
                    className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-muted-foreground mt-3 text-xs">
                  Created: {new Date(group.created_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
