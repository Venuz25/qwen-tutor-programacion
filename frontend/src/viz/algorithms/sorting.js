export const SORTING_ALGORITHMS = {
  bubble_sort: {
    label: 'Bubble Sort',
    complexity: { time: 'O(n²)', space: 'O(1)' },
    description: 'Compara pares adyacentes y los intercambia si están desordenados.',
    
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
  },
  // ... (aquí arriba termina merge_sort)

  selection_sort: {
    label: 'Selection Sort',
    complexity: { time: 'O(n²)', space: 'O(1)' },
    description: 'Encuentra el mínimo repetidamente y lo coloca al inicio.',
    generateSteps({ array }) {
      const steps = [];
      const a = [...array];
      const n = a.length;
      
      steps.push({ array: [...a], comparing: [], sorted: [], pivot: null, phase: 'start' });
      
      for (let i = 0; i < n - 1; i++) {
        let minIdx = i;
        for (let j = i + 1; j < n; j++) {
          steps.push({
            array: [...a], comparing: [minIdx, j], sorted: Array.from({length: i}, (_, k) => k),
            pivot: minIdx, phase: 'compare',
            description: `Buscando mínimo: comparando a[${minIdx}]=${a[minIdx]} con a[${j}]=${a[j]}`
          });
          if (a[j] < a[minIdx]) {
            minIdx = j;
          }
        }
        if (minIdx !== i) {
          steps.push({
            array: [...a], comparing: [i, minIdx], sorted: Array.from({length: i}, (_, k) => k),
            pivot: null, phase: 'swap',
            description: `Intercambiando el mínimo ${a[minIdx]} con la posición ${i}`
          });
          [a[i], a[minIdx]] = [a[minIdx], a[i]];
        }
      }
      steps.push({ array: [...a], comparing: [], sorted: Array.from({length: n}, (_, k) => k), pivot: null, phase: 'done', description: 'Arreglo ordenado ✓' });
      return steps;
    }
  },

  insertion_sort: {
    label: 'Insertion Sort',
    complexity: { time: 'O(n²)', space: 'O(1)' },
    description: 'Construye el arreglo ordenado insertando un elemento a la vez.',
    generateSteps({ array }) {
      const steps = [];
      const a = [...array];
      const n = a.length;
      
      steps.push({ array: [...a], comparing: [], sorted: [0], pivot: null, phase: 'start' });
      
      for (let i = 1; i < n; i++) {
        let key = a[i];
        let j = i - 1;
        steps.push({ 
          array: [...a], comparing: [i], sorted: Array.from({length: i}, (_, k) => k), 
          pivot: i, phase: 'pivot', description: `Tomamos a[${i}]=${key} para insertar` 
        });
        
        while (j >= 0 && a[j] > key) {
          steps.push({ 
            array: [...a], comparing: [j, j+1], sorted: Array.from({length: i}, (_, k) => k), 
            pivot: null, phase: 'compare', description: `${a[j]} es mayor que ${key}, desplazando a la derecha` 
          });
          a[j + 1] = a[j];
          steps.push({ 
            array: [...a], comparing: [j, j+1], sorted: Array.from({length: i}, (_, k) => k), 
            pivot: null, phase: 'swap', description: `Desplazado` 
          });
          j = j - 1;
        }
        a[j + 1] = key;
        steps.push({ 
          array: [...a], comparing: [], sorted: Array.from({length: i+1}, (_, k) => k), 
          pivot: null, phase: 'place', description: `Insertado ${key} en posición ${j+1}` 
        });
      }
      steps.push({ array: [...a], comparing: [], sorted: Array.from({length: n}, (_, k) => k), pivot: null, phase: 'done', description: 'Arreglo ordenado ✓' });
      return steps;
    }
  },

  heap_sort: {
    label: 'Heap Sort',
    complexity: { time: 'O(n log n)', space: 'O(1)' },
    description: 'Convierte el arreglo en un Max-Heap y extrae el mayor repetidamente.',
    generateSteps({ array }) {
      const steps = [];
      const a = [...array];
      const n = a.length;
      const sortedArr = [];

      function heapify(nSize, i) {
        let largest = i;
        let l = 2 * i + 1;
        let r = 2 * i + 2;

        if (l < nSize) {
          steps.push({ array: [...a], comparing: [largest, l], sorted: [...sortedArr], pivot: null, phase: 'compare', description: `Comparando nodo ${largest} con hijo izq ${l}` });
          if (a[l] > a[largest]) largest = l;
        }
        if (r < nSize) {
          steps.push({ array: [...a], comparing: [largest, r], sorted: [...sortedArr], pivot: null, phase: 'compare', description: `Comparando mayor actual ${largest} con hijo der ${r}` });
          if (a[r] > a[largest]) largest = r;
        }

        if (largest !== i) {
          steps.push({ array: [...a], comparing: [i, largest], sorted: [...sortedArr], pivot: null, phase: 'swap', description: `Intercambiando nodo ${i} con hijo mayor ${largest}` });
          [a[i], a[largest]] = [a[largest], a[i]];
          heapify(nSize, largest);
        }
      }

      steps.push({ array: [...a], comparing: [], sorted: [], pivot: null, phase: 'start', description: 'Construyendo Max-Heap inicial' });
      for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
        heapify(n, i);
      }

      for (let i = n - 1; i > 0; i--) {
        steps.push({ array: [...a], comparing: [0, i], sorted: [...sortedArr], pivot: 0, phase: 'swap', description: `Moviendo raíz (mayor) ${a[0]} al final (pos ${i})` });
        [a[0], a[i]] = [a[i], a[0]];
        sortedArr.push(i);
        steps.push({ array: [...a], comparing: [], sorted: [...sortedArr], pivot: null, phase: 'place', description: `Elemento ${a[i]} en su posición final` });
        heapify(i, 0);
      }
      sortedArr.push(0);
      steps.push({ array: [...a], comparing: [], sorted: Array.from({length: n}, (_, k) => k), pivot: null, phase: 'done', description: 'Arreglo ordenado ✓' });
      return steps;
    }
  }
};


export const getAlgorithm = (name) => SORTING_ALGORITHMS[name];