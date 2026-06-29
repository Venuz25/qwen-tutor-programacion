import { useState, useEffect } from 'react';
import axios from 'axios';
import { PanelRightOpen, HelpCircle } from 'lucide-react';

import Sidebar from './components/Sidebar';
import ChatSection from './components/ChatSection';
import CodeCompiler from './components/CodeCompiler';
import GuidedTour from './components/GuidedTour';

const HELLO_WORLD = {
  python:     'print("Hola mundo")',
  javascript: 'console.log("Hola mundo");',
  cpp:        '#include <iostream>\n\nint main() {\n  std::cout << "Hola mundo" << std::endl;\n  return 0;\n}',
  java:       'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hola mundo");\n  }\n}',
  php:        '<?php\necho "Hola mundo\\n";\n?>',
  c:          '#include <stdio.h>\n\nint main() {\n  printf("Hola mundo\\n");\n  return 0;\n}',
};

function App() {
  const [username, setUsername] = useState(localStorage.getItem('tutor_username') || '');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  const [isCompetitiveMode, setIsCompetitiveMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen]         = useState(true);
  const [isCompilerOpen, setIsCompilerOpen]       = useState(false);
  const [isTutorialOpen, setIsTutorialOpen]       = useState(false);

  const [chats, setChats]               = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  const [compilerLanguage, setCompilerLanguage] = useState('python');
  const [compilerCode, setCompilerCode]         = useState(HELLO_WORLD.python);
  const [compilerOutput, setCompilerOutput]     = useState('');
  const [compilerRunTrigger, setCompilerRunTrigger] = useState(0);

  const [tourChatIds, setTourChatIds] = useState({ study: null, anim: null, judge: null });
  const [isTourLoading, setIsTourLoading] = useState(false);

  useEffect(() => {
    if (username) {
      axios.defaults.headers.common['x-user'] = username;
    }
  }, [username]);

  const fetchChats = async () => {
    if (!username) return;
    try {
      const res = await axios.get('http://localhost:5000/api/chats');
      setChats(res.data);
      if (res.data.length > 0 && !activeChatId) setActiveChatId(res.data[0]._id);
    } catch (err) {
      console.error('Error al obtener chats:', err);
    } finally {
      setTimeout(() => setIsInitialLoading(false), 900);
    }
  };

  const handleLogout = () => {
  localStorage.removeItem('tutor_username');
  setUsername('');
  setChats([]);
  setActiveChatId(null);
};

  useEffect(() => { 
    if (username) fetchChats();
  }, [username]);

  const createNewChat = async () => {
    try {
      const res  = await fetch('http://localhost:5000/api/chats', { 
        method: 'POST',
        headers: { 'x-user': username } 
      });
      const chat = await res.json();
      setChats(prev => [chat, ...prev]);
      setActiveChatId(chat._id);
      return chat;
    } catch (err) {
      console.error('Error al crear chat:', err);
    }
  };

  const deleteChat = async (id) => {
    await fetch(`http://localhost:5000/api/chats/${id}`, { 
      method: 'DELETE',
      headers: { 'x-user': username }
    });
    setChats(prev => prev.filter(c => c._id !== id));
    if (activeChatId === id) setActiveChatId(null);
  };

  const normalizeLanguage = (lang) => {
    const map = { js: 'javascript', py: 'python', 'c++': 'cpp' };
    const n = lang?.toLowerCase() || '';
    return map[n] || n;
  };

  const handleCompilerLanguageChange = (lang) => {
    const n = normalizeLanguage(lang);
    setCompilerLanguage(n);
    setCompilerCode(HELLO_WORLD[n] ?? '// Escribe tu código aquí...');
  };

  const handleAutoFillCompiler = (code, lang) => {
    const n = normalizeLanguage(lang);
    setCompilerCode(code);
    setCompilerLanguage(n);
    setIsCompilerOpen(true);
    
    setTimeout(() => {
      setCompilerRunTrigger(prev => prev + 1);
    }, 50);
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthLoading(true);

    const endpoint = isRegistering ? '/api/register' : '/api/login';

    try {
      const res = await axios.post(`http://localhost:5000${endpoint}`, {
        username: loginInput.trim(),
        password: passwordInput
      });

      localStorage.setItem('tutor_username', res.data.username);
      setUsername(res.data.username);
    } catch (error) {
      setAuthError(error.response?.data?.error || 'Error de conexión con el servidor');
    } finally {
      setIsAuthLoading(false);
    }
  };

  // UI de Login/Registro
  if (!username) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-base)', fontFamily: 'var(--font-ui)' }}>
        <div style={{ background: 'var(--bg-card)', padding: '40px', borderRadius: '12px', border: '1px solid var(--border)', width: '100%', maxWidth: '360px', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
          
          <h2 style={{ textAlign: 'center', marginBottom: '24px', color: 'var(--text-primary)' }}>
            {isRegistering ? 'Crear Cuenta Nueva' : 'Iniciar Sesión'}
          </h2>

          <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <input 
              type="text" 
              placeholder="Nombre de usuario" 
              value={loginInput}
              onChange={(e) => setLoginInput(e.target.value)}
              required
              className="input-field"
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
            />
            <input 
              type="password" 
              placeholder="Contraseña" 
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              required
              className="input-field"
              style={{ padding: '12px', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
            />
            
            {authError && <div style={{ color: '#ef4444', fontSize: '13px', textAlign: 'center', background: 'rgba(239,68,68,0.1)', padding: '8px', borderRadius: '6px' }}>{authError}</div>}
            
            <button 
              type="submit" 
              disabled={isAuthLoading}
              style={{ padding: '12px', borderRadius: '8px', background: 'var(--blue)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 'bold', marginTop: '10px', opacity: isAuthLoading ? 0.7 : 1 }}
            >
              {isAuthLoading ? 'Cargando...' : (isRegistering ? 'Registrarse' : 'Entrar')}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <button 
              onClick={() => { setIsRegistering(!isRegistering); setAuthError(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px', textDecoration: 'underline' }}
            >
              {isRegistering ? '¿Ya tienes cuenta? Inicia sesión aquí' : '¿No tienes cuenta? Regístrate aquí'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Loading screen ── */
  if (isInitialLoading) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh',
        background: 'var(--bg-base)',
        fontFamily: 'var(--font-ui)',
        gap: 20,
      }}>
        {/* Animated logo */}
        <div style={{
          width: 60, height: 60, borderRadius: 18,
          background: 'linear-gradient(135deg, #1d4ed8 0%, #7c3aed 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          animation: 'fade-in 0.4s ease',
          boxShadow: '0 0 40px rgba(59,130,246,0.25)',
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>
          </svg>
        </div>

        <div className="spinner" />

        <p style={{
          fontSize: 14, color: 'var(--text-secondary)',
          letterSpacing: '0.04em',
          animation: 'fade-in 0.6s ease 0.2s both',
        }}>
          Conectando con el Tutor...
        </p>
      </div>
    );
  }

  const handleStartTour = async () => {
    setIsTourLoading(true);
    try {
      // Función auxiliar para inyectar los chats directo al backend
      const createMockChat = async (title, userMsg, botMsg) => {
        // 1. Creamos el chat vacío
        const res = await fetch('http://localhost:5000/api/chats', {
          method: 'POST', headers: { 'x-user': username }
        });
        const chat = await res.json();
        const chatId = chat.id || chat._id;
        
        // 2. Le ponemos el título de demostración usando tu ruta PUT
        await fetch(`http://localhost:5000/api/chats/${chatId}`, {
          method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-user': username },
          body: JSON.stringify({ title })
        });

        // 3. Inyectamos los mensajes simulados en la ruta que acabamos de crear en el backend
        await fetch(`http://localhost:5000/api/chats/${chatId}/messages`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user': username },
          body: JSON.stringify({ role: 'user', content: userMsg })
        });
        
        await fetch(`http://localhost:5000/api/chats/${chatId}/messages`, {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'x-user': username },
          body: JSON.stringify({ role: 'assistant', content: botMsg })
        });
        return chatId;
      };

      // 1. Chat de Plan de Estudios
      const studyId = await createMockChat(
        '📚 Tour: Plan de Estudios',
        'Quiero aprender Estructuras de Datos, ¿por dónde empiezo?',
        '¡Excelente iniciativa! Para dominar las estructuras de datos, vamos a deducirlo juntos en lugar de darte un temario aburrido.\n\nImagina que tienes que guardar una lista de tareas del día. ¿Dónde las guardarías? ¿En un espacio de memoria de tamaño fijo, o en uno que pueda crecer dinámicamente?\n\n(Piensa en Arreglos vs. Listas Enlazadas para tu respuesta).'
      );

      // 2. Chat de Animación (Inyectando un JSON válido para D3.js)
      const animId = await createMockChat(
        '💡 Tour: Animaciones',
        'Visualiza cómo funciona el algoritmo Selection Sort.',
        '¡Claro! Aquí tienes la representación visual paso a paso:\n\n```viz\n{\n  "algorithm": "selection_sort",\n  "category": "sorting",\n  "title": "Selection Sort (Demo)",\n  "params": { "array": [45, 12, 88, 23, 67, 34] }\n}\n```\n\nPuedes usar los controles inferiores de la tarjeta para pausar, reiniciar o moverte paso a paso por la animación.'
      );

      // 3. Chat de Modo Juez
      const judgeId = await createMockChat(
        '🏆 Tour: Modo Juez',
        'Envié mi código para el problema "Two Sum" pero falla por tiempo.',
        '[Modo Juez Activado] 🏆\n\n**Veredicto:** Time Limit Exceeded (TLE) ❌\n\n**Análisis:**\nTienes una complejidad actual de O(n²) porque usas dos bucles anidados. Para este problema se espera una solución O(n).\n\n**Pista Socrática:**\n¿Qué estructura de datos te permite buscar si un elemento ya existe en tiempo constante O(1)? Pista: en Python se llama diccionario (Hash Map).'
      );

      // Refrescamos la lista de chats lateral para que aparezcan instantáneamente
      const res = await fetch('http://localhost:5000/api/chats', { headers: { 'x-user': username } });
      const updatedChats = await res.json();
      setChats(updatedChats);

      // Guardamos los IDs generados y abrimos el Tour
      setTourChatIds({ study: studyId, anim: animId, judge: judgeId });
      setIsTutorialOpen(true);
    } catch (error) {
      console.error("Error creando chats del tour", error);
      alert("Hubo un error al generar el tour. Revisa la consola.");
    } finally {
      setIsTourLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', height: '100vh', width: '100%',
      background: 'var(--bg-base)',
      overflow: 'hidden',
      fontFamily: 'var(--font-ui)',
    }}>
      <Sidebar
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen}
        chats={chats} 
        setChats={setChats}
        activeChat={activeChatId} 
        onSelect={setActiveChatId}
        onCreate={createNewChat}  
        onDelete={deleteChat}
        isCompetitiveMode={isCompetitiveMode}
        setIsCompetitiveMode={setIsCompetitiveMode}
        username={username}
        onLogout={handleLogout}
      />

      <main style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Chat */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <ChatSection
            activeChatId={activeChatId}     setActiveChatId={setActiveChatId}
            onCreate={createNewChat}         onChatUpdated={fetchChats}
            compilerCode={compilerCode}      compilerLanguage={compilerLanguage}
            output={compilerOutput}          setOutput={setCompilerOutput}
            onRunCodeFromChat={handleAutoFillCompiler}
            onAutoFillCompiler={handleAutoFillCompiler}
            isCompetitiveMode={isCompetitiveMode}
          />
        </div>

        {/* Open compiler button */}
        {!isCompilerOpen && (
          <button
            onClick={() => setIsCompilerOpen(true)}
            data-tip="Abrir compilador"
            style={{
              position: 'absolute', right: 14, top: 14, zIndex: 10,
              background: 'var(--bg-card)',
              border: '1px solid var(--border-md)',
              borderRadius: 9, padding: 8,
              cursor: 'pointer', color: 'var(--blue)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-hover)'; e.currentTarget.style.borderColor = 'var(--blue)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg-card)'; e.currentTarget.style.borderColor = 'var(--border-md)'; }}
          >
            <PanelRightOpen id="tour-compiler-btn" size={18} />
          </button>
        )}

        {/* Compiler panel */}
        <div style={{
          width: isCompilerOpen ? '38%' : 0,
          transition: 'width 0.28s cubic-bezier(.4,0,.2,1)',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {isCompilerOpen && (
            <CodeCompiler
              id="tour-compiler-panel"
              onClose={() => setIsCompilerOpen(false)}
              code={compilerCode}             setCode={setCompilerCode}
              language={compilerLanguage}     onLanguageChange={handleCompilerLanguageChange}
              output={compilerOutput}         setOutput={setCompilerOutput}
              runTrigger={compilerRunTrigger}
            />
          )}
        </div>

        {/* --- NUEVO: BOTÓN DE TUTORIAL FLOTANTE --- */}
        <button
          onClick={handleStartTour}
          disabled={isTourLoading}
          data-tip="Iniciar Tour Interactivo"
          style={{
            position: 'absolute', bottom: 20, right: isCompilerOpen ? 'calc(38% + 20px)' : 20, // Se mueve si abres el compilador
            zIndex: 40,
            background: 'var(--blue)', color: 'white',
            border: 'none', borderRadius: '50%',
            width: '48px', height: '48px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
            transition: 'all 0.3s cubic-bezier(.4,0,.2,1)',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
                {isTourLoading ? <span style={{fontSize: '12px', fontWeight: 'bold'}}>...</span> : <HelpCircle size={24} />}
        </button>

        {/* Componente del Tour Controlador */}
        {isTutorialOpen && (
          <GuidedTour 
            tourChatIds={tourChatIds}
            onClose={() => setIsTutorialOpen(false)}
            setActiveChatId={setActiveChatId}
            setCompilerOpen={setIsCompilerOpen}    
            setCompilerCode={setCompilerCode}      
            setCompilerLanguage={setCompilerLanguage} 
          />
        )}

      </main>
    </div>
  );
}

export default App;