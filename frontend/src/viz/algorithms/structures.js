export const STRUCTURE_ALGORITHMS = {
  stack_ops: {
    label: 'Pila (Stack)',
    complexity: { time: 'O(1) inserción/eliminación', space: 'O(n)' },
    description: 'LIFO (Last-In, First-Out). El último en entrar es el primero en salir.',
    
    // Genera los fotogramas visuales de las operaciones LIFO (Push/Pop) en una pila
    generateSteps({ operations }) {
      const steps = [];
      const stack = [];
      
      steps.push({ type: 'stack', data: [], description: 'Pila inicial vacía', highlight: null });

      for (const op of operations) {
        if (op.op === 'push') {
          steps.push({ type: 'stack', data: [...stack], description: `Preparando push(${op.val})`, highlight: 'new' });
          stack.push(op.val);
          steps.push({ type: 'stack', data: [...stack], description: `Apilado: ${op.val} en el tope`, highlight: stack.length - 1 });
        } else if (op.op === 'pop') {
          if (stack.length > 0) {
            steps.push({ type: 'stack', data: [...stack], description: `Preparando pop(): el tope es ${stack[stack.length - 1]}`, highlight: stack.length - 1 });
            const popped = stack.pop();
            steps.push({ type: 'stack', data: [...stack], description: `Desapilado: ${popped}`, highlight: 'popped' });
          } else {
            steps.push({ type: 'stack', data: [...stack], description: 'Error: Intento de pop() en pila vacía', highlight: 'error' });
          }
        }
      }
      
      steps.push({ type: 'stack', data: [...stack], description: 'Operaciones finalizadas ✓', highlight: null });
      return steps;
    }
  },

  queue_ops: {
    label: 'Cola (Queue)',
    complexity: { time: 'O(1) inserción/eliminación', space: 'O(n)' },
    description: 'FIFO (First-In, First-Out). El primero en entrar es el primero en salir.',
    
    // Genera los fotogramas visuales de las operaciones FIFO (Enqueue/Dequeue) en una cola
    generateSteps({ operations }) {
      const steps = [];
      const queue = [];
      
      steps.push({ type: 'queue', data: [], description: 'Cola inicial vacía', highlight: null });

      for (const op of operations) {
        if (op.op === 'enqueue') {
          steps.push({ type: 'queue', data: [...queue], description: `Preparando enqueue(${op.val})`, highlight: 'new' });
          queue.push(op.val);
          steps.push({ type: 'queue', data: [...queue], description: `Encolado al final: ${op.val}`, highlight: queue.length - 1 });
        } else if (op.op === 'dequeue') {
          if (queue.length > 0) {
            steps.push({ type: 'queue', data: [...queue], description: `Preparando dequeue(): el frente es ${queue[0]}`, highlight: 0 });
            const deq = queue.shift();
            steps.push({ type: 'queue', data: [...queue], description: `Desencolado: ${deq}`, highlight: 'dequeued' });
          } else {
            steps.push({ type: 'queue', data: [...queue], description: 'Error: Intento de dequeue() en cola vacía', highlight: 'error' });
          }
        }
      }
      
      steps.push({ type: 'queue', data: [...queue], description: 'Operaciones finalizadas ✓', highlight: null });
      return steps;
    }
  },

  linked_list_ops: {
    label: 'Lista Enlazada (Singly Linked List)',
    complexity: { time: 'O(n) búsqueda, O(1) inserción/frente', space: 'O(n)' },
    description: 'Colección de nodos conectados. Cada nodo almacena un valor y un puntero (next) al siguiente.',
    
    // Genera los fotogramas visuales de operaciones de inserción y búsqueda en una lista enlazada
    generateSteps({ operations }) {
      const steps = [];
      const list = [];
      
      steps.push({ type: 'll', data: [], description: 'Lista inicial vacía (Head -> null)', highlight: null, ptr: null });

      for (const op of operations) {
        if (op.op === 'insert') {
          steps.push({ type: 'll', data: [...list], description: `Creando nuevo nodo con valor [${op.val}]`, highlight: 'new', ptr: null });
          list.push(op.val);
          steps.push({ type: 'll', data: [...list], description: `Nodo [${op.val}] insertado y enlazado al final`, highlight: list.length - 1, ptr: null });
        } else if (op.op === 'search') {
          let found = false;
          
          for (let i = 0; i < list.length; i++) {
            steps.push({ type: 'll', data: [...list], description: `Buscando ${op.val}: revisando nodo actual (valor ${list[i]})`, highlight: null, ptr: i });
            
            if (list[i] === op.val) {
              steps.push({ type: 'll', data: [...list], description: `¡Encontrado! El valor ${op.val} existe en la lista.`, highlight: i, ptr: 'found' });
              found = true;
              break;
            }
          }
          
          if (!found) {
            steps.push({ type: 'll', data: [...list], description: `Fin de la lista alcanzado (null). El valor ${op.val} no existe.`, highlight: null, ptr: null });
          }
        }
      }
      
      steps.push({ type: 'll', data: [...list], description: 'Operaciones finalizadas ✓', highlight: null, ptr: null });
      return steps;
    }
  }
};