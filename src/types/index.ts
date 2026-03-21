export type SubjectCategory = "power-engineering" | "networking" | "coding";

export interface Course {
  id: string;
  title: string;
  description: string;
  duration: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  lessons: number;
  subjectId: string;
  tags: string[];
  comingSoon?: boolean;
}

export interface Subject {
  id: string;
  title: string;
  shortTitle: string;
  description: string;
  /** Lucide icon name */
  iconName: string;
  color: string;
  gradient: string;
  category: SubjectCategory;
  courses: Course[];
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
  /** Lucide icon name */
  iconName: string;
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

export interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  jobTitle: string | null;
  organization: string | null;
  location: string | null;
  bio: string | null;
  phone: string | null;
}
