import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

// Renderiza un fotograma de un algoritmo de ordenamiento usando D3.js
const SortingRenderer = ({ step }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!step || !svgRef.current) return;
    
    const { array, comparing, sorted, pivot, phase } = step;
    const svg = d3.select(svgRef.current);
    
    const width = svgRef.current.clientWidth || 600;
    const height = 280;
    const margin = { top: 20, right: 20, bottom: 40, left: 20 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    svg.attr('width', width).attr('height', height);

    const g = svg.select('g.main').empty()
      ? svg.append('g').attr('class', 'main').attr('transform', `translate(${margin.left},${margin.top})`)
      : svg.select('g.main');

    const xScale = d3.scaleBand().domain(d3.range(array.length)).range([0, innerW]).padding(0.12);
    const yScale = d3.scaleLinear().domain([0, d3.max(array) * 1.1]).range([innerH, 0]);

    // Determina el color de una barra según su estado en el algoritmo
    const getColor = (i) => {
      if (phase === 'done' || sorted.includes(i)) return '#10b981';
      if (i === pivot) return '#ef4444';
      if (comparing.includes(i)) return '#f59e0b';
      return '#3b82f6';
    };

    g.selectAll('rect.bar')
      .data(array, (_, i) => i)
      .join(
        enter => enter.append('rect')
          .attr('class', 'bar')
          .attr('x', (_, i) => xScale(i))
          .attr('y', innerH)
          .attr('width', xScale.bandwidth())
          .attr('height', 0)
          .attr('rx', 4)
      )
      .transition().duration(200)
      .attr('x', (_, i) => xScale(i))
      .attr('y', d => yScale(d))
      .attr('width', xScale.bandwidth())
      .attr('height', d => innerH - yScale(d))
      .attr('fill', (_, i) => getColor(i));

    g.selectAll('text.val')
      .data(array, (_, i) => i)
      .join('text')
      .attr('class', 'val')
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--text-secondary)')
      .attr('font-size', '11px')
      .attr('font-family', 'var(--font-mono)')
      .transition().duration(200)
      .attr('x', (_, i) => xScale(i) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d) - 4)
      .text(d => d);

    g.selectAll('text.idx')
      .data(array, (_, i) => i)
      .join('text')
      .attr('class', 'idx')
      .attr('text-anchor', 'middle')
      .attr('fill', 'var(--text-muted)')
      .attr('font-size', '10px')
      .attr('x', (_, i) => xScale(i) + xScale.bandwidth() / 2)
      .attr('y', innerH + 16)
      .text((_, i) => i);

  }, [step]);

  return <svg ref={svgRef} style={{ width: '100%', height: 280, display: 'block' }} />;
};

export default SortingRenderer;