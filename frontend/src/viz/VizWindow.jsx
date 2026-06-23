import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom'; // 1. IMPORTAMOS PORTAL DE REACT
import { X, Play, Pause, SkipBack, SkipForward, Shuffle, Edit2 } from 'lucide-react';
import { generateVizSteps, getRenderer, ALGORITHM_REGISTRY } from './VizEngine';

const VizWindow = ({ payload: initialPayload, onClose }) => {
  const [payload, setPayload] = useState(initialPayload);
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(500); // ms por step
  const [editMode, setEditMode] = useState(false);
  const [customInput, setCustomInput] = useState('');
  const intervalRef = useRef(null);

  const Renderer = getRenderer(payload.category);

  useEffect(() => {
    try {
      const s = generateVizSteps(payload);
      setSteps(s);
      setCurrentStep(0);
      setIsPlaying(false);
    } catch (err) {
      console.error('Error generando steps:', err);
    }
  }, [payload]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentStep(s => {
          if (s >= steps.length - 1) { setIsPlaying(false); return s; }
          return s + 1;
        });
      }, speed);
    }
    return () => clearInterval(intervalRef.current);
  }, [isPlaying, speed, steps.length]);

  const randomize = () => {
    const category = payload.category;
    let newParams = { ...payload.params };
    if (category === 'sorting') {
      const size = payload.params.array?.length || 8;
      newParams.array = Array.from({ length: size }, () => Math.floor(Math.random() * 90) + 10);
    }
    setPayload(p => ({ ...p, params: newParams }));
  };

  const applyCustomInput = () => {
    try {
      const parsed = JSON.parse(customInput);
      setPayload(p => ({ ...p, params: { ...p.params, ...parsed } }));
      setEditMode(false);
    } catch {
      alert('JSON inválido. Revisa el formato.');
    }
  };

  const step = steps[currentStep];
  const algo = ALGORITHM_REGISTRY[payload.algorithm];

  // 2. GUARDAMOS TODO EL MODAL EN UNA VARIABLE
  const modalContent = (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99999, // Forzamos a que cubra 100% de la pantalla
      background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
      display: 'flex', overflowY: 'auto', padding: '24px', boxSizing: 'border-box'
    }} onClick={e => e.target === e.currentTarget && onClose()}>

      <div style={{
        width: '100%', maxWidth: '860px',
        margin: 'auto', 
        background: 'var(--bg-surface)', borderRadius: 16,
        border: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 24px 80px rgba(0,0,0,0.5)',
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 18px', borderBottom: '1px solid var(--border)',
          background: 'var(--bg-card)',
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
              {payload.title || algo?.label}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
              {algo?.complexity.time} · {algo?.complexity.space} · {algo?.description}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'transparent', border: 'none',
            color: 'var(--text-muted)', cursor: 'pointer', padding: 4,
          }}>
            <X size={18} />
          </button>
        </div>

        {/* Canvas D3 */}
        <div style={{ flex: 1, minHeight: 0, position: 'relative', background: 'var(--bg-base)' }}>
          {Renderer && step ? (
            <Renderer step={step} params={payload.params} />
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300 }}>
              <div className="spinner" />
            </div>
          )}
        </div>

        {/* Step description */}
        {step?.description && (
          <div style={{
            padding: '8px 18px', fontSize: 13, color: 'var(--text-secondary)',
            background: 'var(--bg-card)', borderTop: '1px solid var(--border)',
            minHeight: 36,
          }}>
            {step.description}
          </div>
        )}

        {/* Controles */}
        <div style={{
          padding: '12px 18px', borderTop: '1px solid var(--border)',
          background: 'var(--bg-surface)', display: 'flex',
          alignItems: 'center', gap: 10, flexWrap: 'wrap',
        }}>
          <button onClick={() => setCurrentStep(0)} title="Reiniciar" style={iconBtnStyle}>
            <SkipBack size={15} />
          </button>
          <button onClick={() => setCurrentStep(s => Math.max(0, s - 1))} title="Anterior" style={iconBtnStyle}>
            ◀
          </button>
          <button
            onClick={() => setIsPlaying(p => !p)}
            style={{ ...iconBtnStyle, background: 'var(--blue)', color: '#fff', minWidth: 80 }}
          >
            {isPlaying ? <><Pause size={14} /> Pausar</> : <><Play size={14} /> Play</>}
          </button>
          <button onClick={() => setCurrentStep(s => Math.min(steps.length - 1, s + 1))} title="Siguiente" style={iconBtnStyle}>
            ▶
          </button>
          <button onClick={() => setCurrentStep(steps.length - 1)} title="Final" style={iconBtnStyle}>
            <SkipForward size={15} />
          </button>

          <span style={{ fontSize: 12, color: 'var(--text-muted)', minWidth: 70 }}>
            {currentStep + 1} / {steps.length}
          </span>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Veloc.</span>
            <input type="range" min={100} max={2000} step={100}
              value={2100 - speed}
              onChange={e => setSpeed(2100 - Number(e.target.value))}
              style={{ width: 80 }} />
          </div>

          <button onClick={randomize} style={iconBtnStyle} title="Datos aleatorios">
            <Shuffle size={14} />
          </button>
          <button onClick={() => {
            setCustomInput(JSON.stringify(payload.params, null, 2));
            setEditMode(e => !e);
          }} style={iconBtnStyle} title="Editar datos manualmente">
            <Edit2 size={14} />
          </button>
        </div>

        {/* Edit panel */}
        {editMode && (
          <div style={{
            padding: '12px 18px', borderTop: '1px solid var(--border)',
            background: 'var(--bg-card)',
          }}>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>
              Edita los parámetros en JSON y presiona Aplicar:
            </div>
            <textarea
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              rows={4}
              style={{
                width: '100%', background: 'var(--bg-base)',
                border: '1px solid var(--border)', borderRadius: 8,
                color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
                fontSize: 12, padding: '8px 10px', resize: 'vertical',
              }}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={applyCustomInput} style={{...iconBtnStyle, background: 'var(--blue)', color: 'white'}}>
                Aplicar
              </button>
              <button onClick={() => setEditMode(false)} style={iconBtnStyle}>
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // 3. LE DECIMOS A REACT QUE DIBUJE ESTO AFUERA DEL CHAT (EN EL BODY)
  return createPortal(modalContent, document.body);
};

const iconBtnStyle = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  background: 'var(--bg-card)', border: '1px solid var(--border)',
  borderRadius: 7, padding: '5px 10px', color: 'var(--text-secondary)',
  cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font-ui)',
  transition: 'all 0.15s',
};

export default VizWindow;