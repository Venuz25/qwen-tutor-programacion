import React from 'react';
import Editor from '@monaco-editor/react';
import { Play, X, Loader2 } from 'lucide-react';

const CodeCompiler = ({ 
    onClose, code, setCode, language, setLanguage, 
    output, isCompiling, executeCode 
}) => {
  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-700 shadow-2xl">
      {/* HEADER */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center gap-4">
          <select 
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-slate-700 text-white rounded px-3 py-1.5 outline-none text-sm border border-slate-600 focus:border-blue-500"
          >
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
            <option value="cpp">C++</option>
            <option value="java">Java</option>
            <option value="php">PHP</option>
            <option value="c">C</option>
          </select>
          
          <button 
            onClick={() => executeCode(code, language)}
            disabled={isCompiling}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isCompiling ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
            {isCompiling ? 'Ejecutando...' : 'Ejecutar'}
          </button>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={20} /></button>
      </div>

      {/* EDITOR */}
      <div className="flex-1 overflow-hidden">
        <Editor
          height="100%"
          theme="vs-dark"
          language={language === 'c' || language === 'cpp' ? 'cpp' : language}
          value={code}
          onChange={(value) => setCode(value)}
          options={{ minimap: { enabled: false }, fontSize: 14, wordWrap: 'on', padding: { top: 16 } }}
        />
      </div>

      {/* CONSOLA */}
      <div className="h-1/3 min-h-[200px] border-t border-slate-700 bg-[#1e1e1e] flex flex-col">
        <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 text-xs font-mono text-slate-400 uppercase tracking-wider">
          Consola de Salida
        </div>
        <div className="flex-1 p-4 overflow-auto font-mono text-sm text-slate-300">
          <pre className="whitespace-pre-wrap font-inherit">{output || "La salida aparecerá aquí..."}</pre>
        </div>
      </div>
    </div>
  );
};

export default CodeCompiler;