const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { exec } = require('child_process'); 
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ----- Comandos para ejecutar código -----
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir);
}

const configs = {
    python: { ext: 'py', image: 'python:3.9-slim', command: (file) => `python /app/temp/${file}` },
    javascript: { ext: 'js', image: 'node:18-slim', command: (file) => `node /app/temp/${file}` },
    cpp: { ext: 'cpp', image: 'gcc:latest', command: (file) => `sh -c "g++ /app/temp/${file} -o /app/temp/out && /app/temp/out"` },
    java: { ext: 'java', image: 'eclipse-temurin:17-jdk-jammy', command: (file) => `sh -c "javac /app/temp/${file} && java -cp /app/temp Main"` },
    php: { ext: 'php', image: 'php:8.2-cli', command: (file) => `php /app/temp/${file}` },
    c: { ext: 'c', image: 'gcc:latest', command: (file) => `sh -c "gcc /app/temp/${file} -o /app/temp/out && /app/temp/out"` }
};

// Ruta para ejecutar código
app.post('/api/execute', (req, res) => {
    const { content, language } = req.body;
    const config = configs[language];

    if (!config) return res.status(400).json({ error: "Lenguaje no soportado" });

    const fileName = language === 'java' ? `Main.java` : `script_${Date.now()}.${config.ext}`;
    const filePath = path.join(tempDir, fileName);

    fs.writeFileSync(filePath, content);

    const fullCommand = `docker run --rm -v "${__dirname}:/app" ${config.image} ${config.command(fileName)}`;

    exec(fullCommand, (error, stdout, stderr) => {
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        const binPath = path.join(tempDir, 'out');
        const classPath = path.join(tempDir, 'Main.class');
        if (fs.existsSync(binPath)) fs.unlinkSync(binPath);
        if (fs.existsSync(classPath)) fs.unlinkSync(classPath);

        res.json({ run: { output: stdout || stderr || "Ejecutado con éxito." } });
    });
});

// ----- Conexión a MongoDB -----
const mongoose = require('mongoose');
const Chat = require('./models/Chat');

mongoose.connect('mongodb://127.0.0.1:27017/qwen-tutor') 
    .then(() => console.log("🍃 Conectado a MongoDB en el puerto correcto"))
    .catch(err => console.error("❌ Error de conexión:", err.message));

// --- RUTAS PARA CHATS ---
// Obtener todos los chats
app.get('/api/chats', async (req, res) => {
    const chats = await Chat.find().select('title createdAt').sort({ createdAt: -1 });
    res.json(chats);
});

// Crear un nuevo chat
app.post('/api/chats', async (req, res) => {
    try {
        const newChat = new Chat({ 
            title: "Nuevo Chat",
            messages: [
                { 
                    role: 'assistant', 
                    content: '¡Hola! Soy tu tutor de programación. ¿En qué código estás trabajando hoy? Te ayudare para que puedas resolverlo.' 
                }
            ] 
        });
        await newChat.save();
        res.json(newChat);
    } catch (error) {
        res.status(500).json({ error: "Error al crear chat" });
    }
});

// Obtener un chat específico
app.get('/api/chats/:id', async (req, res) => {
    const chat = await Chat.findById(req.params.id);
    res.json(chat);
});

// Maneja usuario e IA
app.post('/api/chats/:id/messages', async (req, res) => {
    try {
        const { role, content } = req.body;
        const chatId = req.params.id;

        const chat = await Chat.findById(chatId);
        if (!chat) return res.status(404).json({ error: "Chat no encontrado" });

        // ==========================================
        // LÓGICA DE AUTO-NOMBRADO
        // ==========================================
        let tituloActualizado = false;
        // Si el chat solo tiene 1 mensaje (el saludo del bot) y el usuario acaba de escribir:
        if (chat.messages.length === 1 && role === 'user') {
            let nuevoTitulo = content.substring(0, 30); // Tomamos los primeros 30 caracteres
            if (content.length > 30) nuevoTitulo += "..."; // Agregamos puntos suspensivos si es más largo
            chat.title = nuevoTitulo;
            tituloActualizado = true;
        }

        // A. Guardar mensaje del usuario
        chat.messages.push({ role, content });
        await chat.save();

        console.log(`Solicitando respuesta al modelo...`);

        // B. Llamar a SHUKAKU en Python (Puerto 8000)
        const iaResponse = await axios.post('http://127.0.0.1:8000/generate', {
            messages: chat.messages.map(m => ({ role: m.role, content: m.content }))
        });

        const estadoShell = iaResponse.data.estado_detectado || "NORMAL";

        const botMessage = { 
            role: 'assistant', 
            content: iaResponse.data.response 
        };

        // C. Guardar respuesta de la IA
        chat.messages.push(botMessage);
        await chat.save();

        // D. Responder al frontend con el mensaje del Bot y la bandera del título
        res.json({
            ...botMessage,
            estado_detectado: estadoShell,
            titulo_actualizado: tituloActualizado // Le avisamos a React si el título cambió
        }); 

    } catch (error) {
        console.error("Error conectando con la IA:", error.message);
        res.status(500).json({ 
            role: 'assistant', 
            content: "Lo siento, tuve un problema de conexión. ¿Podrías repetir tu pregunta?" 
        });
    }
});

// Eliminar un chat
app.delete('/api/chats/:id', async (req, res) => {
    try {
        const { id } = req.params;
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "ID de chat no válido" });
        }
        await Chat.findByIdAndDelete(id);
        res.json({ message: "Chat eliminado con éxito" });
    } catch (error) {
        res.status(500).json({ error: "Error interno al eliminar" });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor lanzado en puerto ${PORT}`));