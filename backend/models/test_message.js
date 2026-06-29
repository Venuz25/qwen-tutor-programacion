const { addMessage } = require('./db'); 

const CHAT_ID = 4;

const mensajeTutor = ``;

try {
  console.log(`Intentando inyectar mensaje en el chat ID: ${CHAT_ID}...`);
  addMessage(CHAT_ID, 'assistant', mensajeTutor);
  console.log(`El mensaje se guardó correctamente en la base de datos.`);
  console.log(`Ve a tu navegador y recarga la página para ver los cambios.`);
} catch (error) {
  console.error(`Error al inyectar el mensaje:`, error.message);
}