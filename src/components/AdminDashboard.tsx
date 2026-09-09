import React, { useState } from 'react';
import { 
  Users, 
  BookOpen, 
  FolderPlus, 
  FileCheck, 
  Star, 
  Plus, 
  Save, 
  Calendar, 
  School, 
  Award, 
  Clock, 
  CheckCircle2, 
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Search,
  Percent,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { 
  GradeGroup, 
  Subject, 
  Activity, 
  Student, 
  GradeRecord, 
  CoevaluationRecord 
} from '../types';
import { 
  addGroup, 
  addSubject, 
  addActivity, 
  saveGrade, 
  toggleCoevaluationStatus,
  deleteGroup,
  deleteSubject,
  deleteActivity,
  deleteStudent,
  clearAllData
} from '../services/dataStore';

interface AdminDashboardProps {
  groups: GradeGroup[];
  subjects: Subject[];
  activities: Activity[];
  students: Student[];
  grades: GradeRecord[];
  coevaluations: CoevaluationRecord[];
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  groups,
  subjects,
  activities,
  students,
  grades,
  coevaluations,
}) => {
  const [activeTab, setActiveTab] = useState<'groups' | 'subjects' | 'activities' | 'grades' | 'coevaluation' | 'students'>(
    groups.length === 0 ? 'groups' : 'grades'
  );

  // Filter selections
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id || '');
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');
  const [selectedActivityId, setSelectedActivityId] = useState<string>('');

  // Keep selectedGroupId synced when groups change
  React.useEffect(() => {
    if (!selectedGroupId && groups.length > 0) {
      setSelectedGroupId(groups[0].id);
    } else if (selectedGroupId && !groups.some(g => g.id === selectedGroupId)) {
      setSelectedGroupId(groups[0]?.id || '');
    }
  }, [groups, selectedGroupId]);

  // Forms state: New Group
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupCode, setNewGroupCode] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupYear, setNewGroupYear] = useState('2026');

  // Forms state: New Subject
  const [newSubName, setNewSubName] = useState('');
  const [newSubCode, setNewSubCode] = useState('');
  const [newSubTeacher, setNewSubTeacher] = useState('');
  const [newSubColor, setNewSubColor] = useState('#4f46e5');
  const [newSubHours, setNewSubHours] = useState(4);

  // Forms state: New Activity
  const [newActTitle, setNewActTitle] = useState('');
  const [newActDesc, setNewActDesc] = useState('');
  const [newActDueDate, setNewActDueDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [newActWeight, setNewActWeight] = useState(25);
  const [newActMaxScore, setNewActMaxScore] = useState(5.0);
  const [newActAllowCoeval, setNewActAllowCoeval] = useState(true);

  // Quick grading inputs map: studentId -> { score: string, feedback: string }
  const [gradingDrafts, setGradingDrafts] = useState<Record<string, { score: string; feedback: string }>>({});
  const [savedFeedbackMap, setSavedFeedbackMap] = useState<Record<string, boolean>>({});

  // Student search filter
  const [studentSearch, setStudentSearch] = useState('');

  // Derived selections
  const currentGroupSubjects = subjects.filter((s) => s.groupId === selectedGroupId);
  const activeSubject = selectedSubjectId
    ? currentGroupSubjects.find((s) => s.id === selectedSubjectId)
    : currentGroupSubjects[0];

  const currentSubjectActivities = activeSubject
    ? activities.filter((a) => a.subjectId === activeSubject.id)
    : [];

  const activeActivity = selectedActivityId
    ? currentSubjectActivities.find((a) => a.id === selectedActivityId)
    : currentSubjectActivities[0];

  const currentGroupStudents = students.filter((st) => st.groupId === selectedGroupId);

  // Handlers for creating entities
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    const created = await addGroup({
      name: newGroupName.trim(),
      code: newGroupCode.trim() || newGroupName.trim().substring(0, 4).toUpperCase(),
      description: newGroupDesc.trim(),
      academicYear: newGroupYear.trim() || '2026',
    });

    setNewGroupName('');
    setNewGroupCode('');
    setNewGroupDesc('');
    setSelectedGroupId(created.id);
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubName.trim() || !selectedGroupId) return;

    const created = await addSubject({
      groupId: selectedGroupId,
      name: newSubName.trim(),
      code: newSubCode.trim() || newSubName.trim().substring(0, 3).toUpperCase(),
      teacherName: newSubTeacher.trim() || 'Docente Asignado',
      color: newSubColor,
      creditHours: Number(newSubHours) || 4,
    });

    setNewSubName('');
    setNewSubCode('');
    setNewSubTeacher('');
    setSelectedSubjectId(created.id);
  };

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newActTitle.trim() || !activeSubject || !selectedGroupId) return;

    const created = await addActivity({
      groupId: selectedGroupId,
      subjectId: activeSubject.id,
      title: newActTitle.trim(),
      description: newActDesc.trim(),
      dueDate: new Date(newActDueDate).toISOString(),
      weightPercentage: Number(newActWeight) || 20,
      maxScore: Number(newActMaxScore) || 5.0,
      allowCoevaluation: newActAllowCoeval,
      coevaluationActive: newActAllowCoeval,
      coevaluationDueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
    });

    setNewActTitle('');
    setNewActDesc('');
    setSelectedActivityId(created.id);
  };

  // Grade saving handler
  const handleSaveStudentGrade = async (studentId: string) => {
    if (!activeActivity) return;
    const draft = gradingDrafts[studentId];
    const scoreVal = draft?.score !== undefined 
      ? parseFloat(draft.score) 
      : (grades.find((g) => g.activityId === activeActivity.id && g.studentId === studentId)?.score ?? 5.0);

    if (isNaN(scoreVal) || scoreVal < 0 || scoreVal > activeActivity.maxScore) {
      alert(`La calificación debe ser un número entre 0.0 y ${activeActivity.maxScore}`);
      return;
    }

    const feedbackVal = draft?.feedback !== undefined
      ? draft.feedback
      : (grades.find((g) => g.activityId === activeActivity.id && g.studentId === studentId)?.feedback || '');

    await saveGrade({
      activityId: activeActivity.id,
      studentId,
      score: scoreVal,
      feedback: feedbackVal,
      gradedBy: activeSubject?.teacherName || 'Administrador',
    });

    setSavedFeedbackMap((prev) => ({ ...prev, [studentId]: true }));
    setTimeout(() => {
      setSavedFeedbackMap((prev) => ({ ...prev, [studentId]: false }));
    }, 2000);
  };

  // Toggle coevaluation handler
  const handleToggleCoevaluation = async (activityId: string, currentActive: boolean) => {
    await toggleCoevaluationStatus(activityId, !currentActive);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Context Selector */}
      <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Panel del Docente y Administrador</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800">
                Gestión Central
              </span>
              <button
                id="btn-admin-reset-all"
                type="button"
                onClick={() => {
                  if (window.confirm('¿Deseas reiniciar la aplicación a blanco? Esto eliminará todos los grados, materias, actividades y estudiantes creados localmente.')) {
                    clearAllData();
                  }
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors ml-auto sm:ml-2"
                title="Reiniciar a blanco"
              >
                <RotateCcw className="w-3 h-3" />
                Iniciar en Blanco
              </button>
            </div>
            <p className="text-sm text-slate-500">
              Crea grados, materias y actividades. Califica en tiempo real y gestiona la coevaluación entre pares.
            </p>
          </div>

          {/* Active Group Selector */}
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Grado Seleccionado
              </label>
              <span className="text-xs text-slate-400">Filtrando materias y alumnos</span>
            </div>
            <select
              id="admin-active-group-select"
              value={selectedGroupId}
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                setSelectedSubjectId('');
                setSelectedActivityId('');
              }}
              className="px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-600 outline-hidden"
            >
              {groups.length === 0 ? (
                <option value="">(No hay grados creados aún)</option>
              ) : (
                groups.map((grp) => (
                  <option key={grp.id} value={grp.id}>
                    {grp.name} ({grp.code})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* Quick KPI stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <School className="w-3.5 h-3.5 text-indigo-600" /> Grados Creados
            </span>
            <p className="text-xl font-bold text-slate-900 mt-1">{groups.length}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" /> Materias en Grado
            </span>
            <p className="text-xl font-bold text-slate-900 mt-1">{currentGroupSubjects.length}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-600" /> Alumnos en Grado
            </span>
            <p className="text-xl font-bold text-slate-900 mt-1">{currentGroupStudents.length}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-amber-600" /> Coevaluaciones
            </span>
            <p className="text-xl font-bold text-slate-900 mt-1">{coevaluations.length}</p>
          </div>
        </div>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex border-b border-slate-200 bg-white rounded-t-2xl px-4 overflow-x-auto shadow-xs">
        <button
          id="tab-admin-grades"
          onClick={() => setActiveTab('grades')}
          className={`py-3.5 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'grades'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          Calificaciones en Tiempo Real
        </button>

        <button
          id="tab-admin-coevaluation"
          onClick={() => setActiveTab('coevaluation')}
          className={`py-3.5 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'coevaluation'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Star className="w-4 h-4 text-amber-500" />
          Control de Coevaluación Docente
        </button>

        <button
          id="tab-admin-activities"
          onClick={() => setActiveTab('activities')}
          className={`py-3.5 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'activities'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Calendar className="w-4 h-4" />
          Actividades y Tareas
        </button>

        <button
          id="tab-admin-subjects"
          onClick={() => setActiveTab('subjects')}
          className={`py-3.5 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'subjects'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Materias
        </button>

        <button
          id="tab-admin-groups"
          onClick={() => setActiveTab('groups')}
          className={`py-3.5 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'groups'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <FolderPlus className="w-4 h-4" />
          Crear Grados y Grupos
        </button>

        <button
          id="tab-admin-students"
          onClick={() => setActiveTab('students')}
          className={`py-3.5 px-4 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === 'students'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          Estudiantes Registrados
        </button>
      </div>

      {/* TAB CONTENT: CALIFICACIONES EN TIEMPO REAL */}
      {activeTab === 'grades' && (
        <div className="space-y-6">
          {/* Filter Sub-bar: Select Subject & Select Activity */}
          <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-200">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-indigo-600" />
              Selecciona Materia y Actividad a Calificar
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Materia:</label>
                <select
                  id="admin-grades-subject-select"
                  value={activeSubject?.id || ''}
                  onChange={(e) => {
                    setSelectedSubjectId(e.target.value);
                    setSelectedActivityId('');
                  }}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium"
                >
                  {currentGroupSubjects.length === 0 ? (
                    <option value="">No hay materias creadas en este grado</option>
                  ) : (
                    currentGroupSubjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.name} ({sub.code})
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Actividad / Tarea:</label>
                <select
                  id="admin-grades-activity-select"
                  value={activeActivity?.id || ''}
                  onChange={(e) => setSelectedActivityId(e.target.value)}
                  disabled={currentSubjectActivities.length === 0}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium disabled:opacity-50"
                >
                  {currentSubjectActivities.length === 0 ? (
                    <option value="">Sin actividades en esta materia</option>
                  ) : (
                    currentSubjectActivities.map((act) => (
                      <option key={act.id} value={act.id}>
                        {act.title} (Peso {act.weightPercentage}% • Máx {act.maxScore.toFixed(1)})
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {activeActivity && (
              <div className="mt-4 p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-indigo-950 text-sm block">{activeActivity.title}</span>
                  <span className="text-indigo-700">{activeActivity.description}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-white px-2.5 py-1 rounded-md text-slate-700 font-semibold border border-indigo-200">
                    Fecha de Entrega: {new Date(activeActivity.dueDate).toLocaleDateString('es-ES')}
                  </span>
                  <span className="bg-indigo-600 text-white px-2.5 py-1 rounded-md font-semibold">
                    Peso Ponderado: {activeActivity.weightPercentage}%
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Grading Matrix */}
          <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Listado de Estudiantes para Asignar Notas</h3>
                <p className="text-xs text-slate-500">
                  Las calificaciones y observaciones se sincronizan automáticamente y son visibles al instante por el estudiante.
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 bg-slate-100 rounded-lg text-slate-700">
                {currentGroupStudents.length} estudiantes registrados
              </span>
            </div>

            {!activeActivity ? (
              <div className="p-12 text-center text-slate-400">
                <BookOpen className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="font-medium text-slate-600">Por favor crea o selecciona una materia y actividad primero.</p>
              </div>
            ) : currentGroupStudents.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                <p className="font-medium text-slate-600">No hay estudiantes registrados en este grado.</p>
                <p className="text-xs text-slate-400 mt-1">Los estudiantes pueden registrarse seleccionando este grado.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[11px] font-bold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Identificación</th>
                      <th className="py-3 px-4">Estudiante</th>
                      <th className="py-3 px-4 w-36">Nota (0.0 - {activeActivity.maxScore.toFixed(1)})</th>
                      <th className="py-3 px-4">Retroalimentación / Observación</th>
                      <th className="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentGroupStudents.map((st) => {
                      const gradeRecord = grades.find(
                        (g) => g.activityId === activeActivity.id && g.studentId === st.id
                      );
                      const currentScore = gradingDrafts[st.id]?.score !== undefined
                        ? gradingDrafts[st.id].score
                        : (gradeRecord ? gradeRecord.score.toString() : '');
                      
                      const currentFeedback = gradingDrafts[st.id]?.feedback !== undefined
                        ? gradingDrafts[st.id].feedback
                        : (gradeRecord?.feedback || '');

                      const isSaved = savedFeedbackMap[st.id];

                      return (
                        <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-xs font-semibold text-slate-700">
                            {st.id}
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-900">
                            {st.fullName}
                            {st.email && <span className="block text-xs text-slate-400">{st.email}</span>}
                          </td>
                          <td className="py-3.5 px-4">
                            <input
                              id={`input-grade-${st.id}`}
                              type="number"
                              step="0.1"
                              min="0"
                              max={activeActivity.maxScore}
                              placeholder="0.0"
                              value={currentScore}
                              onChange={(e) => {
                                setGradingDrafts((prev) => ({
                                  ...prev,
                                  [st.id]: {
                                    score: e.target.value,
                                    feedback: currentFeedback,
                                  },
                                }));
                              }}
                              className="w-24 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-bold text-center focus:ring-2 focus:ring-indigo-600 outline-hidden"
                            />
                          </td>
                          <td className="py-3.5 px-4">
                            <input
                              id={`input-feedback-${st.id}`}
                              type="text"
                              placeholder="Observación para el alumno..."
                              value={currentFeedback}
                              onChange={(e) => {
                                setGradingDrafts((prev) => ({
                                  ...prev,
                                  [st.id]: {
                                    score: currentScore,
                                    feedback: e.target.value,
                                  },
                                }));
                              }}
                              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-indigo-600 outline-hidden"
                            />
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              id={`btn-save-grade-${st.id}`}
                              type="button"
                              onClick={() => handleSaveStudentGrade(st.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 ${
                                isSaved
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                              }`}
                            >
                              {isSaved ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  ¡Guardada!
                                </>
                              ) : (
                                <>
                                  <Save className="w-3.5 h-3.5" />
                                  Guardar
                                </>
                              )}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: CONTROL DE COEVALUACIÓN */}
      {activeTab === 'coevaluation' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Star className="w-5 h-5 text-purple-600" />
                  Gestión y Permisos de Coevaluación entre Compañeros
                </h3>
                <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                  Permite o desactiva que los estudiantes califiquen el desempeño de sus compañeros de grupo <strong>de uno en uno</strong>. Cuando el docente lo permita, la coevaluación se abre instantáneamente en el panel del alumno.
                </p>
              </div>
              <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs font-bold rounded-lg shrink-0">
                Rúbrica de 4 Criterios
              </span>
            </div>

            {/* Activities list with toggle switches */}
            <div className="mt-6 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Actividades con Coevaluación en el Grado Seleccionado
              </h4>

              {activities.filter((a) => a.groupId === selectedGroupId).length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">
                  No hay actividades creadas en este grado aún.
                </p>
              ) : (
                activities
                  .filter((a) => a.groupId === selectedGroupId)
                  .map((act) => {
                    const sub = subjects.find((s) => s.id === act.subjectId);
                    const actCoevals = coevaluations.filter((c) => c.activityId === act.id);

                    return (
                      <div
                        key={act.id}
                        id={`coeval-act-card-${act.id}`}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="w-3 h-12 rounded-full shrink-0"
                            style={{ backgroundColor: sub?.color || '#6366f1' }}
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-semibold text-slate-500">
                                {sub?.name || 'Materia'}
                              </span>
                              <span className="text-slate-300">•</span>
                              <span className="text-xs text-slate-500">
                                Fecha Límite: {new Date(act.dueDate).toLocaleDateString('es-ES')}
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 mt-0.5">{act.title}</h4>
                            <p className="text-xs text-slate-500 mt-0.5">{act.description}</p>
                          </div>
                        </div>

                        {/* Coeval status & Toggle button */}
                        <div className="flex items-center gap-4 shrink-0">
                          <div className="text-right">
                            <span className="text-[11px] font-bold block text-slate-500">
                              Evaluaciones Recibidas
                            </span>
                            <span className="text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                              {actCoevals.length} realizadas
                            </span>
                          </div>

                          <button
                            id={`btn-toggle-coeval-${act.id}`}
                            type="button"
                            onClick={() => handleToggleCoevaluation(act.id, !!act.coevaluationActive)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                              act.coevaluationActive
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                            }`}
                          >
                            {act.coevaluationActive ? (
                              <>
                                <ToggleRight className="w-4 h-4" />
                                Habilitada (Activa)
                              </>
                            ) : (
                              <>
                                <ToggleLeft className="w-4 h-4" />
                                Deshabilitada (Pausada)
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* Results and Peer Feedback Table */}
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">
              Resultados de Coevaluación Registrados por Alumnos
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Visualiza las calificaciones entre compañeros, criterios y retroalimentación emitida de uno en uno.
            </p>

            {coevaluations.length === 0 ? (
              <div className="py-10 text-center text-slate-400">
                <Star className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-xs font-medium text-slate-600">Aún no se han enviado coevaluaciones de alumnos.</p>
                <p className="text-[11px] text-slate-400">
                  Asegúrate de que la coevaluación esté habilitada arriba para que los estudiantes puedan evaluar a sus compañeros.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Evaluador (Quién califica)</th>
                      <th className="py-2.5 px-3">Compañero Evaluado</th>
                      <th className="py-2.5 px-3">Part.</th>
                      <th className="py-2.5 px-3">Resp.</th>
                      <th className="py-2.5 px-3">Equipo</th>
                      <th className="py-2.5 px-3">Calidad</th>
                      <th className="py-2.5 px-3 font-extrabold">Promedio</th>
                      <th className="py-2.5 px-3">Comentarios</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {coevaluations.map((coev) => {
                      const evaluator = students.find((s) => s.id === coev.evaluatorStudentId);
                      const evaluated = students.find((s) => s.id === coev.evaluatedStudentId);

                      return (
                        <tr key={coev.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {evaluator?.fullName || coev.evaluatorStudentId}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-indigo-900">
                            {evaluated?.fullName || coev.evaluatedStudentId}
                          </td>
                          <td className="py-2.5 px-3">{coev.scores.participation.toFixed(1)}</td>
                          <td className="py-2.5 px-3">{coev.scores.responsibility.toFixed(1)}</td>
                          <td className="py-2.5 px-3">{coev.scores.teamwork.toFixed(1)}</td>
                          <td className="py-2.5 px-3">{coev.scores.quality.toFixed(1)}</td>
                          <td className="py-2.5 px-3 font-bold text-emerald-700">
                            {coev.averageScore.toFixed(1)}
                          </td>
                          <td className="py-2.5 px-3 italic text-slate-600 max-w-xs truncate">
                            "{coev.comments || 'Sin comentarios'}"
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: ACTIVIDADES Y TAREAS */}
      {activeTab === 'activities' && (
        <div>
          {currentGroupSubjects.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-xs max-w-lg mx-auto">
              <BookOpen className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900">Primero debes crear una Materia</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Para asignar actividades, tareas y ponderaciones, primero debes registrar al menos una materia en este grado.
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('subjects')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Ir a Crear Materias &rarr;
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Form Create Activity */}
              <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
                <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-600" />
                  Nueva Actividad / Tarea
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Asigna tareas con porcentaje ponderado y fecha de entrega.
                </p>

                <form onSubmit={handleCreateActivity} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Materia Asignada *</label>
                    <select
                      id="select-activity-subject"
                      required
                      value={activeSubject?.id || ''}
                      onChange={(e) => setSelectedSubjectId(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    >
                      {currentGroupSubjects.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          {sub.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Título de la Actividad *</label>
                    <input
                      id="input-act-title"
                      type="text"
                      required
                      placeholder="Ej. Taller 2: Termodinámica"
                      value={newActTitle}
                      onChange={(e) => setNewActTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Descripción e Instrucciones</label>
                    <textarea
                      id="input-act-desc"
                      rows={2}
                      placeholder="Instrucciones para los estudiantes..."
                      value={newActDesc}
                      onChange={(e) => setNewActDesc(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Fecha Entrega *</label>
                      <input
                        id="input-act-due-date"
                        type="date"
                        required
                        value={newActDueDate}
                        onChange={(e) => setNewActDueDate(e.target.value)}
                        className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Peso (%) *</label>
                      <input
                        id="input-act-weight"
                        type="number"
                        min="1"
                        max="100"
                        required
                        value={newActWeight}
                        onChange={(e) => setNewActWeight(Number(e.target.value))}
                        className="w-full px-2.5 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nota Máxima *</label>
                    <input
                      id="input-act-max-score"
                      type="number"
                      step="0.1"
                      min="1"
                      max="100"
                      required
                      value={newActMaxScore}
                      onChange={(e) => setNewActMaxScore(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-slate-800 block">Habilitar Coevaluación</span>
                      <span className="text-[10px] text-slate-500">Permitir calificar compañeros de uno en uno</span>
                    </div>
                    <input
                      id="checkbox-act-allow-coeval"
                      type="checkbox"
                      checked={newActAllowCoeval}
                      onChange={(e) => setNewActAllowCoeval(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded-md"
                    />
                  </div>

                  <button
                    id="btn-create-activity"
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors"
                  >
                    Crear y Publicar Actividad
                  </button>
                </form>
              </div>

              {/* List of Activities */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
                <h3 className="text-base font-bold text-slate-900 mb-4">
                  Actividades del Grado ({activities.filter((a) => a.groupId === selectedGroupId).length})
                </h3>

                {activities.filter((a) => a.groupId === selectedGroupId).length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">No hay actividades creadas todavía</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Crea la primera tarea o actividad con el formulario a la izquierda.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activities
                      .filter((a) => a.groupId === selectedGroupId)
                      .map((act) => {
                        const sub = subjects.find((s) => s.id === act.subjectId);
                        return (
                          <div
                            key={act.id}
                            className="p-4 rounded-xl border border-slate-200 hover:border-indigo-200 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-[10px] font-bold px-2 py-0.5 rounded-md text-white"
                                  style={{ backgroundColor: sub?.color || '#4f46e5' }}
                                >
                                  {sub?.name}
                                </span>
                                <span className="text-xs text-slate-500 font-medium">
                                  Entrega: {new Date(act.dueDate).toLocaleDateString('es-ES')}
                                </span>
                                {act.allowCoevaluation && (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700">
                                    Coevaluación {act.coevaluationActive ? 'Activa' : 'Pausada'}
                                  </span>
                                )}
                              </div>
                              <h4 className="text-sm font-bold text-slate-900 mt-1">{act.title}</h4>
                              <p className="text-xs text-slate-500 mt-0.5">{act.description || 'Sin descripción'}</p>
                            </div>

                            <div className="flex items-center gap-3 self-end sm:self-center">
                              <div className="text-right shrink-0">
                                <span className="text-xs font-bold text-slate-900 block">
                                  Peso: {act.weightPercentage}%
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  Máx: {act.maxScore.toFixed(1)} pts
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`¿Eliminar la actividad "${act.title}"?`)) {
                                    deleteActivity(act.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Eliminar Actividad"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: MATERIAS */}
      {activeTab === 'subjects' && (
        <div>
          {groups.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center border border-slate-200 shadow-xs max-w-lg mx-auto">
              <School className="w-12 h-12 text-indigo-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-slate-900">Primero debes crear un Grado</h3>
              <p className="text-xs text-slate-500 mt-1 mb-4">
                Para registrar materias y asignaturas, primero crea al menos un grado académico (ej. 10° Grado A).
              </p>
              <button
                type="button"
                onClick={() => setActiveTab('groups')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs"
              >
                Ir a Crear Grados &rarr;
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Create Subject Form */}
              <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
                <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-indigo-600" />
                  Nueva Materia para este Grado
                </h3>
                <p className="text-xs text-slate-500 mb-4">
                  Asignatura para el grado <span className="font-bold text-indigo-600">{groups.find(g => g.id === selectedGroupId)?.name || 'seleccionado'}</span>.
                </p>

                <form onSubmit={handleCreateSubject} className="space-y-3.5 text-xs">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Nombre de la Materia *</label>
                    <input
                      id="input-sub-name"
                      type="text"
                      required
                      placeholder="Ej. Matemáticas, Biología, Filosofía"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Código</label>
                      <input
                        id="input-sub-code"
                        type="text"
                        placeholder="MAT-101"
                        value={newSubCode}
                        onChange={(e) => setNewSubCode(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Horas Semanales</label>
                      <input
                        id="input-sub-hours"
                        type="number"
                        min="1"
                        max="10"
                        value={newSubHours}
                        onChange={(e) => setNewSubHours(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Docente Asignado</label>
                    <input
                      id="input-sub-teacher"
                      type="text"
                      placeholder="Lic. Marcela Gómez"
                      value={newSubTeacher}
                      onChange={(e) => setNewSubTeacher(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Color Identificador</label>
                    <div className="flex items-center gap-2">
                      <input
                        id="input-sub-color"
                        type="color"
                        value={newSubColor}
                        onChange={(e) => setNewSubColor(e.target.value)}
                        className="w-10 h-9 p-0.5 rounded-lg border border-slate-300 cursor-pointer"
                      />
                      <span className="font-mono text-slate-600 text-[11px]">{newSubColor}</span>
                    </div>
                  </div>

                  <button
                    id="btn-create-subject"
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors"
                  >
                    Agregar Materia al Grado
                  </button>
                </form>
              </div>

              {/* List of Subjects */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
                <h3 className="text-base font-bold text-slate-900 mb-4">
                  Materias Asignadas en este Grado ({currentGroupSubjects.length})
                </h3>

                {currentGroupSubjects.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                    <BookOpen className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                    <p className="text-sm font-bold text-slate-700">No hay materias en este grado todavía</p>
                    <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                      Agrega la primera materia usando el formulario a la izquierda.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {currentGroupSubjects.map((sub) => {
                      const subActivities = activities.filter((a) => a.subjectId === sub.id);
                      return (
                        <div
                          key={sub.id}
                          className="p-4 rounded-xl border border-slate-200 bg-white hover:shadow-xs transition-all relative overflow-hidden"
                        >
                          <div
                            className="absolute top-0 left-0 right-0 h-1.5"
                            style={{ backgroundColor: sub.color }}
                          />
                          <div className="flex items-start justify-between gap-2 mt-1">
                            <div>
                              <span className="text-[10px] font-mono font-bold text-slate-400">
                                {sub.code}
                              </span>
                              <h4 className="text-sm font-bold text-slate-900">{sub.name}</h4>
                              <p className="text-xs text-slate-500 mt-0.5">{sub.teacherName || 'Docente sin asignar'}</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                                {sub.creditHours} hrs/sem
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`¿Eliminar la materia "${sub.name}" y sus actividades asociadas?`)) {
                                    deleteSubject(sub.id);
                                  }
                                }}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                title="Eliminar Materia"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                            <span>{subActivities.length} actividades creadas</span>
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedSubjectId(sub.id);
                                setActiveTab('grades');
                              }}
                              className="text-indigo-600 hover:underline font-semibold"
                            >
                              Calificar &rarr;
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: CREAR GRADOS Y GRUPOS */}
      {activeTab === 'groups' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Group Form */}
          <div className="lg:col-span-1 bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-indigo-600" />
              Crear Nuevo Grado / Grupo
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Crea los grados para que los estudiantes puedan seleccionarlos al registrarse.
            </p>

            <form onSubmit={handleCreateGroup} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre del Grado *</label>
                <input
                  id="input-group-name"
                  type="text"
                  required
                  placeholder="Ej. 10° Grado C, 9° Bilingüe"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Código de Grupo</label>
                  <input
                    id="input-group-code"
                    type="text"
                    placeholder="10C-2026"
                    value={newGroupCode}
                    onChange={(e) => setNewGroupCode(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Año Lectivo</label>
                  <input
                    id="input-group-year"
                    type="text"
                    value={newGroupYear}
                    onChange={(e) => setNewGroupYear(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Descripción</label>
                <textarea
                  id="input-group-desc"
                  rows={2}
                  placeholder="Descripción del nivel o jornada..."
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl"
                />
              </div>

              <button
                id="btn-create-group-submit"
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs shadow-xs transition-colors"
              >
                Crear Grado
              </button>
            </form>
          </div>

          {/* List of Existing Groups */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              Grados Registrados en la Institución ({groups.length})
            </h3>

            {groups.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                <FolderPlus className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No hay grados creados todavía</p>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Crea tu primer grado (ej. 10° Grado A) usando el formulario a la izquierda. Los estudiantes podrán seleccionarlo al registrarse.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {groups.map((grp) => {
                  const groupStudents = students.filter((s) => s.groupId === grp.id);
                  const groupSubjects = subjects.filter((s) => s.groupId === grp.id);

                  return (
                    <div
                      key={grp.id}
                      className={`p-4 rounded-xl border transition-all ${
                        grp.id === selectedGroupId
                          ? 'border-indigo-600 bg-indigo-50/30 shadow-xs'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                            {grp.code}
                          </span>
                          <h4 className="text-sm font-bold text-slate-900 mt-1">{grp.name}</h4>
                          <p className="text-xs text-slate-500 mt-0.5">{grp.description || 'Sin descripción'}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            Año {grp.academicYear}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`¿Eliminar el grado "${grp.name}"? También se eliminarán sus materias y actividades asociadas.`)) {
                                deleteGroup(grp.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Eliminar Grado"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-100 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Users className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{groupStudents.length} Estudiantes</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                          <span>{groupSubjects.length} Materias</span>
                        </div>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedGroupId(grp.id);
                            setActiveTab('subjects');
                          }}
                          className="text-indigo-600 font-semibold hover:underline"
                        >
                          Gestionar Materias &rarr;
                        </button>
                        {grp.id === selectedGroupId && (
                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                            Seleccionado
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB CONTENT: ESTUDIANTES REGISTRADOS */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-2xl p-6 shadow-xs border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-base font-bold text-slate-900">Directorio de Estudiantes Registrados ({students.length})</h3>
              <p className="text-xs text-slate-500">
                Alumnos registrados con su Identificación (llave primaria) y grado seleccionado.
              </p>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                id="search-students-input"
                type="text"
                placeholder="Buscar por ID o nombre..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:ring-2 focus:ring-indigo-600 outline-hidden"
              />
            </div>
          </div>

          {students.length === 0 ? (
            <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300">
              <Users className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No hay estudiantes registrados todavía</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                Los alumnos se registrarán usando su número de Identificación (llave primaria), su clave y seleccionando uno de los grados que has creado.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Identificación (Key)</th>
                    <th className="py-3 px-4">Nombre Completo</th>
                    <th className="py-3 px-4">Grado Asignado</th>
                    <th className="py-3 px-4">Correo</th>
                    <th className="py-3 px-4">Fecha de Registro</th>
                    <th className="py-3 px-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students
                    .filter((st) => {
                      if (!studentSearch.trim()) return true;
                      const q = studentSearch.toLowerCase();
                      return st.fullName.toLowerCase().includes(q) || st.id.toLowerCase().includes(q);
                    })
                    .map((st) => {
                      const grp = groups.find((g) => g.id === st.groupId);
                      return (
                        <tr key={st.id} className="hover:bg-slate-50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-900">{st.id}</td>
                          <td className="py-3 px-4 font-semibold text-slate-800">{st.fullName}</td>
                          <td className="py-3 px-4">
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              {grp?.name || 'Sin Grado'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500">{st.email || '—'}</td>
                          <td className="py-3 px-4 text-slate-400">
                            {new Date(st.registeredAt).toLocaleDateString('es-ES')}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm(`¿Eliminar al estudiante ${st.fullName} (${st.id})? Se borrarán sus notas y evaluaciones.`)) {
                                  deleteStudent(st.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center"
                              title="Eliminar Estudiante"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
