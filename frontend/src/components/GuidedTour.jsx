import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, ChevronRight, ChevronLeft, Bot, Sidebar, Trophy, Code2, MessageSquareHeart, BarChart2 } from 'lucide-react';

// Gestiona el renderizado y la lógica de navegación del tour guiado interactivo
const GuidedTour = ({ tourChatIds, onClose, setActiveChatId, setCompilerOpen, setCompilerCode, setCompilerLanguage }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState(null);

  const steps = [
    {
      target: null,
      icon: <Bot size={32} color="#f59e0b" />,
      title: "Bienvenido al Tour Guiado",
      description: "TutorByte no es un simple chat, es un entorno de desarrollo integrado con un tutor socrático.\n\nEn este recorrido hemos creado 3 chats de demostración para ti. Deja que te muestre cómo sacarles el máximo provecho.",
      position: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
      action: () => setCompilerOpen(false)
    },
    {
      target: '#tour-sidebar',
      icon: <Sidebar size={32} color="#3b82f6" />,
      title: "1. Panel de Control",
      description: "Aquí verás los chats de demostración que acabamos de inyectar. \n\n✨ Buenas Prácticas: Usa un chat distinto para cada tema. Puedes arrastrarlos para reordenarlos o pasar el mouse para renombrarlos/eliminarlos.",
      position: { top: '80px', left: '290px' },
      action: null
    },
    {
      target: '#tour-chat-area',
      icon: <MessageSquareHeart size={32} color="#0ea5e9" />,
      title: "2. Método Socrático",
      description: "Fíjate en esta conversación. El tutor nunca te dará la respuesta servida en bandeja de plata.\n\nAnaliza tu pregunta y te responde con una analogía o una contrapregunta para que tú mismo deduzcas la solución (ej. Arreglos vs Listas Enlazadas).",
      position: { top: '100px', left: '50%', transform: 'translateX(-50%)' },
      action: () => setActiveChatId(tourChatIds.study)
    },
    {
      target: '#tour-viz-card',
      icon: <BarChart2 size={32} color="#10b981" />,
      title: "3. Animaciones Interactivas",
      description: "¡Esta es la magia del Frontend!\n\nEl LLM generó un bloque de datos matemáticos y nuestro motor D3.js lo renderizó.\n\n👉 ¡Adelante, interactúa con la tarjeta de abajo! Haz clic en 'Reproducir', adelanta los pasos o cambia la velocidad.",
      position: { top: '80px', left: '50%', transform: 'translateX(-50%)' },
      action: () => setActiveChatId(tourChatIds.anim)
    },
    {
      target: '#tour-chat-area',
      icon: <Trophy size={32} color="#fcd34d" />,
      title: "4. Modo Juez",
      description: "Si haces clic en el trofeo (🏆) del menú, el LLM se volverá un juez despiadado.\n\nMira este ejemplo: Detectó que el usuario envió un código con dos bucles anidados y lo penalizó con un TLE (Time Limit Exceeded) exigiéndole una solución O(n).",
      position: { top: '100px', left: '50%', transform: 'translateX(-50%)' },
      action: () => setActiveChatId(tourChatIds.judge)
    },
    {
      target: '#tour-compiler-panel',
      icon: <Code2 size={32} color="#8b5cf6" />,
      title: "5. Sandbox Aislado",
      description: "A tu derecha hemos abierto el Compilador Integrado y preparado un fragmento en Python.\n\n👉 Haz clic en 'Ejecutar' (Run) para probarlo.\n👉 Prueba el botón 'Adjuntar Compilador' para inyectar este código directamente en la conversación.",
      position: { top: '100px', right: '40%' },
      action: () => {
        setCompilerOpen(true);
        setCompilerLanguage('python');
        setCompilerCode('def saludo():\n    print("¡El compilador funciona perfectamente!")\n    \n    # TODO: Intenta causar un error de sintaxis y\n    # usa el botón Adjuntar Compilador para pedir ayuda.\n\nsaludo()');
      }
    },
    {
      target: null,
      icon: <MessageSquareHeart size={32} color="#ec4899" />,
      title: "¡Misión del Tester!",
      description: "Eres de los primeros en probar esto. Si el bot se confunde, si encuentras bugs visuales o tienes ideas geniales, por favor cuéntanos.\n\n¿Estás listo para intentar romper la aplicación?",
      link: "https://forms.gle/mMTXiMiwbdbmsdfZ7",
      linkText: "🚀 Ir al Formulario de Testers",
      position: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
      action: () => setCompilerOpen(false)
    }
  ];

  const step = steps[currentStep];

  useEffect(() => {
    if (step.action) step.action();

    // Calcula y actualiza las coordenadas del elemento objetivo para el efecto de foco visual
    const updatePosition = () => {
      if (!step.target) {
        setTargetRect(null);
        return;
      }

      setTimeout(() => {
        const el = document.querySelector(step.target);
        if (el) {
          const rect = el.getBoundingClientRect();
          setTargetRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
          el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
        }
      }, 150);
    };

    updatePosition();
    const interval = setInterval(updatePosition, 300);
    
    return () => clearInterval(interval);
  }, [currentStep, step.target]);

  const overlayContent = (
    <div style={{ position: 'fixed', inset: 0, zIndex: 99999, pointerEvents: 'none' }}>
      
      {targetRect ? (
        <div style={{
          position: 'absolute',
          top: targetRect.top - 12, left: targetRect.left - 12,
          width: targetRect.width + 24, height: targetRect.height + 24,
          borderRadius: '16px',
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.85)',
          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
          pointerEvents: 'none'
        }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', transition: 'background 0.4s' }} />
      )}

      <div style={{
        position: 'absolute', ...step.position, width: '400px',
        background: 'var(--bg-surface)', borderRadius: '16px', padding: '24px',
        border: '1px solid var(--border)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)',
        transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
        display: 'flex', flexDirection: 'column', gap: '16px',
        pointerEvents: 'auto'
      }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', background: 'var(--bg-base)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              {step.icon}
            </div>
            <h3 style={{ margin: 0, fontSize: '18px', color: 'var(--text-primary)' }}>{step.title}</h3>
          </div>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ margin: 0, fontSize: '14.5px', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {step.description}
        </p>

        {step.link && (
          <a href={step.link} target="_blank" rel="noopener noreferrer" style={{
            display: 'inline-block', padding: '12px 16px', background: 'rgba(236,72,153,0.1)', color: '#ec4899',
            borderRadius: '8px', textDecoration: 'none', fontWeight: 'bold', border: '1px solid rgba(236,72,153,0.3)',
            fontSize: '14px', textAlign: 'center', marginTop: '4px'
          }}>
            {step.linkText}
          </a>
        )}

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '12px' }}>
          <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 'bold' }}>
            {currentStep + 1} de {steps.length}
          </span>
          
          <div style={{ display: 'flex', gap: '8px' }}>
            {currentStep > 0 && (
              <button onClick={() => setCurrentStep(c => c - 1)} className="btn-base btn-ghost" style={{ padding: '8px 12px', fontSize: '14px' }}>
                <ChevronLeft size={16} /> Atrás
              </button>
            )}
            {currentStep < steps.length - 1 ? (
              <button onClick={() => setCurrentStep(c => c + 1)} className="btn-base btn-primary" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
                Siguiente <ChevronRight size={16} />
              </button>
            ) : (
              <button onClick={onClose} className="btn-base btn-primary" style={{ padding: '8px 16px', background: 'var(--emerald)', borderColor: 'var(--emerald)', fontSize: '14px' }}>
                Finalizar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(overlayContent, document.body);
};

export default GuidedTour;