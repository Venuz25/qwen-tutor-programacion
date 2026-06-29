import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

// Renderiza la estructura de datos tipo Pila (Stack)
const renderStack = (g, data, highlight, W, H) => {
  const boxW = 100, boxH = 40;
  const startX = W / 2 - boxW / 2;
  const startY = H - 60;

  g.append('path')
    .attr('d', `M ${startX - 8} ${startY - 180} L ${startX - 8} ${startY + 8} L ${startX + boxW + 8} ${startY + 8} L ${startX + boxW + 8} ${startY - 180}`)
    .attr('fill', 'none').attr('stroke', 'var(--border-md)').attr('stroke-width', 4);

  const nodes = g.selectAll('g.node').data(data)
    .join('g').attr('class', 'node')
    .attr('transform', (_, i) => `translate(${startX}, ${startY - (i + 1) * (boxH + 5)})`);

  nodes.append('rect')
    .attr('width', boxW).attr('height', boxH).attr('rx', 6)
    .attr('fill', (_, i) => i === highlight ? '#3b82f6' : 'var(--bg-card)')
    .attr('stroke', (_, i) => i === highlight ? '#60a5fa' : 'var(--border-md)').attr('stroke-width', 2);

  nodes.append('text')
    .attr('x', boxW / 2).attr('y', boxH / 2 + 5).attr('text-anchor', 'middle')
    .attr('fill', (_, i) => i === highlight ? '#fff' : 'var(--text-primary)')
    .attr('font-family', 'var(--font-mono)').attr('font-weight', 'bold').text(d => d);

  if (data.length > 0) {
    g.append('text')
      .attr('x', startX - 40).attr('y', startY - data.length * (boxH + 5) + 25)
      .attr('fill', '#f59e0b').attr('font-size', '13px').attr('font-weight', 'bold').text('Top →');
  }
};

// Renderiza la estructura de datos tipo Cola (Queue)
const renderQueue = (g, data, highlight, H) => {
  const boxW = 60, boxH = 60;
  const startX = 60, startY = H / 2 - boxH / 2;

  const nodes = g.selectAll('g.node').data(data)
    .join('g').attr('class', 'node')
    .attr('transform', (_, i) => `translate(${startX + i * (boxW + 10)}, ${startY})`);

  nodes.append('rect')
    .attr('width', boxW).attr('height', boxH).attr('rx', 8)
    .attr('fill', (_, i) => i === highlight ? '#3b82f6' : 'var(--bg-card)')
    .attr('stroke', (_, i) => i === highlight ? '#60a5fa' : 'var(--border-md)').attr('stroke-width', 2);

  nodes.append('text')
    .attr('x', boxW / 2).attr('y', boxH / 2 + 5).attr('text-anchor', 'middle')
    .attr('fill', (_, i) => i === highlight ? '#fff' : 'var(--text-primary)')
    .attr('font-family', 'var(--font-mono)').attr('font-weight', 'bold').text(d => d);

  if (data.length > 0) {
    g.append('text').attr('x', startX + boxW / 2).attr('y', startY - 15)
      .attr('text-anchor', 'middle').attr('fill', '#ef4444').attr('font-size', '13px').text('Front');
      
    g.append('text').attr('x', startX + (data.length - 1) * (boxW + 10) + boxW / 2).attr('y', startY + boxH + 20)
      .attr('text-anchor', 'middle').attr('fill', '#10b981').attr('font-size', '13px').text('Rear');
  }
};

// Renderiza la estructura de datos tipo Lista Enlazada (Linked List)
const renderLinkedList = (g, data, highlight, ptr, H) => {
  const boxW = 80, boxH = 40;
  const startX = 50, startY = H / 2 - boxH / 2;

  const nodes = g.selectAll('g.node').data(data)
    .join('g').attr('class', 'node')
    .attr('transform', (_, i) => `translate(${startX + i * (boxW + 40)}, ${startY})`);

  nodes.append('rect')
    .attr('width', boxW * 0.7).attr('height', boxH)
    .attr('fill', (_, i) => (ptr === 'found' && i === highlight) ? '#10b981' : (i === highlight ? '#3b82f6' : 'var(--bg-card)'))
    .attr('stroke', 'var(--border-md)').attr('stroke-width', 2);

  nodes.append('rect')
    .attr('x', boxW * 0.7).attr('width', boxW * 0.3).attr('height', boxH)
    .attr('fill', 'var(--bg-surface)').attr('stroke', 'var(--border-md)').attr('stroke-width', 2);

  nodes.append('text')
    .attr('x', (boxW * 0.7) / 2).attr('y', boxH / 2 + 5).attr('text-anchor', 'middle')
    .attr('fill', (_, i) => (i === highlight || (ptr === 'found' && i === highlight)) ? '#fff' : 'var(--text-primary)')
    .attr('font-family', 'var(--font-mono)').attr('font-weight', 'bold').text(d => d);

  nodes.append('circle')
    .attr('cx', boxW * 0.85).attr('cy', boxH / 2).attr('r', 3).attr('fill', '#94a3b8');

  nodes.each(function(_, i) {
    const currentG = d3.select(this);
    
    if (i < data.length - 1) {
      currentG.append('line')
        .attr('x1', boxW * 0.85).attr('y1', boxH / 2)
        .attr('x2', boxW + 35).attr('y2', boxH / 2)
        .attr('stroke', '#94a3b8').attr('stroke-width', 2).attr('marker-end', 'url(#arrow)');
    } else {
      currentG.append('line')
        .attr('x1', boxW * 0.85).attr('y1', boxH / 2)
        .attr('x2', boxW + 20).attr('y2', boxH / 2)
        .attr('stroke', '#94a3b8').attr('stroke-width', 2).attr('marker-end', 'url(#arrow)');
      
      currentG.append('text')
        .attr('x', boxW + 35).attr('y', boxH / 2 + 4)
        .attr('fill', '#94a3b8').attr('font-family', 'var(--font-mono)').attr('font-size', '14px').text('null');
    }
  });

  if (data.length > 0) {
    g.append('text').attr('x', startX + (boxW * 0.7) / 2).attr('y', startY - 15)
      .attr('text-anchor', 'middle').attr('fill', '#ef4444').attr('font-weight', 'bold').text('Head ↓');
  }
  
  if (ptr !== null && typeof ptr === 'number') {
    g.append('text').attr('x', startX + ptr * (boxW + 40) + (boxW * 0.7) / 2).attr('y', startY + boxH + 20)
      .attr('text-anchor', 'middle').attr('fill', '#f59e0b').attr('font-weight', 'bold').text('↑ curr');
  }
};

// Componente principal que orquesta la renderización de estructuras de datos con D3.js
const StructureRenderer = ({ step }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!step || !svgRef.current) return;
    const { type, data, highlight, ptr } = step;

    const svg = d3.select(svgRef.current);
    const W = svgRef.current.clientWidth || 600;
    const H = 280;
    
    svg.attr('width', W).attr('height', H);
    svg.selectAll('*').remove();

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

    if (type === 'stack') renderStack(g, data, highlight, W, H);
    else if (type === 'queue') renderQueue(g, data, highlight, H);
    else if (type === 'll') renderLinkedList(g, data, highlight, ptr, H);
  }, [step]);

  return <svg ref={svgRef} style={{ width: '100%', height: 280, display: 'block' }} />;
};

export default StructureRenderer;