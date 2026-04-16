const express = require('express');
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
    python: {
        ext: 'py',
        image: 'python:3.9-slim',
        command: (file) => `python /app/temp/${file}`
    },
    javascript: {
        ext: 'js',
        image: 'node:18-slim',
        command: (file) => `node /app/temp/${file}`
    },
    cpp: {
        ext: 'cpp',
        image: 'gcc:latest',
        command: (file) => `sh -c "g++ /app/temp/${file} -o /app/temp/out && /app/temp/out"`
    },
    java: {
        ext: 'java',
        image: 'eclipse-temurin:17-jdk-jammy', 
        command: (file) => `sh -c "javac /app/temp/${file} && java -cp /app/temp Main"`
    },
    php: {
        ext: 'php',
        image: 'php:8.2-cli', 
        command: (file) => `php /app/temp/${file}`
    },
    c: {
        ext: 'c',
        image: 'gcc:latest',
        command: (file) => `sh -c "gcc /app/temp/${file} -o /app/temp/out && /app/temp/out"`
    }
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
// Obtener todos los chats (para el Sidebar)
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

// Guardar un nuevo mensaje en un chat
app.post('/api/chats/:id/messages', async (req, res) => {
    const { role, content } = req.body;
    const chat = await Chat.findById(req.params.id);
    chat.messages.push({ role, content });
    await chat.save();
    res.json(chat);
});

// Eliminar un chat
app.delete('/api/chats/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ error: "ID de chat no válido" });
        }

        const deletedChat = await Chat.findByIdAndDelete(id);
        
        if (!deletedChat) {
            return res.status(404).json({ error: "Chat no encontrado" });
        }

        res.json({ message: "Chat eliminado con éxito" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Error interno al eliminar" });
    }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor lanzado en puerto ${PORT}`));