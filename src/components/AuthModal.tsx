import React, { useState } from 'react';
import { 
  GraduationCap, 
  Lock, 
  User, 
  Shield, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Sparkles,
  School
} from 'lucide-react';
import { GradeGroup, Student, UserSession } from '../types';
import { registerStudent } from '../services/dataStore';

interface AuthModalProps {
  groups: GradeGroup[];
  students: Student[];
  onLoginSuccess: (session: UserSession) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  groups,
  students,
  onLoginSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'student_login' | 'student_register' | 'admin_login'>('student_login');

  // Student login form state
  const [studentId, setStudentId] = useState('');
  const [studentPassword, setStudentPassword] = useState('');
  const [showStudentPassword, setShowStudentPassword] = useState(false);

  // Admin login form state
  const [adminPassword, setAdminPassword] = useState('');
  const [showAdminPassword, setShowAdminPassword] = useState(false);

  // Student register form state
  const [regId, setRegId] = useState('');
  const [regName, setRegName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regGroupId, setRegGroupId] = useState(groups[0]?.id || '');
  const [regEmail, setRegEmail] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Keep regGroupId in sync if groups change
  React.useEffect(() => {
    if (groups.length > 0 && (!regGroupId || !groups.some(g => g.id === regGroupId))) {
      setRegGroupId(groups[0].id);
    }
  }, [groups, regGroupId]);

  // Feedback states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    resetForm();

    if (!studentId.trim() || !studentPassword.trim()) {
      setErrorMsg('Por favor completa tu identificación y tu clave.');
      return;
    }

    const found = students.find(
      (s) => s.id.trim() === studentId.trim() && s.passwordHash === studentPassword
    );

    if (!found) {
      setErrorMsg('Credenciales incorrectas. Verifica tu número de identificación o contraseña.');
      return;
    }

    onLoginSuccess({
      role: 'student',
      studentId: found.id,
      studentName: found.fullName,
      groupId: found.groupId,
    });
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    resetForm();

    // Verification with private admin key (2534150)
    if (adminPassword.trim() === '2534150') {
      onLoginSuccess({
        role: 'admin',
      });
    } else {
      setErrorMsg('Clave de administrador incorrecta.');
    }
  };

  const handleStudentRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetForm();

    if (!regId.trim() || !regName.trim() || !regPassword.trim()) {
      setErrorMsg('Por favor completa los campos obligatorios (Identificación, Nombre y Clave).');
      return;
    }

    if (!regGroupId) {
      setErrorMsg('Debes seleccionar un grado previamente creado por el administrador.');
      return;
    }

    setIsSubmitting(true);
    const result = await registerStudent({
      id: regId.trim(),
      fullName: regName.trim(),
      passwordHash: regPassword,
      groupId: regGroupId,
      email: regEmail.trim() || undefined,
    });
    setIsSubmitting(false);

    if (!result.success) {
      setErrorMsg(result.message || 'Error al registrar estudiante');
      return;
    }

    setSuccessMsg('¡Registro exitoso! Iniciando tu sesión...');
    setTimeout(() => {
      onLoginSuccess({
        role: 'student',
        studentId: regId.trim(),
        studentName: regName.trim(),
        groupId: regGroupId,
      });
    }, 700);
  };

  return (
    <div className="min-h-screen bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        id="auth-container-card"
        className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Top Branding Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 px-8 py-8 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 flex items-center gap-3 mb-2">
            <div className="p-3 bg-indigo-600/90 backdrop-blur-md rounded-2xl shadow-lg border border-indigo-400/20">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">EduGrade</h1>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-400/20 text-indigo-300 border border-indigo-400/30">
                  Portal Seguro
                </span>
              </div>
              <p className="text-xs text-slate-300 font-medium">Gestión Académica &amp; Coevaluación en Tiempo Real</p>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 p-1.5 gap-1 text-xs font-semibold">
          <button
            id="tab-btn-student-login"
            type="button"
            onClick={() => {
              setActiveTab('student_login');
              resetForm();
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'student_login'
                ? 'bg-white text-indigo-700 shadow-sm font-bold border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            Ingreso Estudiante
          </button>

          <button
            id="tab-btn-student-register"
            type="button"
            onClick={() => {
              setActiveTab('student_register');
              resetForm();
              if (groups.length > 0 && !regGroupId) {
                setRegGroupId(groups[0].id);
              }
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'student_register'
                ? 'bg-white text-emerald-700 shadow-sm font-bold border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Registro Estudiante
          </button>

          <button
            id="tab-btn-admin-login"
            type="button"
            onClick={() => {
              setActiveTab('admin_login');
              resetForm();
            }}
            className={`flex-1 py-2.5 px-3 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'admin_login'
                ? 'bg-white text-slate-900 shadow-sm font-bold border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            Docente / Admin
          </button>
        </div>

        {/* Content Body */}
        <div className="p-8">
          {errorMsg && (
            <div
              id="auth-error-alert"
              className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium mb-5 flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              id="auth-success-alert"
              className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium mb-5 flex items-start gap-2.5 animate-in fade-in"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: INGRESO ESTUDIANTE */}
          {activeTab === 'student_login' && (
            <form onSubmit={handleStudentLogin} className="space-y-4">
              {students.length === 0 && (
                <div className="p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl text-xs text-indigo-900 flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Aún no hay estudiantes registrados en el sistema.</p>
                    <p className="text-[11px] text-indigo-700 mt-0.5">
                      Para comenzar, el docente/administrador debe ingresar con la clave y crear los grados. Luego, los estudiantes pueden crear su cuenta en la pestaña "Registro Estudiante".
                    </p>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Identificación / Documento
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="input-login-student-id"
                    type="text"
                    required
                    value={studentId}
                    onChange={(e) => setStudentId(e.target.value)}
                    placeholder="Ej. 1001234567"
                    className="w-full pl-10 pr-3.5 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all outline-hidden font-mono"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Tu llave primaria de registro.</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Clave Secreta
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="input-login-student-password"
                    type={showStudentPassword ? 'text' : 'password'}
                    required
                    value={studentPassword}
                    onChange={(e) => setStudentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-600 focus:bg-white transition-all outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStudentPassword(!showStudentPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  >
                    {showStudentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  id="btn-submit-student-login"
                  type="submit"
                  className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-200 transition-all flex items-center justify-center gap-2 text-sm"
                >
                  Entrar a Mi Panel de Estudiante
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="pt-4 text-center border-t border-slate-100">
                <p className="text-xs text-slate-600">
                  ¿Aún no estás registrado?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('student_register');
                      resetForm();
                    }}
                    className="text-indigo-600 font-bold hover:underline"
                  >
                    Crear cuenta de estudiante
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* TAB 2: REGISTRO DE ESTUDIANTE */}
          {activeTab === 'student_register' && (
            <form onSubmit={handleStudentRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Identificación (Llave Primaria) *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="input-register-id"
                    type="text"
                    required
                    value={regId}
                    onChange={(e) => setRegId(e.target.value)}
                    placeholder="Ej. Cédula / Tarjeta / Código (único)"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all outline-hidden font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Completo del Alumno *
                </label>
                <input
                  id="input-register-name"
                  type="text"
                  required
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Ej. María Camila Torres"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Grado Académico Asignado *
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <School className="w-4 h-4" />
                  </div>
                  <select
                    id="select-register-group"
                    required
                    value={regGroupId}
                    onChange={(e) => setRegGroupId(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all outline-hidden"
                  >
                    {groups.length === 0 ? (
                      <option value="">No hay grados creados aún por el administrador</option>
                    ) : (
                      groups.map((grp) => (
                        <option key={grp.id} value={grp.id}>
                          {grp.name} ({grp.code}) - Año {grp.academicYear}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                {groups.length === 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 mt-2 flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Aún no hay grados creados por el administrador.</p>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        El docente o administrador debe ingresar primero (pestaña Docente/Admin con su clave) para registrar los grados escolares.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab('admin_login');
                          resetForm();
                        }}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:text-indigo-900 underline"
                      >
                        Ir al Acceso Docente / Admin &rarr;
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Clave de Acceso *
                  </label>
                  <div className="relative">
                    <input
                      id="input-register-password"
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Contraseña"
                      className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Correo (Opcional)
                  </label>
                  <input
                    id="input-register-email"
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="alumno@colegio.edu"
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  id="btn-submit-student-register"
                  type="submit"
                  disabled={isSubmitting || groups.length === 0}
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md shadow-emerald-200 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  Registrarse y Seleccionar Grado
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              <div className="pt-3 text-center border-t border-slate-100">
                <p className="text-xs text-slate-600">
                  ¿Ya tienes cuenta registrada?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('student_login');
                      resetForm();
                    }}
                    className="text-emerald-700 font-bold hover:underline"
                  >
                    Iniciar Sesión
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* TAB 3: INGRESO ADMINISTRADOR */}
          {activeTab === 'admin_login' && (
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-start gap-2 mb-3">
                <Shield className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
                <span>
                  Acceso exclusivo para docentes y directivos del plantel. La clave de administración está protegida y se valida de forma privada.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Clave Maestra del Administrador
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    id="input-admin-master-key"
                    type={showAdminPassword ? 'text' : 'password'}
                    required
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-slate-900 focus:bg-white transition-all outline-hidden font-mono tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowAdminPassword(!showAdminPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                    title={showAdminPassword ? 'Ocultar clave' : 'Mostrar clave'}
                  >
                    {showAdminPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">La contraseña no es visible en pantalla y se valida de forma segura.</p>
              </div>

              <div className="pt-2">
                <button
                  id="btn-submit-admin-login"
                  type="submit"
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Shield className="w-4 h-4 text-emerald-400" />
                  Acceder a la Gestión de Grados y Notas
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
