const { addMessage } = require('./db'); 

const CHAT_ID = 4;

const mensajeTutor = `¡Hola! Soy un mensaje inyectado desde el script de pruebas. 

Vamos a verificar que el motor de visualización funcione correctamente con este ejemplo de Pila (Stack):

\`\`\`viz
{
  "algorithm": "stack_ops",
  "category": "structures",
  "title": "Prueba inyectada por Script",
  "params": {
    "operations": [
      {"op": "push", "val": 10},
      {"op": "push", "val": 20},
      {"op": "push", "val": 30},
      {"op": "pop"}
    ]
  }
}
\`\`\``;

try {
  console.log(`Intentando inyectar mensaje en el chat ID: ${CHAT_ID}...`);
  addMessage(CHAT_ID, 'assistant', mensajeTutor);
  console.log(`El mensaje se guardó correctamente en la base de datos.`);
  console.log(`Ve a tu navegador y recarga la página para ver los cambios.`);
} catch (error) {
  console.error(`Error al inyectar el mensaje:`, error.message);
}