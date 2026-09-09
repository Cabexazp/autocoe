import { 
  GradeGroup, 
  Subject, 
  Activity, 
  Student, 
  GradeRecord, 
  CoevaluationRecord, 
  NotificationItem 
} from '../types';
import { getSupabaseClient } from './supabase';

const STORAGE_KEYS = {
  GROUPS: 'edugrade_groups',
  SUBJECTS: 'edugrade_subjects',
  ACTIVITIES: 'edugrade_activities',
  STUDENTS: 'edugrade_students',
  GRADES: 'edugrade_grades',
  COEVALUATIONS: 'edugrade_coevaluations',
  NOTIFICATIONS: 'edugrade_notifications',
};

// Initial realistic seed data so the app works seamlessly from the start
const INITIAL_GROUPS: GradeGroup[] = [
  {
    id: 'grp-10a',
    name: '10° Grado A',
    code: '10A-2026',
    description: 'Décimo grado - Educación Media Académica',
    academicYear: '2026',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'grp-11b',
    name: '11° Grado B',
    code: '11B-2026',
    description: 'Undécimo grado - Promoción 2026',
    academicYear: '2026',
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_SUBJECTS: Subject[] = [
  {
    id: 'sub-mat-10',
    groupId: 'grp-10a',
    name: 'Matemáticas y Cálculo',
    code: 'MAT-101',
    teacherName: 'Prof. Carlos Mendoza',
    color: '#3b82f6',
    creditHours: 5,
  },
  {
    id: 'sub-fis-10',
    groupId: 'grp-10a',
    name: 'Física Clásica',
    code: 'FIS-102',
    teacherName: 'Dra. Elena Ramos',
    color: '#8b5cf6',
    creditHours: 4,
  },
  {
    id: 'sub-esp-10',
    groupId: 'grp-10a',
    name: 'Lengua y Literatura',
    code: 'LIT-103',
    teacherName: 'Lic. Andrés Salgado',
    color: '#10b981',
    creditHours: 3,
  },
];

const INITIAL_ACTIVITIES: Activity[] = [
  {
    id: 'act-mat-1',
    subjectId: 'sub-mat-10',
    groupId: 'grp-10a',
    title: 'Taller 1: Ecuaciones Cuadráticas y Gráficas',
    description: 'Resolver los 10 ejercicios prácticos del módulo 2 en grupos de trabajo.',
    dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    weightPercentage: 25,
    maxScore: 5.0,
    allowCoevaluation: true,
    coevaluationActive: true,
    coevaluationDueDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  },
  {
    id: 'act-fis-1',
    subjectId: 'sub-fis-10',
    groupId: 'grp-10a',
    title: 'Laboratorio de Cinemática y Movimiento',
    description: 'Informe grupal de caída libre y análisis de vectores de aceleración.',
    dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
    weightPercentage: 30,
    maxScore: 5.0,
    allowCoevaluation: true,
    coevaluationActive: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'act-esp-1',
    subjectId: 'sub-esp-10',
    groupId: 'grp-10a',
    title: 'Ensayo Crítico de Novela Contemporánea',
    description: 'Ensayo argumentativo de 1200 palabras con normas APA.',
    dueDate: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
    weightPercentage: 20,
    maxScore: 5.0,
    allowCoevaluation: false,
    coevaluationActive: false,
    createdAt: new Date().toISOString(),
  },
];

// Seed students for group 10A
const INITIAL_STUDENTS: Student[] = [
  {
    id: '1001234567',
    fullName: 'Alejandro Morales Rivera',
    passwordHash: 'estudiante123',
    groupId: 'grp-10a',
    email: 'alejandro.morales@colegio.edu',
    registeredAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '1009876543',
    fullName: 'Valentina Restrepo Castro',
    passwordHash: 'estudiante123',
    groupId: 'grp-10a',
    email: 'valentina.restrepo@colegio.edu',
    registeredAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '1005544332',
    fullName: 'Mateo Gómez Cárdenas',
    passwordHash: 'estudiante123',
    groupId: 'grp-10a',
    email: 'mateo.gomez@colegio.edu',
    registeredAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

const INITIAL_GRADES: GradeRecord[] = [
  {
    id: 'grd-1',
    activityId: 'act-mat-1',
    studentId: '1001234567',
    score: 4.6,
    feedback: 'Excelente desarrollo analítico de los vértices y raíces.',
    gradedAt: new Date().toISOString(),
    gradedBy: 'Prof. Carlos Mendoza',
  },
  {
    id: 'grd-2',
    activityId: 'act-mat-1',
    studentId: '1009876543',
    score: 4.9,
    feedback: 'Procedimiento impecable y comprobaciones completas.',
    gradedAt: new Date().toISOString(),
    gradedBy: 'Prof. Carlos Mendoza',
  },
];

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif-1',
    groupId: 'grp-10a',
    title: 'Nueva Actividad Asignada',
    message: 'Taller 1: Ecuaciones Cuadráticas ha sido publicado para 10° Grado A.',
    type: 'activity_due',
    activityId: 'act-mat-1',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notif-2',
    groupId: 'grp-10a',
    title: 'Coevaluación Habilitada',
    message: 'El docente habilitó la coevaluación entre compañeros para el Taller 1 de Matemáticas.',
    type: 'coevaluation_open',
    activityId: 'act-mat-1',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
];

type ChangeListener = () => void;
const listeners = new Set<ChangeListener>();

export function subscribeToStore(listener: ChangeListener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners() {
  listeners.forEach((l) => {
    try {
      l();
    } catch (e) {
      console.error(e);
    }
  });
}

// In-memory caches
let groupsCache: GradeGroup[] = [];
let subjectsCache: Subject[] = [];
let activitiesCache: Activity[] = [];
let studentsCache: Student[] = [];
let gradesCache: GradeRecord[] = [];
let coevaluationsCache: CoevaluationRecord[] = [];
let notificationsCache: NotificationItem[] = [];

function loadFromStorage<T>(key: string, fallback: T[]): T[] {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      localStorage.setItem(key, JSON.stringify(fallback));
      return fallback;
    }
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, data: T[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Error saving to storage:', err);
  }
}

// Initialize state
export function initStore() {
  groupsCache = loadFromStorage(STORAGE_KEYS.GROUPS, INITIAL_GROUPS);
  subjectsCache = loadFromStorage(STORAGE_KEYS.SUBJECTS, INITIAL_SUBJECTS);
  activitiesCache = loadFromStorage(STORAGE_KEYS.ACTIVITIES, INITIAL_ACTIVITIES);
  studentsCache = loadFromStorage(STORAGE_KEYS.STUDENTS, INITIAL_STUDENTS);
  gradesCache = loadFromStorage(STORAGE_KEYS.GRADES, INITIAL_GRADES);
  coevaluationsCache = loadFromStorage(STORAGE_KEYS.COEVALUATIONS, []);
  notificationsCache = loadFromStorage(STORAGE_KEYS.NOTIFICATIONS, INITIAL_NOTIFICATIONS);

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (Object.values(STORAGE_KEYS).includes(event.key || '')) {
        initStore();
        notifyListeners();
      }
    });
  }

  // Try initial sync with Supabase if configured
  syncWithSupabase().catch((err) => {
    console.log('Supabase sync background notice:', err?.message || err);
  });
}

// Realtime channel reference
let realtimeChannel: ReturnType<NonNullable<ReturnType<typeof getSupabaseClient>>['channel']> | null = null;

export function setupSupabaseRealtime() {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  if (realtimeChannel) {
    supabase.removeChannel(realtimeChannel);
  }

  try {
    realtimeChannel = supabase
      .channel('edugrade-live-sync')
      .on('postgres_changes', { event: '*', schema: 'public' }, () => {
        syncWithSupabase();
      })
      .subscribe();
  } catch (err) {
    console.warn('Realtime subscription error:', err);
  }
}

// Sync from Supabase
export async function syncWithSupabase(): Promise<{ success: boolean; message?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, message: 'Supabase no está configurado aún' };
  }

  try {
    const [
      groupsRes,
      subjectsRes,
      studentsRes,
      activitiesRes,
      gradesRes,
      coevalRes,
      notifRes,
    ] = await Promise.allSettled([
      supabase.from('grade_groups').select('*'),
      supabase.from('subjects').select('*'),
      supabase.from('students').select('*'),
      supabase.from('activities').select('*'),
      supabase.from('grade_records').select('*'),
      supabase.from('coevaluations').select('*'),
      supabase.from('notifications').select('*'),
    ]);

    let hadUpdates = false;

    if (groupsRes.status === 'fulfilled' && groupsRes.value.data && groupsRes.value.data.length > 0) {
      groupsCache = groupsRes.value.data.map((item: Record<string, unknown>) => ({
        id: String(item.id),
        name: String(item.name),
        code: String(item.code),
        description: String(item.description || ''),
        academicYear: String(item.academic_year || item.academicYear || '2026'),
        createdAt: String(item.created_at || item.createdAt || new Date().toISOString()),
      }));
      saveToStorage(STORAGE_KEYS.GROUPS, groupsCache);
      hadUpdates = true;
    }

    if (subjectsRes.status === 'fulfilled' && subjectsRes.value.data && subjectsRes.value.data.length > 0) {
      subjectsCache = subjectsRes.value.data.map((item: Record<string, unknown>) => ({
        id: String(item.id),
        groupId: String(item.group_id || item.groupId),
        name: String(item.name),
        code: String(item.code),
        teacherName: String(item.teacher_name || item.teacherName || 'Docente'),
        color: String(item.color || '#3b82f6'),
        creditHours: Number(item.credit_hours || item.creditHours || 4),
      }));
      saveToStorage(STORAGE_KEYS.SUBJECTS, subjectsCache);
      hadUpdates = true;
    }

    if (studentsRes.status === 'fulfilled' && studentsRes.value.data && studentsRes.value.data.length > 0) {
      studentsCache = studentsRes.value.data.map((item: Record<string, unknown>) => ({
        id: String(item.id),
        fullName: String(item.full_name || item.fullName),
        passwordHash: String(item.password_hash || item.passwordHash),
        groupId: String(item.group_id || item.groupId),
        email: item.email ? String(item.email) : undefined,
        registeredAt: String(item.registered_at || item.registeredAt || new Date().toISOString()),
      }));
      saveToStorage(STORAGE_KEYS.STUDENTS, studentsCache);
      hadUpdates = true;
    }

    if (activitiesRes.status === 'fulfilled' && activitiesRes.value.data && activitiesRes.value.data.length > 0) {
      activitiesCache = activitiesRes.value.data.map((item: Record<string, unknown>) => ({
        id: String(item.id),
        subjectId: String(item.subject_id || item.subjectId),
        groupId: String(item.group_id || item.groupId),
        title: String(item.title),
        description: String(item.description || ''),
        dueDate: String(item.due_date || item.dueDate),
        weightPercentage: Number(item.weight_percentage || item.weightPercentage || 20),
        maxScore: Number(item.max_score || item.maxScore || 5.0),
        allowCoevaluation: Boolean(item.allow_coevaluation ?? item.allowCoevaluation),
        coevaluationActive: Boolean(item.coevaluation_active ?? item.coevaluationActive),
        coevaluationDueDate: item.coevaluation_due_date ? String(item.coevaluation_due_date) : undefined,
        createdAt: String(item.created_at || item.createdAt || new Date().toISOString()),
      }));
      saveToStorage(STORAGE_KEYS.ACTIVITIES, activitiesCache);
      hadUpdates = true;
    }

    if (gradesRes.status === 'fulfilled' && gradesRes.value.data && gradesRes.value.data.length > 0) {
      gradesCache = gradesRes.value.data.map((item: Record<string, unknown>) => ({
        id: String(item.id),
        activityId: String(item.activity_id || item.activityId),
        studentId: String(item.student_id || item.studentId),
        score: Number(item.score),
        feedback: item.feedback ? String(item.feedback) : undefined,
        gradedAt: String(item.graded_at || item.gradedAt || new Date().toISOString()),
        gradedBy: String(item.graded_by || item.gradedBy || 'Docente'),
      }));
      saveToStorage(STORAGE_KEYS.GRADES, gradesCache);
      hadUpdates = true;
    }

    if (coevalRes.status === 'fulfilled' && coevalRes.value.data && coevalRes.value.data.length > 0) {
      coevaluationsCache = coevalRes.value.data.map((item: Record<string, unknown>) => ({
        id: String(item.id),
        activityId: String(item.activity_id || item.activityId),
        evaluatorStudentId: String(item.evaluator_student_id || item.evaluatorStudentId),
        evaluatedStudentId: String(item.evaluated_student_id || item.evaluatedStudentId),
        scores: {
          participation: Number(item.participation_score || 5),
          responsibility: Number(item.responsibility_score || 5),
          teamwork: Number(item.teamwork_score || 5),
          quality: Number(item.quality_score || 5),
        },
        averageScore: Number(item.average_score || item.averageScore || 5),
        comments: String(item.comments || ''),
        submittedAt: String(item.submitted_at || item.submittedAt || new Date().toISOString()),
      }));
      saveToStorage(STORAGE_KEYS.COEVALUATIONS, coevaluationsCache);
      hadUpdates = true;
    }

    if (notifRes.status === 'fulfilled' && notifRes.value.data && notifRes.value.data.length > 0) {
      notificationsCache = notifRes.value.data.map((item: Record<string, unknown>) => ({
        id: String(item.id),
        studentId: item.student_id ? String(item.student_id) : undefined,
        groupId: item.group_id ? String(item.group_id) : undefined,
        title: String(item.title),
        message: String(item.message),
        type: (item.type as NotificationItem['type']) || 'system',
        linkTarget: item.link_target ? String(item.link_target) : undefined,
        activityId: item.activity_id ? String(item.activity_id) : undefined,
        isRead: Boolean(item.is_read ?? item.isRead),
        createdAt: String(item.created_at || item.createdAt || new Date().toISOString()),
      }));
      saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notificationsCache);
      hadUpdates = true;
    }

    if (hadUpdates) {
      notifyListeners();
    }

    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, message: msg };
  }
}

// Push local seed or item to Supabase helper
async function pushRecordToSupabase(table: string, payload: Record<string, unknown>) {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    await supabase.from(table).upsert(payload);
  } catch (e) {
    console.warn(`Error pushing to Supabase table ${table}:`, e);
  }
}

// Store getters
export function getGroups(): GradeGroup[] {
  return [...groupsCache];
}

export function getSubjects(groupId?: string): Subject[] {
  if (groupId) {
    return subjectsCache.filter((s) => s.groupId === groupId);
  }
  return [...subjectsCache];
}

export function getActivities(groupId?: string, subjectId?: string): Activity[] {
  return activitiesCache.filter((a) => {
    if (groupId && a.groupId !== groupId) return false;
    if (subjectId && a.subjectId !== subjectId) return false;
    return true;
  });
}

export function getStudents(groupId?: string): Student[] {
  if (groupId) {
    return studentsCache.filter((s) => s.groupId === groupId);
  }
  return [...studentsCache];
}

export function getGrades(studentId?: string, activityId?: string): GradeRecord[] {
  return gradesCache.filter((g) => {
    if (studentId && g.studentId !== studentId) return false;
    if (activityId && g.activityId !== activityId) return false;
    return true;
  });
}

export function getCoevaluations(activityId?: string, evaluatedStudentId?: string, evaluatorStudentId?: string): CoevaluationRecord[] {
  return coevaluationsCache.filter((c) => {
    if (activityId && c.activityId !== activityId) return false;
    if (evaluatedStudentId && c.evaluatedStudentId !== evaluatedStudentId) return false;
    if (evaluatorStudentId && c.evaluatorStudentId !== evaluatorStudentId) return false;
    return true;
  });
}

export function getNotifications(studentId?: string, groupId?: string): NotificationItem[] {
  return notificationsCache.filter((n) => {
    // If targeted to a specific student
    if (n.studentId && studentId && n.studentId === studentId) return true;
    // If targeted to a group
    if (n.groupId && groupId && n.groupId === groupId) return true;
    // If global (no studentId and no groupId)
    if (!n.studentId && !n.groupId) return true;
    // If no filter requested, return all
    if (!studentId && !groupId) return true;
    return false;
  });
}

// Store mutations
export async function addGroup(group: Omit<GradeGroup, 'id' | 'createdAt'>): Promise<GradeGroup> {
  const newGroup: GradeGroup = {
    ...group,
    id: 'grp-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    createdAt: new Date().toISOString(),
  };
  groupsCache = [newGroup, ...groupsCache];
  saveToStorage(STORAGE_KEYS.GROUPS, groupsCache);
  notifyListeners();

  pushRecordToSupabase('grade_groups', {
    id: newGroup.id,
    name: newGroup.name,
    code: newGroup.code,
    description: newGroup.description,
    academic_year: newGroup.academicYear,
    created_at: newGroup.createdAt,
  });

  return newGroup;
}

export async function addSubject(subject: Omit<Subject, 'id'>): Promise<Subject> {
  const newSubject: Subject = {
    ...subject,
    id: 'sub-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
  };
  subjectsCache = [...subjectsCache, newSubject];
  saveToStorage(STORAGE_KEYS.SUBJECTS, subjectsCache);
  notifyListeners();

  pushRecordToSupabase('subjects', {
    id: newSubject.id,
    group_id: newSubject.groupId,
    name: newSubject.name,
    code: newSubject.code,
    teacher_name: newSubject.teacherName,
    color: newSubject.color,
    credit_hours: newSubject.creditHours,
  });

  return newSubject;
}

export async function addActivity(activity: Omit<Activity, 'id' | 'createdAt'>): Promise<Activity> {
  const newActivity: Activity = {
    ...activity,
    id: 'act-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    createdAt: new Date().toISOString(),
  };
  activitiesCache = [newActivity, ...activitiesCache];
  saveToStorage(STORAGE_KEYS.ACTIVITIES, activitiesCache);

  // Auto-generate notification for the group
  const notif: NotificationItem = {
    id: 'notif-' + Date.now(),
    groupId: newActivity.groupId,
    title: `Nueva Tarea: ${newActivity.title}`,
    message: `Se ha asignado una nueva actividad para entregar el ${new Date(newActivity.dueDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}.`,
    type: 'activity_due',
    activityId: newActivity.id,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  notificationsCache = [notif, ...notificationsCache];
  saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notificationsCache);

  notifyListeners();

  pushRecordToSupabase('activities', {
    id: newActivity.id,
    subject_id: newActivity.subjectId,
    group_id: newActivity.groupId,
    title: newActivity.title,
    description: newActivity.description,
    due_date: newActivity.dueDate,
    weight_percentage: newActivity.weightPercentage,
    max_score: newActivity.maxScore,
    allow_coevaluation: newActivity.allowCoevaluation ?? false,
    coevaluation_active: newActivity.coevaluationActive ?? false,
    coevaluation_due_date: newActivity.coevaluationDueDate,
    created_at: newActivity.createdAt,
  });

  pushRecordToSupabase('notifications', {
    id: notif.id,
    group_id: notif.groupId,
    title: notif.title,
    message: notif.message,
    type: notif.type,
    activity_id: notif.activityId,
    is_read: false,
    created_at: notif.createdAt,
  });

  return newActivity;
}

export async function toggleCoevaluationStatus(activityId: string, active: boolean, dueDate?: string) {
  activitiesCache = activitiesCache.map((act) => {
    if (act.id === activityId) {
      return {
        ...act,
        allowCoevaluation: true,
        coevaluationActive: active,
        coevaluationDueDate: dueDate || act.coevaluationDueDate,
      };
    }
    return act;
  });
  saveToStorage(STORAGE_KEYS.ACTIVITIES, activitiesCache);

  const targetAct = activitiesCache.find((a) => a.id === activityId);
  if (targetAct && active) {
    // Generate notification for students
    const notif: NotificationItem = {
      id: 'notif-coeval-' + Date.now(),
      groupId: targetAct.groupId,
      title: '¡Coevaluación Habilitada!',
      message: `El docente ha habilitado la evaluación entre pares para "${targetAct.title}". Entra a calificar a tus compañeros.`,
      type: 'coevaluation_open',
      activityId: targetAct.id,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    notificationsCache = [notif, ...notificationsCache];
    saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notificationsCache);
  }

  notifyListeners();

  const act = activitiesCache.find((a) => a.id === activityId);
  if (act) {
    pushRecordToSupabase('activities', {
      id: act.id,
      allow_coevaluation: true,
      coevaluation_active: active,
      coevaluation_due_date: act.coevaluationDueDate,
    });
  }
}

export async function registerStudent(student: Omit<Student, 'registeredAt'>): Promise<{ success: boolean; message?: string }> {
  // Check if student ID already exists
  const existing = studentsCache.find((s) => s.id.trim() === student.id.trim());
  if (existing) {
    return { success: false, message: 'La identificación ya está registrada en el sistema. Inicia sesión.' };
  }

  const newStudent: Student = {
    ...student,
    id: student.id.trim(),
    registeredAt: new Date().toISOString(),
  };

  studentsCache = [newStudent, ...studentsCache];
  saveToStorage(STORAGE_KEYS.STUDENTS, studentsCache);
  notifyListeners();

  pushRecordToSupabase('students', {
    id: newStudent.id,
    full_name: newStudent.fullName,
    password_hash: newStudent.passwordHash,
    group_id: newStudent.groupId,
    email: newStudent.email || null,
    registered_at: newStudent.registeredAt,
  });

  return { success: true };
}

export async function saveGrade(record: Omit<GradeRecord, 'id' | 'gradedAt'>): Promise<GradeRecord> {
  const existingIndex = gradesCache.findIndex(
    (g) => g.activityId === record.activityId && g.studentId === record.studentId
  );

  let updatedRecord: GradeRecord;
  if (existingIndex >= 0) {
    updatedRecord = {
      ...gradesCache[existingIndex],
      score: record.score,
      feedback: record.feedback,
      gradedBy: record.gradedBy,
      gradedAt: new Date().toISOString(),
    };
    gradesCache[existingIndex] = updatedRecord;
  } else {
    updatedRecord = {
      ...record,
      id: 'grd-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      gradedAt: new Date().toISOString(),
    };
    gradesCache = [updatedRecord, ...gradesCache];
  }

  saveToStorage(STORAGE_KEYS.GRADES, gradesCache);

  // Send notification to the student about new grade
  const act = activitiesCache.find((a) => a.id === record.activityId);
  const notif: NotificationItem = {
    id: 'notif-grade-' + Date.now(),
    studentId: record.studentId,
    title: `Calificación Publicada: ${act?.title || 'Actividad'}`,
    message: `Tu docente ha calificado la actividad con una nota de ${record.score.toFixed(1)}${record.feedback ? ` - Observación: "${record.feedback}"` : ''}.`,
    type: 'grade_posted',
    activityId: record.activityId,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  notificationsCache = [notif, ...notificationsCache];
  saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notificationsCache);

  notifyListeners();

  pushRecordToSupabase('grade_records', {
    id: updatedRecord.id,
    activity_id: updatedRecord.activityId,
    student_id: updatedRecord.studentId,
    score: updatedRecord.score,
    feedback: updatedRecord.feedback || null,
    graded_at: updatedRecord.gradedAt,
    graded_by: updatedRecord.gradedBy,
  });

  pushRecordToSupabase('notifications', {
    id: notif.id,
    student_id: notif.studentId,
    title: notif.title,
    message: notif.message,
    type: notif.type,
    activity_id: notif.activityId,
    is_read: false,
    created_at: notif.createdAt,
  });

  return updatedRecord;
}

export async function submitCoevaluation(record: Omit<CoevaluationRecord, 'id' | 'submittedAt'>): Promise<CoevaluationRecord> {
  const existingIndex = coevaluationsCache.findIndex(
    (c) =>
      c.activityId === record.activityId &&
      c.evaluatorStudentId === record.evaluatorStudentId &&
      c.evaluatedStudentId === record.evaluatedStudentId
  );

  let savedRecord: CoevaluationRecord;
  if (existingIndex >= 0) {
    savedRecord = {
      ...coevaluationsCache[existingIndex],
      scores: record.scores,
      averageScore: record.averageScore,
      comments: record.comments,
      submittedAt: new Date().toISOString(),
    };
    coevaluationsCache[existingIndex] = savedRecord;
  } else {
    savedRecord = {
      ...record,
      id: 'coev-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      submittedAt: new Date().toISOString(),
    };
    coevaluationsCache = [savedRecord, ...coevaluationsCache];
  }

  saveToStorage(STORAGE_KEYS.COEVALUATIONS, coevaluationsCache);
  notifyListeners();

  pushRecordToSupabase('coevaluations', {
    id: savedRecord.id,
    activity_id: savedRecord.activityId,
    evaluator_student_id: savedRecord.evaluatorStudentId,
    evaluated_student_id: savedRecord.evaluatedStudentId,
    participation_score: savedRecord.scores.participation,
    responsibility_score: savedRecord.scores.responsibility,
    teamwork_score: savedRecord.scores.teamwork,
    quality_score: savedRecord.scores.quality,
    average_score: savedRecord.averageScore,
    comments: savedRecord.comments,
    submitted_at: savedRecord.submittedAt,
  });

  return savedRecord;
}

export function markNotificationAsRead(notificationId: string) {
  notificationsCache = notificationsCache.map((n) => {
    if (n.id === notificationId) {
      return { ...n, isRead: true };
    }
    return n;
  });
  saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notificationsCache);
  notifyListeners();
}

export function markAllNotificationsAsRead(studentId?: string, groupId?: string) {
  notificationsCache = notificationsCache.map((n) => {
    if (studentId && n.studentId === studentId) return { ...n, isRead: true };
    if (groupId && n.groupId === groupId) return { ...n, isRead: true };
    if (!studentId && !groupId) return { ...n, isRead: true };
    return n;
  });
  saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notificationsCache);
  notifyListeners();
}

// Initial boot
initStore();
