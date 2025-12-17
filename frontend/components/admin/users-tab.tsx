'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  Ban, 
  CheckCircle, 
  Users, 
  UserCheck,
  GraduationCap,
  Shield,
  Filter,
  X
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
  suspended: boolean;
  teacher_group_id: string | null;
}

interface TeacherGroup {
  id: string;
  name: string;
  description: string | null;
}

export default function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [teacherGroups, setTeacherGroups] = useState<TeacherGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'teacher' | 'student'>('all');
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: undefined as 'admin' | 'teacher' | 'student' | undefined,
    teacherGroupId: undefined as string | undefined,
  });
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersRes, groupsRes] = await Promise.all([
          api.getUsers(),
          api.getTeacherGroups(),
        ]);
        
        if (usersRes.data?.users) {
          setUsers(usersRes.data.users);
        }
        if (groupsRes.data?.groups) {
          setTeacherGroups(groupsRes.data.groups);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredUsers = useMemo(() => {
    if (roleFilter === 'all') return users;
    return users.filter(user => user.role === roleFilter);
  }, [users, roleFilter]);

  const userCounts = useMemo(() => {
    return {
      all: users.length,
      admin: users.filter(u => u.role === 'admin').length,
      teacher: users.filter(u => u.role === 'teacher').length,
      student: users.filter(u => u.role === 'student').length,
    };
  }, [users]);

  const resetForm = () => {
    setFormData({
      email: '',
      name: '',
      role: undefined,
      teacherGroupId: undefined,
    });
    setEditingUser(null);
  };

  const handleOpenDialog = (user?: User) => {
    if (user) {
      setEditingUser(user);
      setFormData({
        email: user.email,
        name: user.name,
        role: user.role,
        teacherGroupId: user.teacher_group_id || undefined,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.email || !formData.name || !formData.role) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (editingUser) {
        const response = await api.updateUser(editingUser.id, {
          email: formData.email,
          name: formData.name,
          role: formData.role,
          teacher_group_id: formData.role === 'teacher' ? formData.teacherGroupId || undefined : undefined,
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
          description: 'User updated successfully',
        });
      } else {
        const response = await api.createUser({
          email: formData.email,
          name: formData.name,
          role: formData.role,
          teacher_group_id: formData.role === 'teacher' ? formData.teacherGroupId || undefined : undefined,
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
          description: 'User created successfully',
        });
      }

      // Refresh users
      const usersRes = await api.getUsers();
      if (usersRes.data?.users) {
        setUsers(usersRes.data.users);
      }
      
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save user',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.deleteUser(id);
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
        description: 'User deleted successfully',
      });
      
      // Refresh users
      const usersRes = await api.getUsers();
      if (usersRes.data?.users) {
        setUsers(usersRes.data.users);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete user',
        variant: 'destructive',
      });
    }
  };

  const handleToggleSuspension = async (id: string, currentlySuspended: boolean) => {
    try {
      const response = currentlySuspended
        ? await api.unsuspendUser(id)
        : await api.suspendUser(id);
      
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
        description: `User ${currentlySuspended ? 'unsuspended' : 'suspended'} successfully`,
      });
      
      // Refresh users
      const usersRes = await api.getUsers();
      if (usersRes.data?.users) {
        setUsers(usersRes.data.users);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update user status',
        variant: 'destructive',
      });
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin':
        return <Shield className="h-5 w-5" />;
      case 'teacher':
        return <UserCheck className="h-5 w-5" />;
      case 'student':
        return <GraduationCap className="h-5 w-5" />;
      default:
        return <Users className="h-5 w-5" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'from-purple-500 to-pink-600';
      case 'teacher':
        return 'from-blue-500 to-cyan-600';
      case 'student':
        return 'from-green-500 to-emerald-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-muted-foreground">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Users Management
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Manage all users in the system by role
            </p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={() => handleOpenDialog()}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {editingUser ? 'Edit User' : 'Create New User'}
              </DialogTitle>
              <DialogDescription>
                {editingUser
                  ? 'Update user information below.'
                  : 'Add a new user to the system.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base font-semibold">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-base font-semibold">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Full Name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role" className="text-base font-semibold">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) =>
                    setFormData({ ...formData, role: value as 'admin' | 'teacher' | 'student', teacherGroupId: undefined })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="teacher">Teacher</SelectItem>
                    <SelectItem value="student">Student</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {formData.role === 'teacher' && (
                <div className="space-y-2">
                  <Label htmlFor="teacherGroup" className="text-base font-semibold">Teacher Group</Label>
                  <Select
                    value={formData.teacherGroupId || 'none'}
                    onValueChange={(value) =>
                      setFormData({ ...formData, teacherGroupId: value === 'none' ? undefined : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select teacher group (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {teacherGroups.map((group) => (
                        <SelectItem key={group.id} value={group.id}>
                          {group.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Assign this teacher to a group (e.g., Math Department, Science Department)
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Role Filter Tabs */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Filter by role:</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={roleFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRoleFilter('all')}
            className={roleFilter === 'all' ? 'bg-gradient-to-r from-indigo-600 to-purple-600' : ''}
          >
            All ({userCounts.all})
          </Button>
          <Button
            variant={roleFilter === 'admin' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRoleFilter('admin')}
            className={roleFilter === 'admin' ? 'bg-gradient-to-r from-purple-600 to-pink-600' : ''}
          >
            <Shield className="mr-2 h-4 w-4" />
            Admins ({userCounts.admin})
          </Button>
          <Button
            variant={roleFilter === 'teacher' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRoleFilter('teacher')}
            className={roleFilter === 'teacher' ? 'bg-gradient-to-r from-blue-600 to-cyan-600' : ''}
          >
            <UserCheck className="mr-2 h-4 w-4" />
            Teachers ({userCounts.teacher})
          </Button>
          <Button
            variant={roleFilter === 'student' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setRoleFilter('student')}
            className={roleFilter === 'student' ? 'bg-gradient-to-r from-green-600 to-emerald-600' : ''}
          >
            <GraduationCap className="mr-2 h-4 w-4" />
            Students ({userCounts.student})
          </Button>
        </div>
      </div>

      {/* Users Grid */}
      {filteredUsers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {roleFilter === 'all' ? 'No users found' : `No ${roleFilter}s found`}
            </h3>
            <p className="text-sm text-muted-foreground">
              {roleFilter === 'all' 
                ? 'Create your first user to get started'
                : `No users with the ${roleFilter} role exist yet`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user) => {
            const teacherGroup = user.teacher_group_id 
              ? teacherGroups.find(g => g.id === user.teacher_group_id)
              : null;

            return (
              <Card 
                key={user.id}
                className={`group hover:shadow-xl transition-all duration-300 border-2 ${
                  user.suspended 
                    ? 'opacity-60 border-red-200 dark:border-red-800' 
                    : 'hover:border-primary/50'
                }`}
              >
                <div className={`h-2 bg-gradient-to-r ${getRoleColor(user.role)}`}></div>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${getRoleColor(user.role)} text-white`}>
                        {getRoleIcon(user.role)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-lg mb-1 line-clamp-1">{user.name}</CardTitle>
                        <CardDescription className="text-xs line-clamp-1">{user.email}</CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Role</span>
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium capitalize bg-gradient-to-r ${getRoleColor(user.role)} text-white`}>
                        {user.role}
                      </span>
                    </div>
                    
                    {user.role === 'teacher' && teacherGroup && (
                      <div className="p-2 rounded-lg bg-muted/50">
                        <p className="text-xs text-muted-foreground mb-1">Teacher Group</p>
                        <p className="text-sm font-semibold">{teacherGroup.name}</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Status</span>
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                          user.suspended
                            ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}
                      >
                        {user.suspended ? 'Suspended' : 'Active'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(user)}
                        className="flex-1"
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleSuspension(user.id, user.suspended)}
                        className={user.suspended ? 'text-green-600 hover:text-green-700' : 'text-red-600 hover:text-red-700'}
                      >
                        {user.suspended ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <Ban className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
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
