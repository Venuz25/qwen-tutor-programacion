export const SORTING_ALGORITHMS = {
  bubble_sort: {
    label: 'Bubble Sort',
    complexity: { time: 'O(n²)', space: 'O(1)' },
    description: 'Compara pares adyacentes y los intercambia si están desordenados.',
    
    // AQUÍ ESTÁ LA CORRECCIÓN: Extraemos { array } directamente
    generateSteps({ array }) {
      const steps = [];
      const a = [...array];
      const n = a.length;

      steps.push({ array: [...a], comparing: [], sorted: [], pivot: null, phase: 'start' });

      for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - i - 1; j++) {
          steps.push({
            array: [...a], comparing: [j, j + 1],
            sorted: Array.from({ length: i }, (_, k) => n - 1 - k),
            pivot: null, phase: 'compare',
            description: `Comparando a[${j}]=${a[j]} con a[${j+1}]=${a[j+1]}`
          });
          if (a[j] > a[j + 1]) {
            [a[j], a[j + 1]] = [a[j + 1], a[j]];
            steps.push({
              array: [...a], comparing: [j, j + 1],
              sorted: Array.from({ length: i }, (_, k) => n - 1 - k),
              pivot: null, phase: 'swap',
              description: `Intercambiando → posiciones ${j} y ${j+1}`
            });
          }
        }
      }
      steps.push({
        array: [...a], comparing: [], sorted: Array.from({ length: n }, (_, k) => k),
        pivot: null, phase: 'done', description: 'Arreglo ordenado ✓'
      });
      return steps;
    }
  },

  quick_sort: {
    label: 'Quick Sort',
    complexity: { time: 'O(n log n) avg', space: 'O(log n)' },
    description: 'Divide el arreglo usando un pivote y ordena recursivamente.',
    
    // AQUÍ ESTÁ LA CORRECCIÓN
    generateSteps({ array }) {
      const steps = [];
      const a = [...array];

      function partition(low, high) {
        const pivot = a[high];
        let i = low - 1;
        steps.push({
          array: [...a], comparing: [], sorted: [],
          pivot: high, phase: 'pivot',
          description: `Pivote = ${pivot} (índice ${high})`
        });
        for (let j = low; j < high; j++) {
          steps.push({
            array: [...a], comparing: [j, high],
            sorted: [], pivot: high, phase: 'compare',
            description: `Comparando a[${j}]=${a[j]} con pivote ${pivot}`
          });
          if (a[j] <= pivot) {
            i++;
            [a[i], a[j]] = [a[j], a[i]];
            if (i !== j) steps.push({
              array: [...a], comparing: [i, j],
              sorted: [], pivot: high, phase: 'swap',
              description: `Intercambiando a[${i}] y a[${j}]`
            });
          }
        }
        [a[i + 1], a[high]] = [a[high], a[i + 1]];
        steps.push({
          array: [...a], comparing: [],
          sorted: [i + 1], pivot: null, phase: 'place',
          description: `Pivote ${pivot} en posición final ${i + 1}`
        });
        return i + 1;
      }

      function quickSort(low, high) {
        if (low < high) {
          const pi = partition(low, high);
          quickSort(low, pi - 1);
          quickSort(pi + 1, high);
        }
      }

      steps.push({ array: [...a], comparing: [], sorted: [], pivot: null, phase: 'start' });
      quickSort(0, a.length - 1);
      steps.push({
        array: [...a], comparing: [], sorted: Array.from({ length: a.length }, (_, k) => k),
        pivot: null, phase: 'done', description: '¡Arreglo ordenado con Quick Sort! ✓'
      });
      return steps;
    }
  },

  merge_sort: {
    label: 'Merge Sort',
    complexity: { time: 'O(n log n)', space: 'O(n)' },
    description: 'Divide, ordena cada mitad y las fusiona.',
    
    // AQUÍ ESTÁ LA CORRECCIÓN
    generateSteps({ array }) {
      const steps = [];
      const a = [...array];

      function merge(low, mid, high) {
        const left = a.slice(low, mid + 1);
        const right = a.slice(mid + 1, high + 1);
        let i = 0, j = 0, k = low;

        while (i < left.length && j < right.length) {
          steps.push({
            array: [...a], comparing: [low + i, mid + 1 + j],
            sorted: [], pivot: null, phase: 'compare',
            description: `Comparando ${left[i]} vs ${right[j]}`
          });
          if (left[i] <= right[j]) { a[k++] = left[i++]; }
          else { a[k++] = right[j++]; }
          steps.push({
            array: [...a], comparing: [], sorted: [],
            pivot: null, phase: 'merge',
            description: `Fusionando en posición ${k-1}`
          });
        }
        while (i < left.length) { a[k++] = left[i++]; }
        while (j < right.length) { a[k++] = right[j++]; }
      }

      function mergeSort(low, high) {
        if (low < high) {
          const mid = Math.floor((low + high) / 2);
          mergeSort(low, mid);
          mergeSort(mid + 1, high);
          merge(low, mid, high);
        }
      }

      steps.push({ array: [...a], comparing: [], sorted: [], pivot: null, phase: 'start' });
      mergeSort(0, a.length - 1);
      steps.push({
        array: [...a], comparing: [], sorted: Array.from({ length: a.length }, (_, k) => k),
        pivot: null, phase: 'done', description: 'Fusión completa ✓'
      });
      return steps;
    }
  }
};

// Alias para los demás algoritmos
export const getAlgorithm = (name) => SORTING_ALGORITHMS[name];