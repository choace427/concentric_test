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
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  CheckCircle,
  FileText,
  User,
  Calendar,
  Award,
  BookOpen,
  TrendingUp,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

interface Assignment {
  id: string;
  title: string;
  class_id: string;
}

interface Submission {
  id: string;
  student_id: string;
  content: string;
  submitted_at: string;
  grade: number | null;
  feedback: string | null;
  student_name: string;
  student_email: string;
}

export default function GradingTab() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);
  const [selectedSubmission, setSelectedSubmission] =
    useState<Submission | null>(null);
  const [isGradingDialogOpen, setIsGradingDialogOpen] = useState(false);
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [grading, setGrading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchAssignments = async () => {
      if (!user) return;

      setLoading(true);
      try {
        const response = await api.getTeacherAssignments();
        if (response.data?.assignments) {
          setAssignments(response.data.assignments);
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [user]);

  const handleSelectAssignment = async (assignmentId: string) => {
    try {
      const response = await api.getAssignmentSubmissions(assignmentId);
      if (response.data?.submissions) {
        setSubmissions(response.data.submissions);
        const assignment = assignments.find((a) => a.id === assignmentId);
        setSelectedAssignment(assignment || null);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load submissions',
        variant: 'destructive',
      });
    }
  };

  const handleGrade = (submission: Submission) => {
    setSelectedSubmission(submission);
    setGrade(submission.grade?.toString() || '');
    setFeedback(submission.feedback || '');
    setIsGradingDialogOpen(true);
  };

  const handleSaveGrade = async () => {
    if (!selectedAssignment || !selectedSubmission) return;

    const gradeNum = parseFloat(grade);
    if (isNaN(gradeNum) || gradeNum < 0 || gradeNum > 100) {
      toast({
        title: 'Error',
        description: 'Please enter a valid grade (0-100)',
        variant: 'destructive',
      });
      return;
    }

    setGrading(true);
    try {
      const response = await api.gradeSubmission(
        selectedAssignment.id,
        selectedSubmission.id,
        gradeNum,
        feedback
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
        description: 'Grade and feedback saved successfully',
      });

      setIsGradingDialogOpen(false);
      setSelectedSubmission(null);
      setGrade('');
      setFeedback('');

      // Refresh submissions
      if (selectedAssignment) {
        const submissionsRes = await api.getAssignmentSubmissions(
          selectedAssignment.id
        );
        if (submissionsRes.data?.submissions) {
          setSubmissions(submissionsRes.data.submissions);
        }
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save grade',
        variant: 'destructive',
      });
    } finally {
      setGrading(false);
    }
  };

  const ungradedSubmissions = submissions.filter((s) => s.grade === null);
  const gradedSubmissions = submissions.filter((s) => s.grade !== null);

  const getGradeColor = (grade: number | null) => {
    if (grade === null) return 'text-gray-600';
    if (grade >= 90) return 'text-green-600 dark:text-green-400';
    if (grade >= 80) return 'text-blue-600 dark:text-blue-400';
    if (grade >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
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
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-gradient-to-br from-purple-500 to-pink-600 p-2 text-white">
          <Award className="h-6 w-6" />
        </div>
        <div>
          <h2 className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-3xl font-bold text-transparent">
            Grading
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Grade student submissions and provide feedback
          </p>
        </div>
      </div>

      {assignments.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Award className="text-muted-foreground mb-4 h-12 w-12" />
            <h3 className="mb-2 text-lg font-semibold">No assignments yet</h3>
            <p className="text-muted-foreground text-sm">
              Create assignments to start grading
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {assignments.map((assignment) => (
            <Card
              key={assignment.id}
              className={`cursor-pointer border-2 transition-all duration-300 hover:shadow-xl ${
                selectedAssignment?.id === assignment.id
                  ? 'border-primary bg-primary/5 shadow-lg'
                  : 'hover:border-primary/50'
              }`}
              onClick={() => handleSelectAssignment(assignment.id)}
            >
              <div
                className={`h-2 ${
                  selectedAssignment?.id === assignment.id
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500'
                    : 'bg-gradient-to-r from-blue-500 to-cyan-500'
                }`}
              ></div>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <div
                    className={`rounded-lg p-2 ${
                      selectedAssignment?.id === assignment.id
                        ? 'bg-purple-100 dark:bg-purple-900'
                        : 'bg-blue-100 dark:bg-blue-900'
                    }`}
                  >
                    <FileText
                      className={`h-5 w-5 ${
                        selectedAssignment?.id === assignment.id
                          ? 'text-purple-600 dark:text-purple-400'
                          : 'text-blue-600 dark:text-blue-400'
                      }`}
                    />
                  </div>
                  <CardTitle className="line-clamp-2 text-lg">
                    {assignment.title}
                  </CardTitle>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      {selectedAssignment && (
        <div className="space-y-6">
          <Card className="border-2">
            <div className="h-2 bg-gradient-to-r from-purple-500 to-pink-500"></div>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="mb-2 text-2xl">
                    {selectedAssignment.title}
                  </CardTitle>
                  <CardDescription>
                    Review and grade student submissions
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6 grid grid-cols-3 gap-4">
                <Card className="border-2">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm">Total</p>
                        <p className="text-2xl font-bold">
                          {submissions.length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-yellow-200 dark:border-yellow-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-yellow-100 p-2 dark:bg-yellow-900">
                        <TrendingUp className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm">Pending</p>
                        <p className="text-2xl font-bold text-yellow-600">
                          {ungradedSubmissions.length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-2 border-green-200 dark:border-green-800">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-green-100 p-2 dark:bg-green-900">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-muted-foreground text-sm">Graded</p>
                        <p className="text-2xl font-bold text-green-600">
                          {gradedSubmissions.length}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>

          {submissions.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="text-muted-foreground mb-4 h-12 w-12" />
                <h3 className="mb-2 text-lg font-semibold">
                  No submissions yet
                </h3>
                <p className="text-muted-foreground text-sm">
                  Students haven't submitted this assignment yet
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {submissions.map((submission) => {
                const isGraded = submission.grade !== null;
                return (
                  <Card
                    key={submission.id}
                    className={`group border-2 transition-all duration-300 hover:shadow-xl ${
                      isGraded
                        ? 'hover:border-green-500/50'
                        : 'border-yellow-200 hover:border-yellow-500/50 dark:border-yellow-800'
                    }`}
                  >
                    <div
                      className={`h-2 ${
                        isGraded
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500'
                          : 'bg-gradient-to-r from-yellow-500 to-orange-500'
                      }`}
                    ></div>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex flex-1 items-center gap-3">
                          <div
                            className={`rounded-lg p-2 ${
                              isGraded
                                ? 'bg-green-100 dark:bg-green-900'
                                : 'bg-yellow-100 dark:bg-yellow-900'
                            }`}
                          >
                            <User
                              className={`h-5 w-5 ${
                                isGraded
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-yellow-600 dark:text-yellow-400'
                              }`}
                            />
                          </div>
                          <div className="flex-1">
                            <CardTitle className="mb-1 text-lg">
                              {submission.student_name}
                            </CardTitle>
                            <CardDescription className="text-xs">
                              {submission.student_email}
                            </CardDescription>
                          </div>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                            isGraded
                              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                              : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          }`}
                        >
                          {isGraded ? 'Graded' : 'Pending'}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="bg-muted/50 flex items-center gap-2 rounded-lg p-3">
                          <Calendar className="text-primary h-4 w-4" />
                          <div>
                            <p className="text-muted-foreground text-xs">
                              Submitted
                            </p>
                            <p className="text-sm font-semibold">
                              {new Date(
                                submission.submitted_at
                              ).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {isGraded && (
                          <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3 dark:border-green-800 dark:bg-green-950">
                            <div>
                              <p className="text-muted-foreground mb-1 text-xs">
                                Grade
                              </p>
                              <p
                                className={`text-2xl font-bold ${getGradeColor(submission.grade)}`}
                              >
                                {submission.grade}%
                              </p>
                            </div>
                            {submission.feedback && (
                              <div className="ml-4 flex-1">
                                <p className="text-muted-foreground mb-1 text-xs">
                                  Feedback
                                </p>
                                <p className="line-clamp-2 text-sm">
                                  {submission.feedback}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="bg-muted/30 min-h-[4rem] rounded-lg border p-3">
                          <p className="text-muted-foreground mb-1 text-xs">
                            Submission
                          </p>
                          <p className="line-clamp-3 text-sm">
                            {submission.content}
                          </p>
                        </div>

                        <Button
                          onClick={() => handleGrade(submission)}
                          className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                          size="sm"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          {isGraded ? 'Edit Grade' : 'Grade Submission'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      <Dialog open={isGradingDialogOpen} onOpenChange={setIsGradingDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Grade Submission</DialogTitle>
            <DialogDescription>
              Provide a grade and feedback for this submission
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold">Assignment</Label>
              <div className="bg-muted/50 rounded-lg border p-3">
                {selectedAssignment?.title}
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-base font-semibold">Student</Label>
              <div className="bg-muted/50 rounded-lg border p-3">
                {selectedSubmission?.student_name} (
                {selectedSubmission?.student_email})
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-base font-semibold">
                Submission Content
              </Label>
              <div className="bg-muted/50 min-h-[6rem] rounded-lg border p-4">
                {selectedSubmission?.content}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="grade" className="text-base font-semibold">
                Grade (0-100)
              </Label>
              <Input
                id="grade"
                type="number"
                min="0"
                max="100"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback" className="text-base font-semibold">
                Feedback
              </Label>
              <Textarea
                id="feedback"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Enter feedback..."
                className="min-h-[6rem]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsGradingDialogOpen(false)}
              disabled={grading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveGrade}
              disabled={grading || !grade}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              {grading ? 'Saving...' : 'Save Grade'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
