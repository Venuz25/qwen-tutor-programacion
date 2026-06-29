import { useState } from 'react';
import { BarChart2, Play } from 'lucide-react';
import VizWindow from './VizWindow';
import { ALGORITHM_REGISTRY } from './VizEngine';

// Renderiza una tarjeta interactiva dentro del chat para previsualizar y abrir animaciones de algoritmos
const VizCard = ({ payload }) => {
  const [isOpen, setIsOpen] = useState(false);
  const algo = ALGORITHM_REGISTRY[payload.algorithm];

  if (!algo) return null;

  return (
    <>
      <div
        id="tour-viz-card"
        onClick={() => setIsOpen(true)}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.15)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(59,130,246,0.08)')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          background: 'rgba(59,130,246,0.08)',
          border: '1px solid rgba(59,130,246,0.25)',
          borderRadius: 10,
          padding: '10px 16px',
          marginTop: 10,
          cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >
        <BarChart2 size={18} style={{ color: 'var(--blue)' }} />
        
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            {payload.title || algo.label}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
            {algo.complexity.time} · {algo.complexity.space}
          </div>
        </div>
        
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          background: 'var(--blue)',
          color: '#fff',
          borderRadius: 7,
          padding: '5px 10px',
          fontSize: 12,
          fontWeight: 500,
          marginLeft: 'auto',
        }}>
          <Play size={11} fill="currentColor" />
          Visualizar
        </div>
      </div>

      {isOpen && (
        <VizWindow
          payload={payload}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
};

export default VizCard;