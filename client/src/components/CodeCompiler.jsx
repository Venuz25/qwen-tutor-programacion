import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, X, Loader2, TerminalSquare } from 'lucide-react';
import { io } from 'socket.io-client';

const CodeCompiler = ({ 
    onClose, code, setCode, language, onLanguageChange 
}) => {
  const [output, setOutput] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [isCompiling, setIsCompiling] = useState(false);
  
  const socketRef = useRef(null);
  const consoleEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll de la consola
  useEffect(() => {
      consoleEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [output]);

  // Conexión inicial de Sockets
  useEffect(() => {
      // Conectar al backend
      socketRef.current = io('http://localhost:5000');

      socketRef.current.on('terminal_output', (data) => {
          setOutput((prev) => prev + data);
      });

      socketRef.current.on('terminal_error', (data) => {
          setOutput((prev) => prev + data); // Puedes estilizar el error de rojo si lo deseas
      });

      socketRef.current.on('execution_finished', (data) => {
          setOutput((prev) => prev + data);
          setIsCompiling(false);
      });

      // Limpiar al cerrar el componente
      return () => {
          socketRef.current.disconnect();
      };
  }, []);

  const handleExecute = () => {
      setOutput(""); // Limpiar consola
      setIsCompiling(true);
      socketRef.current.emit('start_execution', { code, language });
      
      // Auto-enfocar el input interactivo por si el programa pide datos
      setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleInputSubmit = (e) => {
      if (e.key === 'Enter') {
          // Mostrar lo que el usuario escribió en la consola
          setOutput((prev) => prev + inputValue + "\n");
          
          // Enviar al contenedor de Docker/Python
          socketRef.current.emit('terminal_input', inputValue);
          setInputValue(""); // Limpiar caja
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-700 shadow-2xl">
      {/* HEADER */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
        <div className="flex items-center gap-4">
          <select 
            value={language}
            onChange={(e) => onLanguageChange(e.target.value)}
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
            onClick={handleExecute}
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

      {/* CONSOLA INTERACTIVA */}
      <div 
        className="h-1/3 min-h-[200px] border-t border-slate-700 bg-[#1e1e1e] flex flex-col cursor-text"
        onClick={() => inputRef.current?.focus()} // Al hacer clic en cualquier parte de la consola, enfoca el input
      >
        <div className="px-4 py-2 bg-slate-800 border-b border-slate-700 text-xs font-mono text-slate-400 uppercase tracking-wider flex items-center gap-2">
          <TerminalSquare size={14} /> Consola Interactiva
        </div>
        <div className="flex-1 p-4 overflow-auto font-mono text-sm text-slate-300">
          <pre className="whitespace-pre-wrap font-inherit inline">{output}</pre>
          
          {/* Input "Invisible" que simula el teclado de la terminal */}
          {isCompiling && (
              <span className="inline-flex items-center ml-1">
                  <span className="text-emerald-500 mr-1">❯</span>
                  <input
                      ref={inputRef}
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleInputSubmit}
                      className="bg-transparent border-none outline-none text-white w-full font-mono"
                      autoComplete="off"
                      spellCheck="false"
                  />
              </span>
          )}
          <div ref={consoleEndRef} />
        </div>
      </div>
    </div>
  );
};

export default CodeCompiler;