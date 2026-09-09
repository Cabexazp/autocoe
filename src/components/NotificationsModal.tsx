import React, { useState } from 'react';
import { 
  Bell, 
  Clock, 
  CheckCircle, 
  Award, 
  Users, 
  CheckCheck, 
  Calendar,
  AlertTriangle 
} from 'lucide-react';
import { NotificationItem, Activity, Subject } from '../types';
import { markNotificationAsRead, markAllNotificationsAsRead } from '../services/dataStore';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: NotificationItem[];
  activities: Activity[];
  subjects: Subject[];
  studentId?: string;
  groupId?: string;
  onSelectActivity?: (activityId: string) => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({
  isOpen,
  onClose,
  notifications,
  activities,
  subjects,
  studentId,
  groupId,
  onSelectActivity,
}) => {
  const [filter, setFilter] = useState<'all' | 'activity_due' | 'grade_posted' | 'coevaluation_open'>('all');

  if (!isOpen) return null;

  const filtered = notifications.filter((n) => {
    if (filter === 'all') return true;
    return n.type === filter;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const handleMarkAllRead = () => {
    markAllNotificationsAsRead(studentId, groupId);
  };

  const getActivityDetails = (activityId?: string) => {
    if (!activityId) return null;
    const act = activities.find((a) => a.id === activityId);
    if (!act) return null;
    const sub = subjects.find((s) => s.id === act.subjectId);
    return { activity: act, subject: sub };
  };

  const getUrgencyBadge = (dueDateString?: string) => {
    if (!dueDateString) return null;
    const due = new Date(dueDateString).getTime();
    const now = Date.now();
    const diffHours = (due - now) / (1000 * 60 * 60);

    if (diffHours < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
          <AlertTriangle className="w-3 h-3" /> Vencida
        </span>
      );
    } else if (diffHours <= 24) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
          <Clock className="w-3 h-3" /> Vence en {Math.ceil(diffHours)}h
        </span>
      );
    } else {
      const days = Math.ceil(diffHours / 24);
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
          <Calendar className="w-3 h-3" /> Vence en {days} días
        </span>
      );
    }
  };

  return (
    <div id="notifications-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div id="notifications-card" className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Centro de Notificaciones</h2>
                {unreadCount > 0 && (
                  <span className="bg-rose-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">
                    {unreadCount} nuevas
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">Avisos de tareas pendientes, notas y coevaluación</p>
            </div>
          </div>
          <button
            id="btn-close-notifications"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Filter Pills & Actions */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-1.5">
            <button
              id="filter-notif-all"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              id="filter-notif-due"
              onClick={() => setFilter('activity_due')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === 'activity_due'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Tareas Pendientes
            </button>
            <button
              id="filter-notif-grades"
              onClick={() => setFilter('grade_posted')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === 'grade_posted'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Calificaciones
            </button>
            <button
              id="filter-notif-coeval"
              onClick={() => setFilter('coevaluation_open')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                filter === 'coevaluation_open'
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Coevaluación
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              id="btn-mark-all-read"
              onClick={handleMarkAllRead}
              className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Marcar leídas
            </button>
          )}
        </div>

        {/* Notifications List */}
        <div className="overflow-y-auto p-4 flex-1 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-medium text-slate-600">No hay notificaciones en esta categoría</p>
              <p className="text-xs text-slate-400 mt-0.5">Te avisaremos cuando haya nuevas tareas o calificaciones</p>
            </div>
          ) : (
            filtered.map((item) => {
              const details = getActivityDetails(item.activityId);
              return (
                <div
                  key={item.id}
                  id={`notif-item-${item.id}`}
                  onClick={() => {
                    if (!item.isRead) markNotificationAsRead(item.id);
                    if (item.activityId && onSelectActivity) {
                      onSelectActivity(item.activityId);
                      onClose();
                    }
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    !item.isRead
                      ? 'bg-indigo-50/50 border-indigo-200 hover:bg-indigo-50'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 mt-0.5">
                      {item.type === 'activity_due' && (
                        <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
                          <Clock className="w-4 h-4" />
                        </div>
                      )}
                      {item.type === 'grade_posted' && (
                        <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                          <Award className="w-4 h-4" />
                        </div>
                      )}
                      {item.type === 'coevaluation_open' && (
                        <div className="p-2 bg-purple-100 text-purple-700 rounded-lg">
                          <Users className="w-4 h-4" />
                        </div>
                      )}
                      {item.type === 'system' && (
                        <div className="p-2 bg-slate-100 text-slate-700 rounded-lg">
                          <Bell className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-slate-900 truncate">{item.title}</h4>
                        <span className="text-[11px] text-slate-400 shrink-0">
                          {new Date(item.createdAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed mb-2">{item.message}</p>

                      <div className="flex flex-wrap items-center gap-2">
                        {details?.subject && (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-md text-white"
                            style={{ backgroundColor: details.subject.color || '#4f46e5' }}
                          >
                            {details.subject.name}
                          </span>
                        )}
                        {details?.activity && getUrgencyBadge(details.activity.dueDate)}
                        {!item.isRead && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 inline-block ml-auto" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs text-slate-500">
          <span>Actualizado en tiempo real</span>
          <button
            id="btn-close-notif-bottom"
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
