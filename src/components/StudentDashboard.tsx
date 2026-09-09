import React, { useState } from 'react';
import { 
  BookOpen, 
  Award, 
  Star, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  User, 
  Users, 
  ArrowRight, 
  ArrowLeft, 
  MessageSquare, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Percent
} from 'lucide-react';
import { 
  GradeGroup, 
  Subject, 
  Activity, 
  Student, 
  GradeRecord, 
  CoevaluationRecord 
} from '../types';
import { submitCoevaluation } from '../services/dataStore';

interface StudentDashboardProps {
  currentStudent: Student;
  currentGroup?: GradeGroup;
  subjects: Subject[];
  activities: Activity[];
  classmates: Student[]; // other students in the same group
  grades: GradeRecord[];
  coevaluations: CoevaluationRecord[];
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({
  currentStudent,
  currentGroup,
  subjects,
  activities,
  classmates,
  grades,
  coevaluations,
}) => {
  const [activeTab, setActiveTab] = useState<'grades_progress' | 'coevaluation' | 'pending_tasks'>('grades_progress');
  const [expandedSubjectId, setExpandedSubjectId] = useState<string | null>(subjects[0]?.id || null);

  // Coevaluation state
  const activeCoevalActivities = activities.filter(
    (a) => a.groupId === currentStudent.groupId && a.coevaluationActive
  );
  const [selectedCoevalActId, setSelectedCoevalActId] = useState<string>(
    activeCoevalActivities[0]?.id || ''
  );

  // Peer evaluation step index (de uno en uno)
  const peerClassmates = classmates.filter((c) => c.id !== currentStudent.id);
  const [currentPeerIndex, setCurrentPeerIndex] = useState(0);

  // Peer form ratings
  const [peerParticipation, setPeerParticipation] = useState(5);
  const [peerResponsibility, setPeerResponsibility] = useState(5);
  const [peerTeamwork, setPeerTeamwork] = useState(5);
  const [peerQuality, setPeerQuality] = useState(5);
  const [peerComments, setPeerComments] = useState('');
  const [coevalSaveSuccess, setCoevalSaveSuccess] = useState(false);

  const activeCoevalActivity = activeCoevalActivities.find((a) => a.id === selectedCoevalActId);
  const currentTargetPeer = peerClassmates[currentPeerIndex];

  // Check if current target peer is already evaluated in this activity
  const existingCoevalForPeer = coevaluations.find(
    (c) =>
      c.activityId === selectedCoevalActId &&
      c.evaluatorStudentId === currentStudent.id &&
      c.evaluatedStudentId === currentTargetPeer?.id
  );

  // Load ratings when switching peer
  React.useEffect(() => {
    if (existingCoevalForPeer) {
      setPeerParticipation(existingCoevalForPeer.scores.participation);
      setPeerResponsibility(existingCoevalForPeer.scores.responsibility);
      setPeerTeamwork(existingCoevalForPeer.scores.teamwork);
      setPeerQuality(existingCoevalForPeer.scores.quality);
      setPeerComments(existingCoevalForPeer.comments || '');
    } else {
      setPeerParticipation(5);
      setPeerResponsibility(5);
      setPeerTeamwork(5);
      setPeerQuality(5);
      setPeerComments('');
    }
  }, [currentPeerIndex, selectedCoevalActId, existingCoevalForPeer]);

  // Overall GPA Calculation
  const studentGrades = grades.filter((g) => g.studentId === currentStudent.id);
  const overallAverage = studentGrades.length > 0
    ? studentGrades.reduce((sum, g) => sum + g.score, 0) / studentGrades.length
    : 0;

  // Received peer ratings for this student
  const receivedCoevals = coevaluations.filter(
    (c) => c.evaluatedStudentId === currentStudent.id
  );
  const averageReceivedCoeval = receivedCoevals.length > 0
    ? receivedCoevals.reduce((sum, c) => sum + c.averageScore, 0) / receivedCoevals.length
    : null;

  // Calculate subject progress and current average
  const getSubjectMetrics = (subjectId: string) => {
    const subActs = activities.filter((a) => a.subjectId === subjectId);
    let weightedEarned = 0;
    let totalWeightGraded = 0;
    let totalSubjectWeight = 0;
    let gradedCount = 0;

    subActs.forEach((act) => {
      totalSubjectWeight += act.weightPercentage;
      const g = studentGrades.find((gr) => gr.activityId === act.id);
      if (g !== undefined) {
        gradedCount++;
        totalWeightGraded += act.weightPercentage;
        // Standardize score to max 5.0 scale for calculation
        const normalized = (g.score / act.maxScore) * 5.0;
        weightedEarned += normalized * (act.weightPercentage / 100);
      }
    });

    const currentAccumulated = totalWeightGraded > 0
      ? (weightedEarned / (totalWeightGraded / 100))
      : 0;

    const progressPercentage = totalSubjectWeight > 0
      ? Math.round((totalWeightGraded / totalSubjectWeight) * 100)
      : 0;

    return {
      activities: subActs,
      gradedCount,
      totalCount: subActs.length,
      currentAccumulated: Number(currentAccumulated.toFixed(1)),
      progressPercentage,
      weightedEarned: Number(weightedEarned.toFixed(2)),
    };
  };

  // Submit coevaluation for peer
  const handleSubmitPeerEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCoevalActivity || !currentTargetPeer) return;

    const avg = Number(
      ((peerParticipation + peerResponsibility + peerTeamwork + peerQuality) / 4).toFixed(1)
    );

    await submitCoevaluation({
      activityId: activeCoevalActivity.id,
      evaluatorStudentId: currentStudent.id,
      evaluatedStudentId: currentTargetPeer.id,
      scores: {
        participation: peerParticipation,
        responsibility: peerResponsibility,
        teamwork: peerTeamwork,
        quality: peerQuality,
      },
      averageScore: avg,
      comments: peerComments.trim(),
    });

    setCoevalSaveSuccess(true);
    setTimeout(() => {
      setCoevalSaveSuccess(false);
      // Auto move to next peer if available
      if (currentPeerIndex < peerClassmates.length - 1) {
        setCurrentPeerIndex((prev) => prev + 1);
      }
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Student Profile Card */}
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-xs border border-slate-200 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-indigo-50 to-emerald-50 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white flex items-center justify-center text-2xl font-black shadow-lg shadow-indigo-100">
              {currentStudent.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  {currentStudent.fullName}
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  Estudiante Activo
                </span>
              </div>
              <p className="text-xs text-slate-500 flex flex-wrap items-center gap-3">
                <span className="font-mono font-semibold text-slate-700">
                  ID: {currentStudent.id}
                </span>
                <span>•</span>
                <span className="font-semibold text-indigo-700">
                  Grado: {currentGroup?.name || 'Asignado'} ({currentGroup?.code || 'G'})
                </span>
                <span>•</span>
                <span>Año Lectivo {currentGroup?.academicYear || '2026'}</span>
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-4 shrink-0">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center min-w-[120px]">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                Promedio General
              </span>
              <span className="text-2xl font-black text-indigo-700 mt-0.5 block">
                {overallAverage > 0 ? overallAverage.toFixed(1) : '—'}
              </span>
              <span className="text-[10px] text-slate-400">Escala de 0.0 a 5.0</span>
            </div>

            {averageReceivedCoeval !== null && (
              <div className="p-4 bg-purple-50 rounded-2xl border border-purple-200 text-center min-w-[120px]">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700 block flex items-center justify-center gap-1">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                  Coevaluación
                </span>
                <span className="text-2xl font-black text-purple-900 mt-0.5 block">
                  {averageReceivedCoeval.toFixed(1)}
                </span>
                <span className="text-[10px] text-purple-600">Por tus compañeros</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-4 overflow-x-auto shadow-xs">
        <button
          id="tab-student-grades"
          onClick={() => setActiveTab('grades_progress')}
          className={`py-3.5 px-5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'grades_progress'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Award className="w-4 h-4" />
          Mis Calificaciones y Progreso
        </button>

        <button
          id="tab-student-coeval"
          onClick={() => setActiveTab('coevaluation')}
          className={`py-3.5 px-5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'coevaluation'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Star className="w-4 h-4 text-amber-500" />
          Panel de Coevaluación
          {activeCoevalActivities.length > 0 && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-full">
              Habilitado
            </span>
          )}
        </button>

        <button
          id="tab-student-tasks"
          onClick={() => setActiveTab('pending_tasks')}
          className={`py-3.5 px-5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'pending_tasks'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Tareas Pendientes
        </button>
      </div>

      {/* TAB 1: CALIFICACIONES Y PROGRESO POR MATERIA */}
      {activeTab === 'grades_progress' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {subjects.map((sub) => {
              const metrics = getSubjectMetrics(sub.id);
              const isExpanded = expandedSubjectId === sub.id;

              return (
                <div
                  key={sub.id}
                  id={`subject-card-${sub.id}`}
                  className={`bg-white rounded-2xl border transition-all overflow-hidden flex flex-col ${
                    isExpanded
                      ? 'border-indigo-500 shadow-md ring-1 ring-indigo-500'
                      : 'border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="h-2 w-full" style={{ backgroundColor: sub.color }} />

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">
                          {sub.code}
                        </span>
                        <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {sub.creditHours} hrs/sem
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 leading-snug">{sub.name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">{sub.teacherName}</p>

                      {/* Grade and Progress Bar */}
                      <div className="mt-5 p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-slate-500 font-medium">Nota Acumulada:</span>
                          <span className="font-extrabold text-sm text-slate-900">
                            {metrics.gradedCount > 0 ? metrics.currentAccumulated.toFixed(1) : 'Pendiente'}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-2">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${metrics.progressPercentage}%`,
                              backgroundColor: sub.color,
                            }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[11px] text-slate-500 mt-1.5">
                          <span>{metrics.gradedCount} de {metrics.totalCount} evaluadas</span>
                          <span className="font-bold">{metrics.progressPercentage}% del periodo</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setExpandedSubjectId(isExpanded ? null : sub.id)}
                      className="mt-4 w-full py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4" />
                          Ocultar Desglose de Notas
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4" />
                          Ver Actividades y Notas ({metrics.totalCount})
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Expanded Subject Detailed Breakdown */}
          {expandedSubjectId && (
            <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200 animate-in fade-in duration-200">
              {(() => {
                const sub = subjects.find((s) => s.id === expandedSubjectId);
                if (!sub) return null;
                const metrics = getSubjectMetrics(sub.id);

                return (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200 mb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3.5 h-3.5 rounded-full"
                            style={{ backgroundColor: sub.color }}
                          />
                          <h3 className="text-lg font-bold text-slate-900">
                            Desglose de Calificaciones: {sub.name}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Docente: {sub.teacherName} • Año Lectivo 2026
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-semibold text-slate-500 block">
                          Promedio Ponderado
                        </span>
                        <span className="text-2xl font-black text-indigo-700">
                          {metrics.gradedCount > 0 ? metrics.currentAccumulated.toFixed(1) : 'Sin notas aún'}
                        </span>
                      </div>
                    </div>

                    {metrics.activities.length === 0 ? (
                      <p className="text-xs text-slate-400 py-6 text-center">
                        No hay actividades registradas en esta materia aún.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                            <tr>
                              <th className="py-3 px-4">Actividad</th>
                              <th className="py-3 px-4">Fecha Entrega</th>
                              <th className="py-3 px-4">Ponderación</th>
                              <th className="py-3 px-4">Calificación Obtenida</th>
                              <th className="py-3 px-4">Retroalimentación del Docente</th>
                              <th className="py-3 px-4 text-right">Aporte al Periodo</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {metrics.activities.map((act) => {
                              const grade = studentGrades.find((g) => g.activityId === act.id);
                              const isGraded = grade !== undefined;

                              return (
                                <tr key={act.id} className="hover:bg-slate-50">
                                  <td className="py-3.5 px-4 font-semibold text-slate-900">
                                    {act.title}
                                    <span className="block text-[11px] text-slate-500 font-normal mt-0.5">
                                      {act.description}
                                    </span>
                                  </td>
                                  <td className="py-3.5 px-4 text-slate-600">
                                    {new Date(act.dueDate).toLocaleDateString('es-ES', {
                                      day: 'numeric',
                                      month: 'short',
                                    })}
                                  </td>
                                  <td className="py-3.5 px-4 font-semibold text-slate-700">
                                    {act.weightPercentage}%
                                  </td>
                                  <td className="py-3.5 px-4">
                                    {isGraded ? (
                                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        {grade.score.toFixed(1)} / {act.maxScore.toFixed(1)}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                                        Por calificar
                                      </span>
                                    )}
                                  </td>
                                  <td className="py-3.5 px-4 text-slate-600 italic">
                                    {grade?.feedback ? `"${grade.feedback}"` : '—'}
                                  </td>
                                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-800">
                                    {isGraded
                                      ? `+${((grade.score / act.maxScore) * (act.weightPercentage / 100) * 5.0).toFixed(2)} pts`
                                      : '0.00 pts'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PANEL DE COEVALUACIÓN DE UNO EN UNO */}
      {activeTab === 'coevaluation' && (
        <div className="space-y-6">
          {activeCoevalActivities.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs max-w-xl mx-auto">
              <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                No hay coevaluaciones activas en este momento
              </h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                El docente habilita los periodos de coevaluación para tareas específicas cuando el equipo finaliza su entregable. Recibirás una notificación inmediata cuando esté disponible.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Activity Selector for Coevaluation */}
              <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                    Actividad en Coevaluación Habilitada por el Docente
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Evalúa el desempeño y trabajo en equipo de tus compañeros de grupo de uno en uno.
                  </p>
                </div>

                <select
                  id="student-coeval-act-select"
                  value={selectedCoevalActId}
                  onChange={(e) => {
                    setSelectedCoevalActId(e.target.value);
                    setCurrentPeerIndex(0);
                  }}
                  className="px-4 py-2 bg-purple-50 border border-purple-200 text-purple-900 rounded-xl text-xs font-bold"
                >
                  {activeCoevalActivities.map((act) => (
                    <option key={act.id} value={act.id}>
                      {act.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* ONE-BY-ONE PEER EVALUATION STEPPER */}
              {peerClassmates.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-slate-200">
                  <p className="text-xs text-slate-500">
                    No hay otros compañeros registrados en tu grado ({currentGroup?.name}) para evaluar.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Left Column: Classmates List with Status */}
                  <div className="lg:col-span-1 bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center justify-between">
                      <span>Compañeros de Grupo</span>
                      <span className="text-indigo-600 font-bold">
                        {currentPeerIndex + 1} de {peerClassmates.length}
                      </span>
                    </h4>

                    <div className="space-y-2">
                      {peerClassmates.map((peer, idx) => {
                        const peerCoeval = coevaluations.find(
                          (c) =>
                            c.activityId === selectedCoevalActId &&
                            c.evaluatorStudentId === currentStudent.id &&
                            c.evaluatedStudentId === peer.id
                        );
                        const isSelected = idx === currentPeerIndex;

                        return (
                          <button
                            key={peer.id}
                            type="button"
                            onClick={() => setCurrentPeerIndex(idx)}
                            className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'border-purple-600 bg-purple-50/70 shadow-xs'
                                : 'border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                                  isSelected
                                    ? 'bg-purple-700 text-white'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {peer.fullName.charAt(0)}
                              </div>
                              <div className="truncate">
                                <p className="text-xs font-bold text-slate-900 truncate">
                                  {peer.fullName}
                                </p>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ID: {peer.id}
                                </span>
                              </div>
                            </div>

                            {peerCoeval ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full shrink-0">
                                {peerCoeval.averageScore.toFixed(1)} ★
                              </span>
                            ) : (
                              <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 shrink-0">
                                Pendiente
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right Column: Form for Evaluated Peer (DE UNO EN UNO) */}
                  <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
                    {currentTargetPeer ? (
                      <form onSubmit={handleSubmitPeerEvaluation} className="space-y-5">
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                          <div>
                            <span className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
                              Evaluando a tu compañero (Paso {currentPeerIndex + 1} de {peerClassmates.length})
                            </span>
                            <h3 className="text-lg font-black text-slate-900 mt-0.5">
                              {currentTargetPeer.fullName}
                            </h3>
                            <p className="text-xs text-slate-400 font-mono">
                              Documento: {currentTargetPeer.id}
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-medium text-slate-500 block">
                              Promedio Asignado
                            </span>
                            <span className="text-2xl font-black text-purple-700">
                              {((peerParticipation + peerResponsibility + peerTeamwork + peerQuality) / 4).toFixed(1)}
                            </span>
                          </div>
                        </div>

                        {coevalSaveSuccess && (
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-in fade-in">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            ¡Evaluación de {currentTargetPeer.fullName} guardada con éxito!
                          </div>
                        )}

                        {/* Rubric Criteria with Star Sliders */}
                        <div className="space-y-4">
                          {/* Criterion 1: Participation */}
                          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-slate-800">
                                1. Participación y Aportes Constructivos
                              </span>
                              <span className="font-extrabold text-indigo-700 text-sm">
                                {peerParticipation.toFixed(1)} / 5.0
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mb-2">
                              Aportó ideas de valor en las discusiones y participó activamente en la resolución.
                            </p>
                            <input
                              type="range"
                              min="1"
                              max="5"
                              step="0.5"
                              value={peerParticipation}
                              onChange={(e) => setPeerParticipation(Number(e.target.value))}
                              className="w-full accent-purple-600 cursor-pointer"
                            />
                          </div>

                          {/* Criterion 2: Responsibility */}
                          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-slate-800">
                                2. Responsabilidad y Puntualidad
                              </span>
                              <span className="font-extrabold text-indigo-700 text-sm">
                                {peerResponsibility.toFixed(1)} / 5.0
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mb-2">
                              Cumplió con su parte asignada a tiempo sin retrasar al equipo.
                            </p>
                            <input
                              type="range"
                              min="1"
                              max="5"
                              step="0.5"
                              value={peerResponsibility}
                              onChange={(e) => setPeerResponsibility(Number(e.target.value))}
                              className="w-full accent-purple-600 cursor-pointer"
                            />
                          </div>

                          {/* Criterion 3: Teamwork */}
                          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-slate-800">
                                3. Trabajo en Equipo y Comunicación
                              </span>
                              <span className="font-extrabold text-indigo-700 text-sm">
                                {peerTeamwork.toFixed(1)} / 5.0
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mb-2">
                              Fue respetuoso, receptivo al feedback y facilitó el buen ambiente grupal.
                            </p>
                            <input
                              type="range"
                              min="1"
                              max="5"
                              step="0.5"
                              value={peerTeamwork}
                              onChange={(e) => setPeerTeamwork(Number(e.target.value))}
                              className="w-full accent-purple-600 cursor-pointer"
                            />
                          </div>

                          {/* Criterion 4: Quality */}
                          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="font-bold text-slate-800">
                                4. Calidad del Trabajo y Esfuerzo
                              </span>
                              <span className="font-extrabold text-indigo-700 text-sm">
                                {peerQuality.toFixed(1)} / 5.0
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mb-2">
                              La calidad de su aporte fue rigurosa, clara y sin errores graves.
                            </p>
                            <input
                              type="range"
                              min="1"
                              max="5"
                              step="0.5"
                              value={peerQuality}
                              onChange={(e) => setPeerQuality(Number(e.target.value))}
                              className="w-full accent-purple-600 cursor-pointer"
                            />
                          </div>

                          {/* Comments */}
                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                              Comentarios Constructivos para el Compañero
                            </label>
                            <textarea
                              rows={3}
                              placeholder="Describe brevemente qué fortalezas demostró tu compañero o qué aspectos puede mejorar..."
                              value={peerComments}
                              onChange={(e) => setPeerComments(e.target.value)}
                              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-purple-600 outline-hidden leading-relaxed"
                            />
                          </div>
                        </div>

                        {/* Navigation & Submit button */}
                        <div className="flex items-center justify-between pt-2">
                          <button
                            type="button"
                            disabled={currentPeerIndex === 0}
                            onClick={() => setCurrentPeerIndex((prev) => Math.max(0, prev - 1))}
                            className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            Anterior
                          </button>

                          <button
                            id="btn-save-peer-coeval"
                            type="submit"
                            className="px-5 py-2.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2"
                          >
                            <Star className="w-4 h-4 fill-amber-300 text-amber-300" />
                            Guardar Evaluación de {currentTargetPeer.fullName.split(' ')[0]}
                          </button>

                          <button
                            type="button"
                            disabled={currentPeerIndex >= peerClassmates.length - 1}
                            onClick={() => setCurrentPeerIndex((prev) => Math.min(peerClassmates.length - 1, prev + 1))}
                            className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition-colors flex items-center gap-1.5"
                          >
                            Siguiente
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </div>
                </div>
              )}

              {/* My Peer Feedback Received */}
              {receivedCoevals.length > 0 && (
                <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
                  <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    Retroalimentación de Coevaluación que Has Recibido
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {receivedCoevals.map((rc, i) => (
                      <div
                        key={rc.id || i}
                        className="p-3.5 bg-purple-50/50 border border-purple-100 rounded-xl text-xs"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-purple-900">
                            Evaluación por un compañero
                          </span>
                          <span className="font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded-md">
                            {rc.averageScore.toFixed(1)} / 5.0
                          </span>
                        </div>
                        <p className="text-slate-600 italic">
                          "{rc.comments || 'Excelente desempeño y compromiso.'}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: TAREAS PENDIENTES */}
      {activeTab === 'pending_tasks' && (
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
          <h3 className="text-base font-bold text-slate-900 mb-1">
            Tareas y Actividades Programadas para tu Grado
          </h3>
          <p className="text-xs text-slate-500 mb-5">
            Mantén al día tus entregas y revisa los porcentajes ponderados.
          </p>

          <div className="space-y-3">
            {activities.length === 0 ? (
              <p className="text-xs text-slate-400 py-6 text-center">
                No hay actividades pendientes en este momento.
              </p>
            ) : (
              activities.map((act) => {
                const sub = subjects.find((s) => s.id === act.subjectId);
                const grade = studentGrades.find((g) => g.activityId === act.id);
                const isGraded = grade !== undefined;

                const due = new Date(act.dueDate).getTime();
                const diffHours = (due - Date.now()) / (1000 * 60 * 60);
                const isOverdue = diffHours < 0;

                return (
                  <div
                    key={act.id}
                    className="p-4 rounded-xl border border-slate-200 hover:border-indigo-200 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-2.5 h-12 rounded-full shrink-0"
                        style={{ backgroundColor: sub?.color || '#4f46e5' }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white" style={{ backgroundColor: sub?.color || '#4f46e5' }}>
                            {sub?.name || 'Materia'}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            Entrega: {new Date(act.dueDate).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-1">{act.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">{act.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 shrink-0 justify-between md:justify-end">
                      <div className="text-right">
                        <span className="text-xs font-bold text-slate-800 block">
                          Valor: {act.weightPercentage}%
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Máx {act.maxScore.toFixed(1)} pts
                        </span>
                      </div>

                      <div>
                        {isGraded ? (
                          <span className="px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-100 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Calificada: {grade.score.toFixed(1)}
                          </span>
                        ) : isOverdue ? (
                          <span className="px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-100 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Fecha Pasada
                          </span>
                        ) : (
                          <span className="px-3 py-1.5 rounded-xl text-xs font-bold text-amber-800 bg-amber-100 flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5" />
                            En Curso
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
