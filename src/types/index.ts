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

// ─── Quotations ──────────────────────────────────────────────────────────────
// A quotation is a priced offer sent to a client. It is most often created
// automatically by an upstream pricing tool (Pricing-Sheet) and arrives
// here in the "waiting_to_assign" state: prices and models are filled in,
// but the client and other commercial parameters still need to be chosen
// by an internal user before the quotation can be sent.

export type QuotationStatus =
  | "waiting_to_assign" // pricing data transferred, no client yet
  | "assigned"           // client + parameters assigned, ready to send
  | "sent"               // sent to client
  | "accepted"
  | "rejected";

export interface QuotationLineItem {
  id: number;
  quotationId: number;
  position: number;
  itemModel: string;
  quantity: number;
  priceAfterTax: number; // per-unit, post-tax, in currency
  currency: string;
}

export interface Quotation {
  id: number;
  status: QuotationStatus;
  source: string; // e.g. "pricing-sheet" | "manual"
  sourceProjectId: number | null;
  sourceProjectName: string | null;
  sourceManufacturerName: string | null;
  clientId: number | null;
  clientNameSnapshot: string | null; // free-text fallback when no client row
  currency: string;
  notes: string | null;
  responsibleUserId: string | null;
  createdAt: string;
  assignedAt: string | null;
  lineItems: QuotationLineItem[];
}

export interface Client {
  id: number;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  createdAt: string;
}
