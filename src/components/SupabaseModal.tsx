import React, { useState } from 'react';
import { 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  ExternalLink, 
  RefreshCw, 
  Key, 
  Globe 
} from 'lucide-react';
import { 
  getStoredSupabaseCredentials, 
  saveSupabaseCredentials, 
  clearSupabaseCredentials, 
  testSupabaseConnection, 
  SUPABASE_SQL_SCHEMA 
} from '../services/supabase';
import { syncWithSupabase } from '../services/dataStore';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  onConnectionChange: () => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  isConnected,
  onConnectionChange,
}) => {
  const currentCreds = getStoredSupabaseCredentials();
  const [url, setUrl] = useState(currentCreds.url);
  const [anonKey, setAnonKey] = useState(currentCreds.anonKey);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeTab, setActiveTab] = useState<'config' | 'sql'>('config');

  if (!isOpen) return null;

  const handleSaveAndTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !anonKey.trim()) {
      setTestResult({ success: false, message: 'Ingresa tanto la URL como la Anon Key de tu proyecto Supabase.' });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    saveSupabaseCredentials(url, anonKey);
    const res = await testSupabaseConnection(url.trim(), anonKey.trim());
    setIsTesting(false);

    if (res.success) {
      setTestResult({ success: true, message: '¡Conexión exitosa con Supabase! Sincronizando datos...' });
      await syncWithSupabase();
      onConnectionChange();
    } else {
      setTestResult({
        success: false,
        message: `Error de conexión: ${res.error || 'Verifica la URL y la Anon Key'}. Recuerda ejecutar el script SQL si las tablas aún no existen.`,
      });
    }
  };

  const handleDisconnect = () => {
    clearSupabaseCredentials();
    setUrl('');
    setAnonKey('');
    setTestResult({ success: true, message: 'Supabase desconectado. El sistema continúa operando con almacenamiento local.' });
    onConnectionChange();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div id="supabase-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div id="supabase-modal-card" className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Sincronización con Supabase</h2>
              <p className="text-xs text-slate-500">Persistencia y actualización automática entre dispositivos</p>
            </div>
          </div>
          <button
            id="btn-close-supabase-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white">
          <button
            id="tab-supabase-config"
            onClick={() => setActiveTab('config')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'config'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Credenciales del Proyecto
          </button>
          <button
            id="tab-supabase-sql"
            onClick={() => setActiveTab('sql')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === 'sql'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Script SQL (Crear Tablas)
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {activeTab === 'config' ? (
            <div>
              {/* Status Banner */}
              <div
                id="supabase-status-indicator"
                className={`p-4 rounded-xl mb-5 flex items-start gap-3 border ${
                  isConnected
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
              >
                {isConnected ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="text-sm">
                  <p className="font-semibold">
                    {isConnected ? 'Supabase Conectado y Sincronizado' : 'Modo Almacenamiento Local Activo'}
                  </p>
                  <p className="text-xs opacity-90 mt-0.5">
                    {isConnected
                      ? 'Todos los datos de grupos, materias, notas y coevaluaciones se guardan en tu base de datos Supabase en tiempo real.'
                      : 'La app funciona completamente con almacenamiento del navegador. Para sincronizar entre diferentes computadores y celulares, ingresa tu URL y Anon Key de Supabase.'}
                  </p>
                </div>
              </div>

              {testResult && (
                <div
                  className={`p-3 rounded-lg text-sm mb-4 flex items-center gap-2 ${
                    testResult.success
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                  }`}
                >
                  {testResult.success ? <Check className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                  <span>{testResult.message}</span>
                </div>
              )}

              <form onSubmit={handleSaveAndTest} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-slate-500" />
                    Supabase Project URL
                  </label>
                  <input
                    id="input-supabase-url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-hidden"
                  />
                  <p className="text-xs text-slate-500 mt-1">Disponible en Settings &gt; API en tu consola de Supabase.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-slate-500" />
                    Supabase Anon / Public Key
                  </label>
                  <input
                    id="input-supabase-key"
                    type="password"
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all outline-hidden font-mono"
                  />
                  <p className="text-xs text-slate-500 mt-1">Tu clave pública (anon public). No ingreses la service_role key.</p>
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex gap-2">
                    <button
                      id="btn-save-supabase"
                      type="submit"
                      disabled={isTesting}
                      className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                      {isTesting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Probando conexión...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          Guardar y Conectar
                        </>
                      )}
                    </button>

                    {isConnected && (
                      <button
                        id="btn-disconnect-supabase"
                        type="button"
                        onClick={handleDisconnect}
                        className="px-3 py-2 text-rose-600 hover:bg-rose-50 text-sm font-medium rounded-xl transition-colors"
                      >
                        Desconectar
                      </button>
                    )}
                  </div>

                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-600 hover:text-emerald-700 flex items-center gap-1 font-medium underline"
                  >
                    Abrir Supabase Dashboard
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-600">
                  Copia y pega este script en el <strong>SQL Editor</strong> de tu proyecto Supabase para crear las 7 tablas requeridas y activar Realtime:
                </p>
                <button
                  id="btn-copy-sql-schema"
                  type="button"
                  onClick={handleCopySql}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ¡Copiado!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copiar SQL
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 bg-slate-900 text-slate-200 rounded-xl text-xs font-mono overflow-x-auto max-h-80 leading-relaxed border border-slate-800 selection:bg-emerald-800">
                {SUPABASE_SQL_SCHEMA}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            id="btn-dismiss-supabase-modal"
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-sm font-semibold rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
