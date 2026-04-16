const express = require('express');
const cors = require('cors');
const { exec } = require('child_process'); 
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

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

const PORT = 5000;
app.listen(PORT, () => console.log(`Servidor lanzado en puerto ${PORT}`));