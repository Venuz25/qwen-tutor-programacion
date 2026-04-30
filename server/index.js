const express = require('express');
const http = require('http'); // NUEVO: Importar HTTP para los Sockets
const { Server } = require('socket.io'); // NUEVO: Importar Socket.io
const axios = require('axios');
const cors = require('cors');
const { exec, spawn } = require('child_process'); // NUEVO: Añadimos 'spawn'
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Chat = require('./models/Chat');
require('dotenv').config();

const app = express();
// NUEVO: Envolvemos Express en un servidor HTTP
const server = http.createServer(app); 
// NUEVO: Iniciamos Socket.io
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

mongoose.connect('mongodb://127.0.0.1:27017/qwen-tutor')
    .then(() => console.log("🍃 MongoDB conectado"))
    .catch(err => console.error("❌ Error DB:", err));

// --- COMPILADOR --- 
const tempDir = path.join(__dirname, 'temp');
if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir);
const configs = { python: { ext: 'py', image: 'python:3.9-slim', command: (f) => `python -u /app/temp/${f}` } };

// Mantenemos tu ruta POST original por compatibilidad si tienes botones viejos usándola
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

io.on('connection', (socket) => {
    console.log('⚡ Cliente de React conectado a la terminal');
    let executionProcess = null;

    // 1. Cuando el frontend pide ejecutar código
    socket.on('start_execution', (data) => {
        const { code, language } = data; // Usamos 'code' como mandamos desde React
        const config = configs[language];

        if (!config) {
            return socket.emit('terminal_error', 'Lenguaje no soportado\n');
        }

        const fileName = language === 'java' ? `Main.java` : `script_${Date.now()}.${config.ext}`;
        const filePath = path.join(tempDir, fileName);

        fs.writeFileSync(filePath, code);

        const dockerArgs = [
            'run',
            '-i',                   // Modo interactivo
            '--rm',                 // Borrar contenedor al terminar
            '--memory=256m',        // Límite de Memoria (256 MB)
            '--cpus=0.5',           // Límite de CPU (Medio núcleo)
            '--network=none',       // Sin internet (Previene scripts maliciosos)
            '-v', `${__dirname}:/app`,
            config.image,
            ...config.command(fileName).split(' ') 
        ];

        // Iniciamos el proceso usando spawn
        executionProcess = spawn('docker', dockerArgs);

        const TLE_TIMEOUT = 30000;
        const timeoutId = setTimeout(() => {
            if (executionProcess) {
                socket.emit('terminal_error', `\n[Error: Time Limit Exceeded] El programa superó los ${TLE_TIMEOUT/1000} segundos de ejecución. Revisa si hay un bucle infinito o si tu algoritmo es muy lento (Big O).\n`);
                executionProcess.kill(); 
            }
        }, TLE_TIMEOUT);

        // Si el programa imprime algo (stdout)
        executionProcess.stdout.on('data', (output) => {
            socket.emit('terminal_output', output.toString());
        });

        // Si el programa marca error (stderr)
        executionProcess.stderr.on('data', (error) => {
            socket.emit('terminal_error', error.toString());
        });

        // Cuando el programa termina (por sí solo o porque lo matamos)
        executionProcess.on('close', (codeStatus) => {
            clearTimeout(timeoutId); // Cancelamos el cronómetro de la bomba
            
            // Si lo matamos por timeout, suele devolver código null o 137. 
            // Mostramos el mensaje normal solo si terminó bien (código 0).
            if (codeStatus === 0 || codeStatus === 1) {
                socket.emit('execution_finished', `\n[Programa finalizado con código ${codeStatus}]\n`);
            }
            
            // Limpieza
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            const binPath = path.join(tempDir, 'out');
            const classPath = path.join(tempDir, 'Main.class');
            if (fs.existsSync(binPath)) fs.unlinkSync(binPath);
            if (fs.existsSync(classPath)) fs.unlinkSync(classPath);
            
            executionProcess = null;
        });
    });

    // 2. Cuando el alumno escribe texto en React y le da Enter
    socket.on('terminal_input', (inputData) => {
        if (executionProcess) {
            // Mandamos el texto al contenedor de Docker
            executionProcess.stdin.write(inputData + '\n');
        }
    });

    // 3. Limpieza si el usuario cierra la pestaña antes de que termine
    socket.on('disconnect', () => {
        console.log('🔌 Cliente de React desconectado');
        if (executionProcess) {
            executionProcess.kill();
        }
    });
});

// --- RUTAS CHATS ---
app.get('/api/chats', async (req, res) => {
    const chats = await Chat.find().select('title createdAt').sort({ createdAt: -1 });
    res.json(chats);
});

app.get('/api/chats/:id', async (req, res) => {
    try {
        const chat = await Chat.findById(req.params.id);
        res.json(chat);
    } catch (e) { res.status(500).json({ error: "Error" }); }
});

app.post('/api/chats', async (req, res) => {
    const newChat = new Chat({ 
        title: "Nuevo Chat", 
        messages: [{ role: 'assistant', content: '¡Hola! Soy tu tutor socrático. ¿En qué código estás trabajando hoy?' }] 
    });
    await newChat.save();
    res.json(newChat);
});

app.put('/api/chats/:id', async (req, res) => {
    const chat = await Chat.findByIdAndUpdate(req.params.id, { title: req.body.title }, { returnDocument: 'after' });
    res.json(chat);
});

app.delete('/api/chats/:id', async (req, res) => {
    await Chat.findByIdAndDelete(req.params.id);
    res.json({ message: "Eliminado" });
});

app.post('/api/chats/:id/messages', async (req, res) => {
    try {
        const { role, content, isCompetitiveMode } = req.body;
        const chat = await Chat.findById(req.params.id);
        
        let titulo_actualizado = false;
        if (chat.messages.length === 1 && role === 'user') {
            const limpio = content.replace(/\n/g, ' ').trim();
            if (limpio) {
                chat.title = limpio.substring(0, 26) + "...";
                titulo_actualizado = true;
            }
        }

        chat.messages.push({ role, content });
        await chat.save();

        let messagesLLM = chat.messages.slice(-4).map(m => ({ role: m.role, content: m.content }));
        
        console.log(`\n[INFO] Procesando petición de usuario. Chat ID: ${req.params.id.slice(-4)}`);
        console.log(`[INFO] Modo Juez Competitivo: ${isCompetitiveMode ? 'Activado' : 'Desactivado'}`);
        console.log(`[INFO] Transmitiendo contexto al servidor LLM interno...`);
        const t0 = Date.now(); 

        const iaRes = await axios.post('http://127.0.0.1:8000/generate', { 
            messages: messagesLLM,
            is_competitive: isCompetitiveMode 
        }, { timeout: 0 });
        
        const botMsg = { role: 'assistant', content: iaRes.data.response };

        const t1 = Date.now();
        console.log(`[SUCCESS] Respuesta del LLM generada exitosamente. Tiempo de procesamiento: ${((t1-t0)/1000).toFixed(2)} segundos.`);

        chat.messages.push(botMsg);
        await chat.save();
        res.json({ ...botMsg, titulo_actualizado });
    } catch (e) {
        console.error(`[ERROR] Interrupción en la comunicación con el modelo de IA: ${e.message}`);
        res.status(500).json({ role: 'assistant', content: 'Problema de conexión con el modelo.' });
    }
});

// NUEVO: Ahora usamos server.listen en lugar de app.listen para encender HTTP + WebSockets
server.listen(5000, () => console.log("🚀 Servidor Node (HTTP + WebSockets) lanzado en puerto 5000"));