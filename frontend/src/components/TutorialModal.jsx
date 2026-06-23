import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, ChevronLeft, Bot, MessageSquare, BarChart2, Code2, Trophy, Settings, AlertTriangle, MessageSquareHeart, Play, Pause } from 'lucide-react';
import SortingRenderer from '../viz/renderers/SortingRenderer';
import { generateVizSteps } from '../viz/VizEngine';

const TutorialModal = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  // --- Lógica para la previsualización animada ---
  const [previewStep, setPreviewStep] = useState(0);
  const [previewIsPlaying, setPreviewIsPlaying] = useState(false);
  const [previewSteps, setPreviewSteps] = useState([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    // Generamos los pasos matemáticos del Bubble Sort para la previsualización
    try {
      const steps = generateVizSteps({
        algorithm: 'bubble_sort',
        category: 'sorting',
        params: { array: [45, 12, 88, 23, 67, 34] }
      });
      setPreviewSteps(steps);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (previewIsPlaying && previewSteps.length > 0) {
      intervalRef.current = setInterval(() => {
        setPreviewStep(s => {
          if (s >= previewSteps.length - 1) {
            setPreviewIsPlaying(false);
            return s;
          }
          return s + 1;
        });
      }, 400); // Velocidad moderada para que se aprecie
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [previewIsPlaying, previewSteps.length]);
  // ------------------------------------------------

  const steps = [
    {
      icon: <Bot size={40} color="#f59e0b" />,
      title: "Bienvenido a TutorByte (Beta)",
      description: "No soy un chat común que te da las respuestas hechas.\n\nMi objetivo es ser tu tutor personal: te haré pensar, te daré pistas y te guiaré paso a paso para que aprendas a programar y desarrollar tu lógica por ti mismo."
    },
    {
      icon: <MessageSquare size={40} color="#3b82f6" />,
      title: "Cómo comunicarte con el Tutor",
      description: "Para entender qué necesitas, el sistema busca palabras clave específicas en tus mensajes.\n\n⚠️ TIP IMPORTANTE: ¡Cuida tu ortografía! Intenta ser claro al pedir cosas (ej. usa palabras como 'ayuda', 'visualizar' o 'explicar'). Si hay muchos errores de escritura, el tutor podría confundirse y no activar las herramientas correctas."
    },
    {
      icon: <BarChart2 size={40} color="#10b981" />,
      title: "Animaciones Interactivas",
      description: (
        <>
          <span style={{ display: 'block', marginBottom: '10px' }}>
            ¡Puedo dibujar los algoritmos para ti! Actualmente soporto <b>Ordenamientos</b> y <b>Estructuras de Datos</b> (pronto agregaremos Grafos y Árboles).
            <br/><br/>
            Pídele al tutor algo como <i>"Anima el Bubble Sort"</i> y verás una ventana como esta:
          </span>
          <div style={{
            height: '185px', width: '100%', position: 'relative',
            background: 'var(--bg-base)', borderRadius: '10px',
            overflow: 'hidden', border: '1px solid var(--border)'
          }}>
            <div style={{ transform: 'scale(0.65)', transformOrigin: 'top center', width: '100%', height: '100%', pointerEvents: 'none' }}>
               {previewSteps.length > 0 && (
                 <SortingRenderer step={previewSteps[previewStep]} params={{ array: [] }} />
               )}
            </div>
            <button
              onClick={() => {
                if (previewStep >= previewSteps.length - 1) setPreviewStep(0);
                setPreviewIsPlaying(!previewIsPlaying);
              }}
              style={{
                position: 'absolute', bottom: 10, right: 10,
                background: 'var(--blue)', color: 'white', border: 'none',
                borderRadius: '8px', padding: '6px 12px', display: 'flex',
                gap: '6px', cursor: 'pointer', fontSize: '12px', alignItems: 'center',
                boxShadow: '0 4px 10px rgba(0,0,0,0.2)', fontWeight: 'bold'
              }}
            >
              {previewIsPlaying ? <Pause size={14}/> : <Play size={14}/>}
              {previewIsPlaying ? 'Pausar' : 'Reproducir Demo'}
            </button>
          </div>
        </>
      )
    },
    {
      icon: <Code2 size={40} color="#8b5cf6" />,
      title: "Compilador de Código Integrado",
      description: "A tu derecha tienes un espacio para escribir y ejecutar código.\n\n• Soporta: Python, JS, C++, Java, PHP y C.\n• Funciona de manera aislada (sin acceso a internet) y se detendrá automáticamente si creas un ciclo infinito.\n• Puedes enviar tu código y los errores directamente al chat usando el botón inferior para que te ayude a encontrar el problema."
    },
    {
      icon: <Trophy size={40} color="#fcd34d" />,
      title: "Modo Juez (Competitivo)",
      description: "Al activar el icono del Trofeo en el menú, el tutor se volverá sumamente estricto.\n\nEvaluará la velocidad y eficiencia de tu código (como en competencias de programación). \n\n⚠️ OJO: Este es el modo más riguroso y aún está en fase temprana de pruebas. Si notas que evalúa algo incorrectamente, no dudes en decírnoslo."
    },
    {
      icon: <Settings size={40} color="#64748b" />,
      title: "Organiza tus Chats",
      description: "Tu progreso se guarda de forma segura en tu propio entorno.\n\nEn el panel izquierdo puedes organizar tu espacio de trabajo:\n• Haz clic y arrastra los chats para reordenarlos a tu gusto.\n• Pasa el mouse sobre cualquier chat para renombrarlo o eliminarlo permanentemente."
    },
    {
      icon: <AlertTriangle size={40} color="#ef4444" />,
      title: "Limitaciones Actuales (Versión Beta)",
      description: "Ten en cuenta los siguientes detalles durante tus pruebas:\n1. La mala ortografía puede hacer que los comandos fallen o no se reconozcan.\n2. El compilador no soporta librerías externas pesadas (como React o NumPy).\n3. Algunas animaciones podrían no verse bien en pantallas muy pequeñas o móviles.\n4. Hacemos uso de un modelo relativamente pequeño para mantener la velocidad de respuesta, por lo que podría no entenderte tan bien como otros modelos más grandes.\n5. Habra más de un tester probando la app al mismo tiempo, por lo que podría haber retrasos en la respuesta del tutor si el servidor está ocupado."
    },
    {
      icon: <MessageSquareHeart size={40} color="#ec4899" />,
      title: "Envianos tus Sugerencias",
      description: "TutorByte está dando sus primeros pasos. Lo que estás viendo no es una versión final, sino un prototipo inicial y tú eres una de las primeras personas en probarlo.\n\nTu misión, si decides aceptarla, es intentar encontrar fallos en el sistema. Si el chat se congela, si una animación se ve extraña, o si se te ocurre algo genial que podamos agregar, por favor cuéntanos aquí:",
      link: "https://forms.gle/mMTXiMiwbdbmsdfZ7",
      linkText: "Dejar Sugerencias"
    }
  ];

  const step = steps[currentStep];

  const modalContent = (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999999,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', boxSizing: 'border-box'
    }}>
      <div style={{
        width: '100%', maxWidth: '520px',
        background: 'var(--bg-surface)', borderRadius: '20px',
        border: '1px solid var(--border)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'fade-in 0.3s ease-out'
      }}>
        
        {/* Header con botón de cerrar */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '12px 12px 0' }}>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none', color: 'var(--text-muted)',
            cursor: 'pointer', padding: '6px', borderRadius: '50%', transition: 'color 0.2s'
          }} onMouseEnter={e => e.currentTarget.style.color = 'var(--text-primary)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
            <X size={20} />
          </button>
        </div>

        {/* Contenido principal */}
        <div style={{ padding: '0 32px 20px', textAlign: 'center', minHeight: '340px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
            <div style={{ 
              padding: '16px', background: 'var(--bg-base)', 
              borderRadius: '50%', border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              {step.icon}
            </div>
          </div>
          
          <h2 style={{ 
            margin: '0 0 16px 0', fontSize: '22px', 
            color: 'var(--text-primary)', fontFamily: 'var(--font-ui)' 
          }}>
            {step.title}
          </h2>
          
          <div style={{ 
            margin: 0, fontSize: '14px', color: 'var(--text-secondary)', 
            lineHeight: 1.6, whiteSpace: 'pre-wrap', textAlign: 'left',
            background: currentStep !== 2 ? 'var(--bg-base)' : 'transparent',
            padding: currentStep !== 2 ? '16px' : '0',
            borderRadius: '10px',
            border: currentStep !== 2 ? '1px solid var(--border)' : 'none'
          }}>
            {step.description}
          </div>

          {step.link && (
            <a href={step.link} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-block', marginTop: '24px', padding: '12px 20px',
              background: 'rgba(236,72,153,0.1)', color: '#ec4899',
              borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold',
              border: '1px solid rgba(236,72,153,0.3)', fontSize: '15px',
              transition: 'all 0.2s', alignSelf: 'center'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(236,72,153,0.2)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(236,72,153,0.1)'}
            >
              {step.linkText}
            </a>
          )}
        </div>

        {/* Footer con controles */}
        <div style={{ 
          padding: '16px 24px', background: 'var(--bg-card)', 
          borderTop: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' 
        }}>
          
          {/* Indicadores (Dots) */}
          <div style={{ display: 'flex', gap: '6px' }}>
            {steps.map((_, idx) => (
              <div key={idx} style={{
                width: idx === currentStep ? '18px' : '8px',
                height: '8px', borderRadius: '4px',
                background: idx === currentStep ? 'var(--blue)' : 'var(--border-md)',
                transition: 'all 0.3s ease'
              }} />
            ))}
          </div>

          {/* Botones de navegación */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {currentStep > 0 && (
              <button 
                onClick={() => setCurrentStep(c => c - 1)}
                className="btn-base btn-ghost"
                style={{ padding: '8px 12px', fontSize: '14px' }}
              >
                <ChevronLeft size={18} /> Atrás
              </button>
            )}
            
            {currentStep < steps.length - 1 ? (
              <button 
                onClick={() => setCurrentStep(c => c + 1)}
                className="btn-base btn-primary"
                style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '14px' }}
              >
                Siguiente <ChevronRight size={18} />
              </button>
            ) : (
              <button 
                onClick={onClose}
                className="btn-base btn-primary"
                style={{ padding: '8px 16px', background: 'var(--emerald)', borderColor: 'var(--emerald)', fontSize: '14px' }}
              >
                ¡Comenzar!
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default TutorialModal;