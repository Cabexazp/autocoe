export interface GradeGroup {
  id: string;
  name: string; // ej: "10° A", "11° B"
  code: string; // ej: "G10A"
  description: string;
  academicYear: string;
  createdAt: string;
}

export interface Subject {
  id: string;
  groupId: string;
  name: string; // ej: "Matemáticas", "Física"
  code: string;
  teacherName: string;
  color: string;
  creditHours: number;
}

export interface Activity {
  id: string;
  subjectId: string;
  groupId: string;
  title: string;
  description: string;
  dueDate: string;
  weightPercentage: number; // e.g. 25 (%)
  maxScore: number; // e.g. 5.0 o 100
  allowCoevaluation?: boolean;
  coevaluationActive?: boolean;
  coevaluationDueDate?: string;
  createdAt: string;
}

export interface Student {
  id: string; // Identificación única / Llave primaria
  fullName: string;
  passwordHash: string; // Clave privada
  groupId: string; // Grado asignado
  email?: string;
  registeredAt: string;
}

export interface GradeRecord {
  id: string;
  activityId: string;
  studentId: string;
  score: number;
  feedback?: string;
  gradedAt: string;
  gradedBy: string;
}

export interface CoevaluationCriteria {
  id: string;
  name: string;
  description: string;
  weight: number;
}

export interface CoevaluationRecord {
  id: string;
  activityId: string;
  evaluatorStudentId: string; // Quien califica
  evaluatedStudentId: string; // A quien califican
  scores: {
    participation: number; // 1-5
    responsibility: number; // 1-5
    teamwork: number; // 1-5
    quality: number; // 1-5
  };
  averageScore: number;
  comments: string;
  submittedAt: string;
}

export interface NotificationItem {
  id: string;
  studentId?: string; // empty means for all or for a group
  groupId?: string;
  title: string;
  message: string;
  type: 'activity_due' | 'grade_posted' | 'coevaluation_open' | 'system';
  linkTarget?: string;
  activityId?: string;
  isRead: boolean;
  createdAt: string;
}

export type UserRole = 'admin' | 'student' | null;

export interface UserSession {
  role: UserRole;
  studentId?: string;
  studentName?: string;
  groupId?: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  isConnected: boolean;
  lastSyncedAt?: string;
}
