import React from 'react';
import { 
  GraduationCap, 
  Database, 
  Bell, 
  LogOut, 
  Shield, 
  User, 
  RefreshCw 
} from 'lucide-react';
import { UserSession, GradeGroup } from '../types';

interface NavbarProps {
  session: UserSession;
  onLogout: () => void;
  onOpenNotifications: () => void;
  onOpenSupabase: () => void;
  unreadNotificationsCount: number;
  isSupabaseConnected: boolean;
  isSyncing?: boolean;
  groups: GradeGroup[];
}

export const Navbar: React.FC<NavbarProps> = ({
  session,
  onLogout,
  onOpenNotifications,
  onOpenSupabase,
  unreadNotificationsCount,
  isSupabaseConnected,
  isSyncing,
  groups,
}) => {
  const currentGroup = session.groupId ? groups.find((g) => g.id === session.groupId) : null;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-indigo-200">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-slate-900">EduGrade</span>
              <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">Portal Académico &amp; Coevaluación</p>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Supabase status button */}
          <button
            id="btn-navbar-supabase"
            onClick={onOpenSupabase}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 border transition-all ${
              isSupabaseConnected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
            }`}
            title="Estado de conexión con Supabase"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden md:inline">
              {isSupabaseConnected ? 'Supabase Conectado' : 'Modo Local'}
            </span>
            {isSyncing ? (
              <RefreshCw className="w-3 h-3 animate-spin text-indigo-600" />
            ) : (
              <span
                className={`w-2 h-2 rounded-full ${
                  isSupabaseConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                }`}
              />
            )}
          </button>

          {/* Notifications bell */}
          <button
            id="btn-navbar-notifications"
            onClick={onOpenNotifications}
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Ver notificaciones"
          >
            <Bell className="w-5 h-5" />
            {unreadNotificationsCount > 0 && (
              <span
                id="badge-unread-notifications"
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center border-2 border-white shadow-xs"
              >
                {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
              </span>
            )}
          </button>

          <div className="h-6 w-px bg-slate-200 mx-1 hidden sm:block" />

          {/* Session Profile badge */}
          <div className="flex items-center gap-3">
            {session.role === 'admin' ? (
              <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl">
                <div className="p-1 bg-indigo-600 text-white rounded-lg">
                  <Shield className="w-3.5 h-3.5" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold text-slate-900 leading-tight">Administrador</p>
                  <p className="text-[10px] text-slate-500">Docente &amp; Gestión</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl">
                <div className="p-1 bg-emerald-600 text-white rounded-lg">
                  <User className="w-3.5 h-3.5" />
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-xs font-bold text-slate-900 leading-tight truncate max-w-[130px]">
                    {session.studentName || 'Estudiante'}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate max-w-[130px]">
                    ID: {session.studentId} {currentGroup ? `• ${currentGroup.name}` : ''}
                  </p>
                </div>
              </div>
            )}

            {/* Logout button */}
            <button
              id="btn-navbar-logout"
              onClick={onLogout}
              className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5"
              title="Cerrar sesión privada"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
