import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY_URL = 'edugrade_supabase_url';
const STORAGE_KEY_KEY = 'edugrade_supabase_anon_key';

let cachedClient: SupabaseClient | null = null;
let currentUrl: string = '';
let currentKey: string = '';

export function getStoredSupabaseCredentials(): { url: string; anonKey: string } {
  const metaEnv = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  const envUrl = metaEnv?.VITE_SUPABASE_URL || '';
  const envKey = metaEnv?.VITE_SUPABASE_ANON_KEY || '';

  const storedUrl = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_URL) || '' : '';
  const storedKey = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_KEY) || '' : '';

  return {
    url: storedUrl || envUrl,
    anonKey: storedKey || envKey,
  };
}

export function saveSupabaseCredentials(url: string, anonKey: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY_URL, url.trim());
    localStorage.setItem(STORAGE_KEY_KEY, anonKey.trim());
  }
  if (cachedClient) {
    try {
      cachedClient.removeAllChannels();
    } catch {
      // ignore
    }
  }
  cachedClient = null; // reset so client is re-created
}

export function clearSupabaseCredentials() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_URL);
    localStorage.removeItem(STORAGE_KEY_KEY);
  }
  if (cachedClient) {
    try {
      cachedClient.removeAllChannels();
    } catch {
      // ignore
    }
  }
  cachedClient = null;
}

export function getSupabaseClient(): SupabaseClient | null {
  const { url, anonKey } = getStoredSupabaseCredentials();

  if (!url || !anonKey) {
    return null;
  }

  if (cachedClient && currentUrl === url && currentKey === anonKey) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, anonKey, {
      auth: {
        persistSession: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    currentUrl = url;
    currentKey = anonKey;
    return cachedClient;
  } catch (err) {
    console.warn('Error al inicializar cliente Supabase:', err);
    return null;
  }
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const testClient = createClient(url, anonKey);
    // Intentar una consulta básica rápida
    const { error } = await testClient.from('grade_groups').select('id').limit(1);
    if (error && error.code !== 'PGRST116' && !error.message.includes('relation "grade_groups" does not exist')) {
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

export const SUPABASE_SQL_SCHEMA = `-- ==========================================
-- SCRIPT SQL PARA SUPABASE (EduGrade)
-- Copia y pega esto en el SQL Editor de Supabase
-- ==========================================

-- 1. Tabla de Grupos / Grados
CREATE TABLE IF NOT EXISTS public.grade_groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  academic_year TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de Materias
CREATE TABLE IF NOT EXISTS public.subjects (
  id TEXT PRIMARY KEY,
  group_id TEXT REFERENCES public.grade_groups(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  teacher_name TEXT NOT NULL,
  color TEXT DEFAULT '#4f46e5',
  credit_hours INTEGER DEFAULT 4
);

-- 3. Tabla de Estudiantes (Llave primaria: Identificación)
CREATE TABLE IF NOT EXISTS public.students (
  id TEXT PRIMARY KEY, -- Identificación / Documento del estudiante
  full_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  group_id TEXT REFERENCES public.grade_groups(id) ON DELETE RESTRICT,
  email TEXT,
  registered_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de Actividades y Tareas
CREATE TABLE IF NOT EXISTS public.activities (
  id TEXT PRIMARY KEY,
  subject_id TEXT REFERENCES public.subjects(id) ON DELETE CASCADE,
  group_id TEXT REFERENCES public.grade_groups(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  due_date TIMESTAMPTZ NOT NULL,
  weight_percentage NUMERIC DEFAULT 20,
  max_score NUMERIC DEFAULT 5.0,
  allow_coevaluation BOOLEAN DEFAULT false,
  coevaluation_active BOOLEAN DEFAULT false,
  coevaluation_due_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabla de Calificaciones / Notas
CREATE TABLE IF NOT EXISTS public.grade_records (
  id TEXT PRIMARY KEY,
  activity_id TEXT REFERENCES public.activities(id) ON DELETE CASCADE,
  student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
  score NUMERIC NOT NULL,
  feedback TEXT,
  graded_at TIMESTAMPTZ DEFAULT NOW(),
  graded_by TEXT DEFAULT 'Docente',
  UNIQUE (activity_id, student_id)
);

-- 6. Tabla de Coevaluación (Evaluación entre pares de uno en uno)
CREATE TABLE IF NOT EXISTS public.coevaluations (
  id TEXT PRIMARY KEY,
  activity_id TEXT REFERENCES public.activities(id) ON DELETE CASCADE,
  evaluator_student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
  evaluated_student_id TEXT REFERENCES public.students(id) ON DELETE CASCADE,
  participation_score NUMERIC NOT NULL,
  responsibility_score NUMERIC NOT NULL,
  teamwork_score NUMERIC NOT NULL,
  quality_score NUMERIC NOT NULL,
  average_score NUMERIC NOT NULL,
  comments TEXT,
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(activity_id, evaluator_student_id, evaluated_student_id)
);

-- 7. Tabla de Notificaciones
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  student_id TEXT,
  group_id TEXT,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL,
  link_target TEXT,
  activity_id TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar publicaciones para Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.grade_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subjects;
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.grade_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.coevaluations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
`;
