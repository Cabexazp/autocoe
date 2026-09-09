import { 
  GradeGroup, 
  Subject, 
  Activity, 
  Student, 
  GradeRecord, 
  CoevaluationRecord, 
  NotificationItem 
} from '../types';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabaseClient } from './supabase';

const STORAGE_KEYS = {
  GROUPS: 'edugrade_groups_v3',
  SUBJECTS: 'edugrade_subjects_v3',
  ACTIVITIES: 'edugrade_activities_v3',
  STUDENTS: 'edugrade_students_v3',
  GRADES: 'edugrade_grades_v3',
  COEVALUATIONS: 'edugrade_coevaluations_v3',
  NOTIFICATIONS: 'edugrade_notifications_v3',
};

const STORAGE_CLEAN_VERSION_KEY = 'edugrade_blank_init_v3';

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

// In-memory caches - starts completely empty by default as requested
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

// Initialize state with completely clean/empty lists
export function initStore() {
  if (typeof window !== 'undefined') {
    // Check if clean version is initialized or if legacy demo data exists
    const isCleanVersion = localStorage.getItem(STORAGE_CLEAN_VERSION_KEY);
    const legacyGroups = localStorage.getItem('edugrade_groups') || '';

    // If first time with v3 or legacy demo data present, ensure clean slate
    if (!isCleanVersion || legacyGroups.includes('grp-10a')) {
      // Clear legacy keys
      localStorage.removeItem('edugrade_groups');
      localStorage.removeItem('edugrade_subjects');
      localStorage.removeItem('edugrade_activities');
      localStorage.removeItem('edugrade_students');
      localStorage.removeItem('edugrade_grades');
      localStorage.removeItem('edugrade_coevaluations');
      localStorage.removeItem('edugrade_notifications');

      // Set clean empty state
      localStorage.setItem(STORAGE_KEYS.GROUPS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.ACTIVITIES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.GRADES, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.COEVALUATIONS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify([]));
      localStorage.setItem(STORAGE_CLEAN_VERSION_KEY, 'true');
    }
  }

  groupsCache = loadFromStorage(STORAGE_KEYS.GROUPS, []);
  subjectsCache = loadFromStorage(STORAGE_KEYS.SUBJECTS, []);
  activitiesCache = loadFromStorage(STORAGE_KEYS.ACTIVITIES, []);
  studentsCache = loadFromStorage(STORAGE_KEYS.STUDENTS, []);
  gradesCache = loadFromStorage(STORAGE_KEYS.GRADES, []);
  coevaluationsCache = loadFromStorage(STORAGE_KEYS.COEVALUATIONS, []);
  notificationsCache = loadFromStorage(STORAGE_KEYS.NOTIFICATIONS, []);

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (event) => {
      if (Object.values(STORAGE_KEYS).includes(event.key || '')) {
        groupsCache = loadFromStorage(STORAGE_KEYS.GROUPS, []);
        subjectsCache = loadFromStorage(STORAGE_KEYS.SUBJECTS, []);
        activitiesCache = loadFromStorage(STORAGE_KEYS.ACTIVITIES, []);
        studentsCache = loadFromStorage(STORAGE_KEYS.STUDENTS, []);
        gradesCache = loadFromStorage(STORAGE_KEYS.GRADES, []);
        coevaluationsCache = loadFromStorage(STORAGE_KEYS.COEVALUATIONS, []);
        notificationsCache = loadFromStorage(STORAGE_KEYS.NOTIFICATIONS, []);
        notifyListeners();
      }
    });
  }

  // Try initial sync with Supabase ONLY if explicitly configured
  const supabase = getSupabaseClient();
  if (supabase) {
    syncWithSupabase().catch((err) => {
      console.log('Supabase sync background notice:', err?.message || err);
    });
  }
}

// Push local change to Supabase if configured
async function pushRecordToSupabase(table: string, payload: Record<string, unknown>) {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    await supabase.from(table).upsert(payload);
  } catch (e) {
    console.warn(`Error pushing to Supabase table ${table}:`, e);
  }
}

async function deleteRecordFromSupabase(table: string, id: string) {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    await supabase.from(table).delete().eq('id', id);
  } catch (e) {
    console.warn(`Error deleting from Supabase table ${table}:`, e);
  }
}

// Bi-directional sync with Supabase
export async function syncWithSupabase(): Promise<{ success: boolean; message?: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return { success: false, message: 'Supabase no está configurado aún' };
  }

  try {
    // 1. Groups
    const { data: remoteGroups } = await supabase.from('grade_groups').select('*');
    if (remoteGroups && remoteGroups.length > 0) {
      const mergedGroups: GradeGroup[] = remoteGroups.map((g: any) => ({
        id: g.id,
        name: g.name,
        code: g.code,
        description: g.description || '',
        academicYear: g.academic_year || '2026',
        createdAt: g.created_at,
      }));
      groupsCache = mergedGroups;
      saveToStorage(STORAGE_KEYS.GROUPS, groupsCache);
    } else if (groupsCache.length > 0) {
      for (const g of groupsCache) {
        await supabase.from('grade_groups').upsert({
          id: g.id,
          name: g.name,
          code: g.code,
          description: g.description,
          academic_year: g.academicYear,
          created_at: g.createdAt,
        });
      }
    }

    // 2. Subjects
    const { data: remoteSubjects } = await supabase.from('subjects').select('*');
    if (remoteSubjects && remoteSubjects.length > 0) {
      const mergedSubjects: Subject[] = remoteSubjects.map((s: any) => ({
        id: s.id,
        groupId: s.group_id,
        name: s.name,
        code: s.code,
        teacherName: s.teacher_name,
        color: s.color || '#4f46e5',
        creditHours: s.credit_hours || 4,
      }));
      subjectsCache = mergedSubjects;
      saveToStorage(STORAGE_KEYS.SUBJECTS, subjectsCache);
    } else if (subjectsCache.length > 0) {
      for (const s of subjectsCache) {
        await supabase.from('subjects').upsert({
          id: s.id,
          group_id: s.groupId,
          name: s.name,
          code: s.code,
          teacher_name: s.teacherName,
          color: s.color,
          credit_hours: s.creditHours,
        });
      }
    }

    // 3. Activities
    const { data: remoteActivities } = await supabase.from('activities').select('*');
    if (remoteActivities && remoteActivities.length > 0) {
      const mergedActivities: Activity[] = remoteActivities.map((a: any) => ({
        id: a.id,
        subjectId: a.subject_id,
        groupId: a.group_id,
        title: a.title,
        description: a.description || '',
        dueDate: a.due_date,
        weightPercentage: Number(a.weight_percentage) || 20,
        maxScore: Number(a.max_score) || 5.0,
        allowCoevaluation: Boolean(a.allow_coevaluation),
        coevaluationActive: Boolean(a.coevaluation_active),
        coevaluationDueDate: a.coevaluation_due_date,
        createdAt: a.created_at,
      }));
      activitiesCache = mergedActivities;
      saveToStorage(STORAGE_KEYS.ACTIVITIES, activitiesCache);
    } else if (activitiesCache.length > 0) {
      for (const a of activitiesCache) {
        await supabase.from('activities').upsert({
          id: a.id,
          subject_id: a.subjectId,
          group_id: a.groupId,
          title: a.title,
          description: a.description,
          due_date: a.dueDate,
          weight_percentage: a.weightPercentage,
          max_score: a.maxScore,
          allow_coevaluation: a.allowCoevaluation ?? false,
          coevaluation_active: a.coevaluationActive ?? false,
          coevaluation_due_date: a.coevaluationDueDate,
          created_at: a.createdAt,
        });
      }
    }

    // 4. Students
    const { data: remoteStudents } = await supabase.from('students').select('*');
    if (remoteStudents && remoteStudents.length > 0) {
      const mergedStudents: Student[] = remoteStudents.map((st: any) => ({
        id: st.id,
        fullName: st.full_name,
        passwordHash: st.password_hash,
        groupId: st.group_id,
        email: st.email || undefined,
        registeredAt: st.registered_at,
      }));
      studentsCache = mergedStudents;
      saveToStorage(STORAGE_KEYS.STUDENTS, studentsCache);
    } else if (studentsCache.length > 0) {
      for (const st of studentsCache) {
        await supabase.from('students').upsert({
          id: st.id,
          full_name: st.fullName,
          password_hash: st.passwordHash,
          group_id: st.groupId,
          email: st.email || null,
          registered_at: st.registeredAt,
        });
      }
    }

    // 5. Grades
    const { data: remoteGrades } = await supabase.from('grade_records').select('*');
    if (remoteGrades && remoteGrades.length > 0) {
      const mergedGrades: GradeRecord[] = remoteGrades.map((g: any) => ({
        id: g.id,
        activityId: g.activity_id,
        studentId: g.student_id,
        score: Number(g.score),
        feedback: g.feedback || undefined,
        gradedAt: g.graded_at,
        gradedBy: g.graded_by,
      }));
      gradesCache = mergedGrades;
      saveToStorage(STORAGE_KEYS.GRADES, gradesCache);
    }

    // 6. Coevaluations
    const { data: remoteCoevals } = await supabase.from('coevaluations').select('*');
    if (remoteCoevals && remoteCoevals.length > 0) {
      const mergedCoevals: CoevaluationRecord[] = remoteCoevals.map((c: any) => ({
        id: c.id,
        activityId: c.activity_id,
        evaluatorStudentId: c.evaluator_student_id,
        evaluatedStudentId: c.evaluated_student_id,
        scores: {
          participation: Number(c.participation_score) || 5,
          responsibility: Number(c.responsibility_score) || 5,
          teamwork: Number(c.teamwork_score) || 5,
          quality: Number(c.quality_score) || 5,
        },
        averageScore: Number(c.average_score) || 5,
        comments: c.comments || '',
        submittedAt: c.submitted_at,
      }));
      coevaluationsCache = mergedCoevals;
      saveToStorage(STORAGE_KEYS.COEVALUATIONS, coevaluationsCache);
    }

    // 7. Notifications
    const { data: remoteNotifs } = await supabase.from('notifications').select('*');
    if (remoteNotifs && remoteNotifs.length > 0) {
      const mergedNotifs: NotificationItem[] = remoteNotifs.map((n: any) => ({
        id: n.id,
        studentId: n.student_id || undefined,
        groupId: n.group_id || undefined,
        title: n.title,
        message: n.message,
        type: n.type,
        activityId: n.activity_id || undefined,
        isRead: Boolean(n.is_read),
        createdAt: n.created_at,
      }));
      notificationsCache = mergedNotifs;
      saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notificationsCache);
    }

    notifyListeners();
    return { success: true, message: 'Sincronización completada' };
  } catch (err: any) {
    console.error('Error during Supabase synchronization:', err);
    return { success: false, message: err?.message || 'Error de sincronización con Supabase' };
  }
}

// Real-time listener setup for Supabase
let activeRealtimeChannel: RealtimeChannel | null = null;

export function disconnectSupabaseRealtime() {
  const supabase = getSupabaseClient();
  if (activeRealtimeChannel && supabase) {
    try {
      supabase.removeChannel(activeRealtimeChannel);
    } catch {
      // ignore
    }
    activeRealtimeChannel = null;
  }
}

export function setupSupabaseRealtime() {
  const supabase = getSupabaseClient();
  if (!supabase) return () => {};

  // Clean up any previously active channel
  if (activeRealtimeChannel) {
    try {
      supabase.removeChannel(activeRealtimeChannel);
    } catch {
      // ignore
    }
    activeRealtimeChannel = null;
  }

  // Remove any stale channels matching our topic to avoid "callbacks after subscribe" error
  try {
    const existingChannels = supabase.getChannels();
    for (const ch of existingChannels) {
      if (ch.topic && ch.topic.includes('edugrade-realtime')) {
        supabase.removeChannel(ch);
      }
    }
  } catch {
    // ignore
  }

  // Use a unique channel name so each subscription creates a clean un-subscribed channel instance
  const channelName = `edugrade-realtime-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const channel = supabase.channel(channelName);
  activeRealtimeChannel = channel;

  channel
    .on(
      'postgres_changes',
      { event: '*', schema: 'public' },
      () => {
        syncWithSupabase();
      }
    )
    .subscribe();

  return () => {
    if (activeRealtimeChannel === channel) {
      activeRealtimeChannel = null;
    }
    try {
      supabase.removeChannel(channel);
    } catch {
      // ignore
    }
  };
}

// Getters
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
    if (n.studentId && studentId && n.studentId === studentId) return true;
    if (n.groupId && groupId && n.groupId === groupId) return true;
    if (!n.studentId && !n.groupId) return true;
    if (!studentId && !groupId) return true;
    return false;
  });
}

// Store mutations with immediate local persistence
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

export async function deleteGroup(groupId: string): Promise<void> {
  groupsCache = groupsCache.filter((g) => g.id !== groupId);
  
  // Cascade delete in memory & local storage
  const deletedSubjects = subjectsCache.filter((s) => s.groupId === groupId);
  subjectsCache = subjectsCache.filter((s) => s.groupId !== groupId);
  
  const deletedActivities = activitiesCache.filter((a) => a.groupId === groupId);
  activitiesCache = activitiesCache.filter((a) => a.groupId !== groupId);
  
  const deletedStudents = studentsCache.filter((st) => st.groupId === groupId);
  studentsCache = studentsCache.filter((st) => st.groupId !== groupId);

  const actIds = new Set(deletedActivities.map((a) => a.id));
  const studentIds = new Set(deletedStudents.map((s) => s.id));

  gradesCache = gradesCache.filter((g) => !actIds.has(g.activityId) && !studentIds.has(g.studentId));
  coevaluationsCache = coevaluationsCache.filter(
    (c) => !actIds.has(c.activityId) && !studentIds.has(c.evaluatorStudentId) && !studentIds.has(c.evaluatedStudentId)
  );
  notificationsCache = notificationsCache.filter(
    (n) => n.groupId !== groupId && (!n.studentId || !studentIds.has(n.studentId))
  );

  saveToStorage(STORAGE_KEYS.GROUPS, groupsCache);
  saveToStorage(STORAGE_KEYS.SUBJECTS, subjectsCache);
  saveToStorage(STORAGE_KEYS.ACTIVITIES, activitiesCache);
  saveToStorage(STORAGE_KEYS.STUDENTS, studentsCache);
  saveToStorage(STORAGE_KEYS.GRADES, gradesCache);
  saveToStorage(STORAGE_KEYS.COEVALUATIONS, coevaluationsCache);
  saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notificationsCache);

  notifyListeners();
  deleteRecordFromSupabase('grade_groups', groupId);
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

export async function deleteSubject(subjectId: string): Promise<void> {
  subjectsCache = subjectsCache.filter((s) => s.id !== subjectId);
  const deletedActivities = activitiesCache.filter((a) => a.subjectId === subjectId);
  activitiesCache = activitiesCache.filter((a) => a.subjectId !== subjectId);
  const actIds = new Set(deletedActivities.map((a) => a.id));

  gradesCache = gradesCache.filter((g) => !actIds.has(g.activityId));
  coevaluationsCache = coevaluationsCache.filter((c) => !actIds.has(c.activityId));
  notificationsCache = notificationsCache.filter((n) => !n.activityId || !actIds.has(n.activityId));

  saveToStorage(STORAGE_KEYS.SUBJECTS, subjectsCache);
  saveToStorage(STORAGE_KEYS.ACTIVITIES, activitiesCache);
  saveToStorage(STORAGE_KEYS.GRADES, gradesCache);
  saveToStorage(STORAGE_KEYS.COEVALUATIONS, coevaluationsCache);
  saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notificationsCache);

  notifyListeners();
  deleteRecordFromSupabase('subjects', subjectId);
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

export async function deleteActivity(activityId: string): Promise<void> {
  activitiesCache = activitiesCache.filter((a) => a.id !== activityId);
  gradesCache = gradesCache.filter((g) => g.activityId !== activityId);
  coevaluationsCache = coevaluationsCache.filter((c) => c.activityId !== activityId);
  notificationsCache = notificationsCache.filter((n) => n.activityId !== activityId);

  saveToStorage(STORAGE_KEYS.ACTIVITIES, activitiesCache);
  saveToStorage(STORAGE_KEYS.GRADES, gradesCache);
  saveToStorage(STORAGE_KEYS.COEVALUATIONS, coevaluationsCache);
  saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notificationsCache);

  notifyListeners();
  deleteRecordFromSupabase('activities', activityId);
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

export async function deleteStudent(studentId: string): Promise<void> {
  studentsCache = studentsCache.filter((s) => s.id !== studentId);
  gradesCache = gradesCache.filter((g) => g.studentId !== studentId);
  coevaluationsCache = coevaluationsCache.filter(
    (c) => c.evaluatorStudentId !== studentId && c.evaluatedStudentId !== studentId
  );
  notificationsCache = notificationsCache.filter((n) => n.studentId !== studentId);

  saveToStorage(STORAGE_KEYS.STUDENTS, studentsCache);
  saveToStorage(STORAGE_KEYS.GRADES, gradesCache);
  saveToStorage(STORAGE_KEYS.COEVALUATIONS, coevaluationsCache);
  saveToStorage(STORAGE_KEYS.NOTIFICATIONS, notificationsCache);

  notifyListeners();
  deleteRecordFromSupabase('students', studentId);
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

export async function clearAllData(): Promise<void> {
  groupsCache = [];
  subjectsCache = [];
  activitiesCache = [];
  studentsCache = [];
  gradesCache = [];
  coevaluationsCache = [];
  notificationsCache = [];

  saveToStorage(STORAGE_KEYS.GROUPS, []);
  saveToStorage(STORAGE_KEYS.SUBJECTS, []);
  saveToStorage(STORAGE_KEYS.ACTIVITIES, []);
  saveToStorage(STORAGE_KEYS.STUDENTS, []);
  saveToStorage(STORAGE_KEYS.GRADES, []);
  saveToStorage(STORAGE_KEYS.COEVALUATIONS, []);
  saveToStorage(STORAGE_KEYS.NOTIFICATIONS, []);

  notifyListeners();
}

// Initial boot
initStore();
