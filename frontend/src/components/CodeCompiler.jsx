import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, X, TerminalSquare, ChevronDown, Square } from 'lucide-react';
import { io } from 'socket.io-client';

const LANGUAGES = [
  { value: 'python', label: 'Python', color: '#3b82f6' },
  { value: 'javascript', label: 'JavaScript', color: '#f59e0b' },
  { value: 'cpp', label: 'C++', color: '#a78bfa' },
  { value: 'java', label: 'Java', color: '#f97316' },
  { value: 'php', label: 'PHP', color: '#8b5cf6' },
  { value: 'c', label: 'C', color: '#60a5fa' },
];

// Componente principal para el compilador de código interactivo
const CodeCompiler = ({
  onClose, code, setCode, language, onLanguageChange, output, setOutput, runTrigger
}) => {
  const [inputValue, setInputValue] = useState('');
  const [isCompiling, setIsCompiling] = useState(false);
  const [consoleHeight, setConsoleHeight] = useState(200);
  const [isDraggingDivider, setIsDraggingDivider] = useState(false);

  const socketRef = useRef(null);
  const consoleEndRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const currentLang = LANGUAGES.find(l => l.value === language) || LANGUAGES[0];
  const editorMonacoLanguage = (language === 'c' || language === 'cpp') ? 'cpp' : language;

  // Auto-scroll al final de la consola cuando hay nueva salida
  useEffect(() => {
    consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [output]);

  // Inicializa la conexión con el servidor de WebSockets para el compilador
  useEffect(() => {
    socketRef.current = io('http://localhost:5000');

    socketRef.current.on('terminal_output', d => setOutput(p => p + d));
    socketRef.current.on('terminal_error', d => setOutput(p => p + d));
    socketRef.current.on('execution_finished', d => {
      setOutput(p => p + d);
      setIsCompiling(false);
    });

    return () => socketRef.current.disconnect();
  }, [setOutput]);

  // Dispara la ejecución del código si se activa un evento externo
  useEffect(() => {
    if (runTrigger > 0) handleExecute();
  }, [runTrigger]);

  // Maneja la redimensión de la consola mediante el divisor
  useEffect(() => {
    if (!isDraggingDivider) return;

    const onMove = e => {
      const container = containerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const fromBottom = rect.bottom - e.clientY;
      setConsoleHeight(Math.max(100, Math.min(fromBottom, rect.height * 0.65)));
    };

    const onUp = () => setIsDraggingDivider(false);

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [isDraggingDivider]);

  // Inicia la ejecución del código enviándolo al servidor
  const handleExecute = () => {
    if (!socketRef.current) return;
    setOutput('');
    setIsCompiling(true);
    socketRef.current.emit('start_execution', { code, language });
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  // Detiene la ejecución del código en curso
  const handleStop = () => {
    socketRef.current.emit('stop_execution');
    setIsCompiling(false);
    setOutput(p => p + '\n[Ejecución detenida por el usuario]\n');
  };

  // Envía los datos introducidos por el usuario a la terminal del servidor
  const handleInputSubmit = e => {
    if (e.key === 'Enter') {
      setOutput(p => p + inputValue + '\n');
      socketRef.current.emit('terminal_input', inputValue);
      setInputValue('');
    }
  };

  return (
    <div
      ref={containerRef}
      style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg-surface)', borderLeft: '1px solid var(--border)', fontFamily: 'var(--font-ui)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <select
              value={language}
              onChange={e => onLanguageChange(e.target.value)}
              style={{ appearance: 'none', background: 'var(--bg-card)', border: '1px solid var(--border-md)', borderRadius: 7, color: currentLang.color, fontFamily: 'var(--font-ui)', fontSize: 13, fontWeight: 500, padding: '5px 28px 5px 10px', cursor: 'pointer', outline: 'none', transition: 'border-color 0.15s' }}
              onFocus={e => e.target.style.borderColor = 'var(--blue)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-md)'}
            >
              {LANGUAGES.map(l => (
                <option key={l.value} value={l.value} style={{ color: '#e2e8f0', background: '#1c2333' }}>
                  {l.label}
                </option>
              ))}
            </select>
            <ChevronDown size={12} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
          </div>

          {isCompiling ? (
            <button onClick={handleStop} className="btn-base" style={{ background: 'rgba(239,68,68,0.12)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.25)' }}>
              <Square size={13} fill="currentColor" /> Detener
            </button>
          ) : (
            <button onClick={handleExecute} className="btn-base btn-run">
              <Play size={13} fill="currentColor" /> Ejecutar
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 5, transition: 'color 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'hidden', minHeight: 0 }}>
        <Editor
          height="100%"
          theme="vs-dark"
          language={editorMonacoLanguage}
          value={code}
          onChange={v => setCode(v)}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: 'JetBrains Mono, monospace',
            fontLigatures: true,
            wordWrap: 'on',
            padding: { top: 14, bottom: 14 },
            scrollBeyondLastLine: false,
            renderLineHighlight: 'gutter',
            lineNumbersMinChars: 3,
            glyphMargin: false,
            folding: false,
            cursorBlinking: 'smooth',
            smoothScrolling: true,
          }}
        />
      </div>

      <div
        onMouseDown={() => setIsDraggingDivider(true)}
        style={{ height: 5, cursor: 'ns-resize', flexShrink: 0, borderTop: '1px solid var(--border)', background: isDraggingDivider ? 'var(--blue)' : 'transparent', transition: 'background 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <div style={{ width: 32, height: 2, borderRadius: 2, background: isDraggingDivider ? 'var(--blue)' : 'var(--border-md)', transition: 'background 0.15s' }} />
      </div>

      <div style={{ height: consoleHeight, flexShrink: 0, background: '#0d1117', display: 'flex', flexDirection: 'column', cursor: 'text', borderTop: '1px solid var(--border)' }} onClick={() => inputRef.current?.focus()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 12px', borderBottom: '1px solid rgba(99,130,180,0.1)', background: '#111827', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <TerminalSquare size={12} style={{ color: 'var(--emerald)' }} />
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>Consola</span>
          </div>
          {isCompiling && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--emerald)', animation: 'pulse-dot 1s ease infinite' }} />
              <span style={{ fontSize: 10, color: 'var(--emerald)', fontFamily: 'var(--font-mono)' }}>en ejecución</span>
            </div>
          )}
          {!isCompiling && output && (
            <button
              onClick={() => setOutput('')}
              style={{ fontSize: 10, color: 'var(--text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.1s', fontFamily: 'var(--font-ui)' }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              limpiar
            </button>
          )}
        </div>

        <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
          {!output && !isCompiling && (
            <span style={{ color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>La salida del programa aparecerá aquí...</span>
          )}
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)', fontSize: 12, color: '#a8cfe8', lineHeight: 1.65, wordBreak: 'break-word' }}>
            {output}
          </pre>

          {isCompiling && (
            <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 2, marginTop: 2 }}>
              <span style={{ color: 'var(--emerald)', marginRight: 6, fontFamily: 'var(--font-mono)', fontSize: 13 }}>❯</span>
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleInputSubmit}
                style={{ background: 'transparent', border: 'none', outline: 'none', color: '#e2e8f0', fontFamily: 'var(--font-mono)', fontSize: 12, width: '100%', caretColor: 'var(--emerald)' }}
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