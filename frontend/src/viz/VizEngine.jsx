import SortingRenderer from './renderers/SortingRenderer';
import { SORTING_ALGORITHMS } from './algorithms/sorting';

export const ALGORITHM_REGISTRY = {
  ...SORTING_ALGORITHMS,
};

const CATEGORY_RENDERERS = {
  sorting: SortingRenderer,
};

export function parseVizPayload(messageContent) {
  const match = messageContent.match(/```viz\n([\s\S]*?)\n```/);
  if (!match) return null;
  try {
    const payload = JSON.parse(match[1]);
    const algorithm = ALGORITHM_REGISTRY[payload.algorithm];
    if (!algorithm) return null;
    return { ...payload, metadata: algorithm };
  } catch {
    return null;
  }
}

export function generateVizSteps(payload) {
  const algo = ALGORITHM_REGISTRY[payload.algorithm];
  if (!algo) throw new Error(`Algoritmo no encontrado: ${payload.algorithm}`);
  return algo.generateSteps(payload.params);
}

export function getRenderer(category) {
  const Renderer = CATEGORY_RENDERERS[category];
  if (!Renderer) throw new Error(`Categoría no soportada: ${category}`);
  return Renderer;
}