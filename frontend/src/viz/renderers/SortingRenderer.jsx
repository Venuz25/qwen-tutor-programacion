import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

// Este renderer recibe un "step" y usa D3 para dibujar el estado actual
// Cada categoría tiene su propio renderer con lógica D3 especializada
const SortingRenderer = ({ step, params }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!step || !svgRef.current) return;
    const { array, comparing, sorted, pivot, phase } = step;

    const svg = d3.select(svgRef.current);
    const W = svgRef.current.clientWidth || 600;
    const H = 280;
    const margin = { top: 20, right: 20, bottom: 40, left: 20 };
    const innerW = W - margin.left - margin.right;
    const innerH = H - margin.top - margin.bottom;

    svg.attr('width', W).attr('height', H);

    const g = svg.select('g.main').empty()
      ? svg.append('g').attr('class', 'main').attr('transform', `translate(${margin.left},${margin.top})`)
      : svg.select('g.main');

    const n = array.length;
    const xScale = d3.scaleBand().domain(d3.range(n)).range([0, innerW]).padding(0.12);
    const yScale = d3.scaleLinear().domain([0, d3.max(array) * 1.1]).range([innerH, 0]);

    // Color de cada barra según estado
    const getColor = (i) => {
      if (phase === 'done' || sorted.includes(i)) return '#10b981'; // verde = sorted
      if (i === pivot) return '#ef4444';                            // rojo = pivot
      if (comparing.includes(i)) return '#f59e0b';                 // amarillo = comparing
      return '#3b82f6';                                             // azul = default
    };

    // Barras con transición suave
    const bars = g.selectAll('rect.bar').data(array, (_, i) => i);

    bars.enter().append('rect').attr('class', 'bar')
      .attr('x', (_, i) => xScale(i))
      .attr('y', innerH)
      .attr('width', xScale.bandwidth())
      .attr('height', 0)
      .attr('rx', 4)
      .merge(bars)
      .transition().duration(200)
      .attr('x', (_, i) => xScale(i))
      .attr('y', d => yScale(d))
      .attr('width', xScale.bandwidth())
      .attr('height', d => innerH - yScale(d))
      .attr('fill', (_, i) => getColor(i))
      .attr('rx', 4);

    bars.exit().remove();

    // Etiquetas de valor
    const labels = g.selectAll('text.val').data(array, (_, i) => i);

    labels.enter().append('text').attr('class', 'val')
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--text-secondary)')
      .attr('font-size', '11px')
      .attr('font-family', 'var(--font-mono)')
      .merge(labels)
      .transition().duration(200)
      .attr('x', (_, i) => xScale(i) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d) - 4)
      .text(d => d);

    labels.exit().remove();

    // Etiquetas de índice abajo
    const idxLabels = g.selectAll('text.idx').data(array, (_, i) => i);

    idxLabels.enter().append('text').attr('class', 'idx')
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--text-muted)')
      .attr('font-size', '10px')
      .merge(idxLabels)
      .attr('x', (_, i) => xScale(i) + xScale.bandwidth() / 2)
      .attr('y', innerH + 16)
      .text((_, i) => i);

    idxLabels.exit().remove();

  }, [step]);

  return <svg ref={svgRef} style={{ width: '100%', height: 280, display: 'block' }} />;
};

export default SortingRenderer;