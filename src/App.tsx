import React, { useState, useEffect } from 'react';
import { 
  UserSession, 
  GradeGroup, 
  Subject, 
  Activity, 
  Student, 
  GradeRecord, 
  CoevaluationRecord, 
  NotificationItem 
} from './types';
import { 
  subscribeToStore, 
  getGroups, 
  getSubjects, 
  getActivities, 
  getStudents, 
  getGrades, 
  getCoevaluations, 
  getNotifications, 
  syncWithSupabase,
  setupSupabaseRealtime 
} from './services/dataStore';
import { getStoredSupabaseCredentials, getSupabaseClient } from './services/supabase';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { AdminDashboard } from './components/AdminDashboard';
import { StudentDashboard } from './components/StudentDashboard';
import { SupabaseModal } from './components/SupabaseModal';
import { NotificationsModal } from './components/NotificationsModal';

const SESSION_STORAGE_KEY = 'edugrade_active_session';

export default function App() {
  // Session management
  const [session, setSession] = useState<UserSession>(() => {
    if (typeof window === 'undefined') return { role: null };
    try {
      const saved = localStorage.getItem(SESSION_STORAGE_KEY);
      return saved ? JSON.parse(saved) : { role: null };
    } catch {
      return { role: null };
    }
  });

  // Reactive store state
  const [groups, setGroups] = useState<GradeGroup[]>(getGroups);
  const [subjects, setSubjects] = useState<Subject[]>(getSubjects);
  const [activities, setActivities] = useState<Activity[]>(getActivities);
  const [students, setStudents] = useState<Student[]>(getStudents);
  const [grades, setGrades] = useState<GradeRecord[]>(getGrades);
  const [coevaluations, setCoevaluations] = useState<CoevaluationRecord[]>(getCoevaluations);
  const [notifications, setNotifications] = useState<NotificationItem[]>(getNotifications);

  // Modals state
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [isNotificationsModalOpen, setIsNotificationsModalOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Supabase connection status
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(() => {
    const creds = getStoredSupabaseCredentials();
    return Boolean(creds.url && creds.anonKey && getSupabaseClient());
  });

  // Subscribe to store updates
  useEffect(() => {
    const unsubscribe = subscribeToStore(() => {
      setGroups(getGroups());
      setSubjects(getSubjects());
      setActivities(getActivities());
      setStudents(getStudents());
      setGrades(getGrades());
      setCoevaluations(getCoevaluations());
      setNotifications(getNotifications());
    });

    // Check supabase credentials and start realtime
    const cleanupRealtime = setupSupabaseRealtime();

    return () => {
      unsubscribe();
      if (cleanupRealtime) {
        cleanupRealtime();
      }
    };
  }, []);

  // Update session in localStorage
  const handleLoginSuccess = (newSession: UserSession) => {
    setSession(newSession);
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    setSession({ role: null });
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch (e) {
      console.error(e);
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await syncWithSupabase();
    setIsSyncing(false);
  };

  // Find student if session role is 'student'
  const currentStudent = session.studentId
    ? students.find((s) => s.id === session.studentId)
    : undefined;

  const currentGroup = currentStudent
    ? groups.find((g) => g.id === currentStudent.groupId)
    : session.groupId
    ? groups.find((g) => g.id === session.groupId)
    : undefined;

  // Filter notifications for this session
  const relevantNotifications = getNotifications(session.studentId, currentGroup?.id);
  const unreadNotificationsCount = relevantNotifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* If no active user session, show Auth Portal */}
      {session.role === null ? (
        <AuthModal
          groups={groups}
          students={students}
          onLoginSuccess={handleLoginSuccess}
        />
      ) : (
        <>
          {/* Main Top Navigation */}
          <Navbar
            session={session}
            onLogout={handleLogout}
            onOpenNotifications={() => setIsNotificationsModalOpen(true)}
            onOpenSupabase={() => setIsSupabaseModalOpen(true)}
            unreadNotificationsCount={unreadNotificationsCount}
            isSupabaseConnected={isSupabaseConnected}
            isSyncing={isSyncing}
            groups={groups}
          />

          {/* Body Content */}
          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {session.role === 'admin' ? (
              <AdminDashboard
                groups={groups}
                subjects={subjects}
                activities={activities}
                students={students}
                grades={grades}
                coevaluations={coevaluations}
              />
            ) : currentStudent ? (
              <StudentDashboard
                currentStudent={currentStudent}
                currentGroup={currentGroup}
                subjects={subjects.filter((s) => s.groupId === currentStudent.groupId)}
                activities={activities.filter((a) => a.groupId === currentStudent.groupId)}
                classmates={students.filter((st) => st.groupId === currentStudent.groupId)}
                grades={grades}
                coevaluations={coevaluations}
              />
            ) : (
              <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center">
                <p className="text-sm font-semibold text-slate-700">
                  No se encontró el registro del estudiante. Por favor vuelve a iniciar sesión.
                </p>
                <button
                  onClick={handleLogout}
                  className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                >
                  Regresar al Inicio de Sesión
                </button>
              </div>
            )}
          </main>
        </>
      )}

      {/* Supabase Configuration Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        isConnected={isSupabaseConnected}
        onConnectionChange={() => {
          const creds = getStoredSupabaseCredentials();
          const connected = Boolean(creds.url && creds.anonKey && getSupabaseClient());
          setIsSupabaseConnected(connected);
          if (connected) {
            setupSupabaseRealtime();
          }
          handleManualSync();
        }}
      />

      {/* Notifications Modal */}
      <NotificationsModal
        isOpen={isNotificationsModalOpen}
        onClose={() => setIsNotificationsModalOpen(false)}
        notifications={relevantNotifications}
        activities={activities}
        subjects={subjects}
        studentId={session.studentId}
        groupId={currentGroup?.id}
      />
    </div>
  );
}
