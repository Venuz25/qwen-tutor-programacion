import { SORTING_ALGORITHMS } from './algorithms/sorting';
import { STRUCTURE_ALGORITHMS } from './algorithms/structures';
import SortingRenderer from './renderers/SortingRenderer';
import StructureRenderer from './renderers/StructureRenderer';

export const ALGORITHM_REGISTRY = {
  ...SORTING_ALGORITHMS,
  ...STRUCTURE_ALGORITHMS,
};

const CATEGORY_RENDERERS = {
  sorting: SortingRenderer,
  structures: StructureRenderer,
};

// Extrae y parsea un payload JSON de visualización incrustado en el contenido de un mensaje
export const parseVizPayload = (messageContent) => {
  const match = messageContent.match(/```viz\n([\s\S]*?)\n```/);
  if (!match) return null;

  try {
    const payload = JSON.parse(match[1]);
    const algorithm = ALGORITHM_REGISTRY[payload.algorithm];
    
    return algorithm ? { ...payload, metadata: algorithm } : null;
  } catch {
    return null;
  }
};

// Genera los fotogramas secuenciales de animación para un algoritmo específico
export const generateVizSteps = (payload) => {
  const algo = ALGORITHM_REGISTRY[payload.algorithm];
  if (!algo) throw new Error(`Algoritmo no encontrado: ${payload.algorithm}`);
  
  return algo.generateSteps(payload.params);
};

// Obtiene el componente React renderizador correspondiente a una categoría visual
export const getRenderer = (category) => {
  const Renderer = CATEGORY_RENDERERS[category];
  if (!Renderer) throw new Error(`Categoría no soportada: ${category}`);
  
  return Renderer;
};