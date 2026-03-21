export type SubjectCategory =
  | "power-engineering"
  | "networking"
  | "coding"
  | "coming-soon";

export interface Course {
  id: string;
  title: string;
  description: string;
  duration: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  lessons: number;
  subjectId: string;
  thumbnail: string;
  tags: string[];
}

export interface Subject {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  icon: string;
  color: string;
  gradient: string;
  category: SubjectCategory;
  courses: Course[];
  totalStudents: number;
}

export interface EnrolledCourse {
  courseId: string;
  subjectId: string;
  progress: number; // 0-100
  enrolledAt: string;
  lastAccessed: string;
  completedLessons: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  locked: boolean;
  xp: number;
}

export interface UserStats {
  level: number;
  xp: number;
  xpToNextLevel: number;
  totalCourses: number;
  completedCourses: number;
  streak: number;
  rank: string;
}
