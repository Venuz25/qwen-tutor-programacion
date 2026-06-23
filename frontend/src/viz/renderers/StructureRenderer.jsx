import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const StructureRenderer = ({ step }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!step || !svgRef.current) return;
    const { type, data, highlight, ptr } = step;

    const svg = d3.select(svgRef.current);
    const W = svgRef.current.clientWidth || 600;
    const H = 280;
    
    svg.attr('width', W).attr('height', H);
    svg.selectAll('*').remove(); // Limpiamos para dibujar el nuevo fotograma exacto

    // Definir la punta de la flecha para la Lista Enlazada
    svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 8)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#94a3b8');

    const g = svg.append('g').attr('transform', `translate(20, 20)`);

    // ==========================================
    // 1. RENDERIZADOR DE PILAS (STACKS)
    // ==========================================
    if (type === 'stack') {
      const boxW = 100, boxH = 40;
      const startX = W / 2 - boxW / 2;
      const startY = H - 60;

      // Dibujar "Vaso" de la Pila (U-shape)
      g.append('path')
        .attr('d', `M ${startX-8} ${startY-180} L ${startX-8} ${startY+8} L ${startX+boxW+8} ${startY+8} L ${startX+boxW+8} ${startY-180}`)
        .attr('fill', 'none').attr('stroke', 'var(--border-md)').attr('stroke-width', 4);

      // Dibujar elementos
      const nodes = g.selectAll('g.node').data(data);
      const enterNodes = nodes.enter().append('g').attr('class', 'node')
        .attr('transform', (d, i) => `translate(${startX}, ${startY - (i + 1) * (boxH + 5)})`);

      enterNodes.append('rect')
        .attr('width', boxW).attr('height', boxH).attr('rx', 6)
        .attr('fill', (d, i) => i === highlight ? '#3b82f6' : 'var(--bg-card)')
        .attr('stroke', (d, i) => i === highlight ? '#60a5fa' : 'var(--border-md)').attr('stroke-width', 2);

      enterNodes.append('text')
        .attr('x', boxW / 2).attr('y', boxH / 2 + 5).attr('text-anchor', 'middle')
        .attr('fill', (d, i) => i === highlight ? '#fff' : 'var(--text-primary)')
        .attr('font-family', 'var(--font-mono)').attr('font-weight', 'bold').text(d => d);

      // Etiqueta de TOPE (Top)
      if (data.length > 0) {
        g.append('text')
          .attr('x', startX - 40).attr('y', startY - data.length * (boxH + 5) + 25)
          .attr('fill', '#f59e0b').attr('font-size', '13px').attr('font-weight', 'bold').text('Top →');
      }

    // ==========================================
    // 2. RENDERIZADOR DE COLAS (QUEUES)
    // ==========================================
    } else if (type === 'queue') {
      const boxW = 60, boxH = 60;
      const startX = 60, startY = H / 2 - boxH / 2;

      const nodes = g.selectAll('g.node').data(data);
      const enterNodes = nodes.enter().append('g').attr('class', 'node')
        .attr('transform', (d, i) => `translate(${startX + i * (boxW + 10)}, ${startY})`);

      enterNodes.append('rect')
        .attr('width', boxW).attr('height', boxH).attr('rx', 8)
        .attr('fill', (d, i) => i === highlight ? '#3b82f6' : 'var(--bg-card)')
        .attr('stroke', (d, i) => i === highlight ? '#60a5fa' : 'var(--border-md)').attr('stroke-width', 2);

      enterNodes.append('text')
        .attr('x', boxW / 2).attr('y', boxH / 2 + 5).attr('text-anchor', 'middle')
        .attr('fill', (d, i) => i === highlight ? '#fff' : 'var(--text-primary)')
        .attr('font-family', 'var(--font-mono)').attr('font-weight', 'bold').text(d => d);

      // Etiquetas Front / Rear
      if (data.length > 0) {
        g.append('text').attr('x', startX + boxW / 2).attr('y', startY - 15)
         .attr('text-anchor', 'middle').attr('fill', '#ef4444').attr('font-size', '13px').text('Front');
        g.append('text').attr('x', startX + (data.length - 1) * (boxW + 10) + boxW / 2).attr('y', startY + boxH + 20)
         .attr('text-anchor', 'middle').attr('fill', '#10b981').attr('font-size', '13px').text('Rear');
      }

    // ==========================================
    // 3. RENDERIZADOR DE LISTAS ENLAZADAS (LINKED LIST)
    // ==========================================
    } else if (type === 'll') {
      const boxW = 80, boxH = 40;
      const startX = 50, startY = H / 2 - boxH / 2;

      const nodes = g.selectAll('g.node').data(data);
      const enterNodes = nodes.enter().append('g').attr('class', 'node')
        .attr('transform', (d, i) => `translate(${startX + i * (boxW + 40)}, ${startY})`);

      // Parte del VALOR (izq)
      enterNodes.append('rect')
        .attr('width', boxW * 0.7).attr('height', boxH)
        .attr('fill', (d, i) => (ptr === 'found' && i === highlight) ? '#10b981' : (i === highlight ? '#3b82f6' : 'var(--bg-card)'))
        .attr('stroke', 'var(--border-md)').attr('stroke-width', 2);

      // Parte del NEXT (der)
      enterNodes.append('rect')
        .attr('x', boxW * 0.7).attr('width', boxW * 0.3).attr('height', boxH)
        .attr('fill', 'var(--bg-surface)').attr('stroke', 'var(--border-md)').attr('stroke-width', 2);

      // Texto de valor
      enterNodes.append('text')
        .attr('x', (boxW * 0.7) / 2).attr('y', boxH / 2 + 5).attr('text-anchor', 'middle')
        .attr('fill', (d, i) => (i === highlight || (ptr === 'found' && i === highlight)) ? '#fff' : 'var(--text-primary)')
        .attr('font-family', 'var(--font-mono)').attr('font-weight', 'bold').text(d => d);

      // Puntito del puntero (centro de caja next)
      enterNodes.append('circle')
        .attr('cx', boxW * 0.85).attr('cy', boxH / 2).attr('r', 3).attr('fill', '#94a3b8');

      // Flechas conectoras
      nodes.enter().each(function(d, i) {
        if (i < data.length - 1) {
          g.append('line')
            .attr('x1', startX + i * (boxW + 40) + boxW * 0.85).attr('y1', startY + boxH / 2)
            .attr('x2', startX + (i + 1) * (boxW + 40) - 5).attr('y2', startY + boxH / 2)
            .attr('stroke', '#94a3b8').attr('stroke-width', 2).attr('marker-end', 'url(#arrow)');
        } else {
          // Última flecha apuntando a "null"
          g.append('line')
            .attr('x1', startX + i * (boxW + 40) + boxW * 0.85).attr('y1', startY + boxH / 2)
            .attr('x2', startX + i * (boxW + 40) + boxW + 20).attr('y2', startY + boxH / 2)
            .attr('stroke', '#94a3b8').attr('stroke-width', 2).attr('marker-end', 'url(#arrow)');
          
          g.append('text')
            .attr('x', startX + i * (boxW + 40) + boxW + 35).attr('y', startY + boxH / 2 + 4)
            .attr('fill', '#94a3b8').attr('font-family', 'var(--font-mono)').attr('font-size', '14px').text('null');
        }
      });

      // Etiqueta 'Head'
      if (data.length > 0) {
        g.append('text').attr('x', startX + (boxW*0.7) / 2).attr('y', startY - 15)
         .attr('text-anchor', 'middle').attr('fill', '#ef4444').attr('font-weight', 'bold').text('Head ↓');
      }
      
      // Puntero 'current' que busca
      if (ptr !== null && typeof ptr === 'number') {
        g.append('text').attr('x', startX + ptr * (boxW + 40) + (boxW*0.7)/2).attr('y', startY + boxH + 20)
         .attr('text-anchor', 'middle').attr('fill', '#f59e0b').attr('font-weight', 'bold').text('↑ curr');
      }
    }

  }, [step]);

  return <svg ref={svgRef} style={{ width: '100%', height: 280, display: 'block' }} />;
};

export default StructureRenderer;