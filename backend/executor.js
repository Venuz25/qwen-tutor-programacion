const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const TEMP_DIR = path.join(__dirname, '..', 'temp');
fs.mkdirSync(TEMP_DIR, { recursive: true });

const LANG_CONFIG = {
  python: {
    ext: 'py',
    timeout: 30000,
    run: (file) => ({ cmd: 'python3', args: [file] })
  },
  javascript: {
    ext: 'js',
    timeout: 30000,
    run: (file) => ({ cmd: 'node', args: [file] })
  },
  php: {
    ext: 'php',
    timeout: 30000,
    run: (file) => ({ cmd: 'php', args: [file] })
  },
  c: {
    ext: 'c',
    timeout: 30000,
    compile: (src, out) => ({ cmd: 'gcc', args: [src, '-o', out, '-lm'] }),
    run: (_, out) => ({ cmd: out, args: [] })
  },
  cpp: {
    ext: 'cpp',
    timeout: 30000,
    compile: (src, out) => ({ cmd: 'g++', args: [src, '-o', out, '-std=c++17'] }),
    run: (_, out) => ({ cmd: out, args: [] })
  },
  java: {
    ext: 'java',
    timeout: 45000,
    compile: (src) => ({ cmd: 'javac', args: [src] }),
    run: (_, __, dir) => ({ cmd: 'java', args: ['-cp', dir, 'Main'] })
  }
};

const activeProcesses = new Map();

// Elimina de forma segura y recursiva un directorio temporal
function cleanupDir(dirPath) {
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
  } catch (err) {
    console.error(`[Aviso] No se pudo limpiar la carpeta temporal: ${dirPath}`, err);
  }
}

// Ejecuta de forma asíncrona el comando de compilación para lenguajes como C, C++ o Java
function compileAsync(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd });
    let stderr = '';
    
    proc.stderr.on('data', d => (stderr += d.toString()));
    proc.on('close', code => code !== 0 ? reject(new Error(stderr || 'Error de compilación')) : resolve());
    proc.on('error', () => reject(new Error(`No se encontró '${cmd}'. ¿Está instalado?`)));
  });
}

// Inicia el proceso de compilación y ejecución de un código, gestionando el ciclo de vida y los eventos del socket
async function startExecution(socketId, socket, code, language) {
  const config = LANG_CONFIG[language];
  if (!config) {
    return socket.emit('terminal_error', `Lenguaje '${language}' no soportado.\n`);
  }

  const execDir = path.join(TEMP_DIR, `exec_${Date.now()}_${socketId}`);
  fs.mkdirSync(execDir, { recursive: true });

  const srcName = language === 'java' ? 'Main.java' : `script.${config.ext}`;
  const srcPath = path.join(execDir, srcName);
  const outPath = path.join(execDir, 'out_bin');

  fs.writeFileSync(srcPath, code, 'utf8');

  if (language === 'python') {
    const vizSrc = path.join(__dirname, 'lib', 'visualizer.py');
    if (fs.existsSync(vizSrc)) {
      fs.copyFileSync(vizSrc, path.join(execDir, 'visualizer.py'));
    }
  }

  if (config.compile) {
    try {
      const { cmd, args } = config.compile(srcPath, outPath);
      socket.emit('terminal_output', `[Compilando ${language.toUpperCase()}...]\n`);
      await compileAsync(cmd, args, execDir);
      socket.emit('terminal_output', `[Compilación exitosa]\n\n`);
    } catch (err) {
      socket.emit('terminal_error', `\n[Error de compilación]\n${err.message}\n`);
      socket.emit('execution_finished', '');
      return cleanupDir(execDir);
    }
  }

  const { cmd, args } = config.run(srcPath, outPath, execDir);
  let proc;

  try {
    proc = spawn(cmd, args, { cwd: execDir });
  } catch (err) {
    socket.emit('terminal_error', `No se pudo iniciar '${cmd}'. ¿Está instalado?\n`);
    socket.emit('execution_finished', '');
    return cleanupDir(execDir);
  }

  activeProcesses.set(socketId, { proc, dir: execDir });

  const timeoutId = setTimeout(() => {
    if (activeProcesses.has(socketId)) {
      socket.emit('terminal_error', `\n⏱ [TLE] El programa superó ${config.timeout / 1000}s.\nRevisa si hay un bucle infinito.\n`);
      proc.kill('SIGKILL');
    }
  }, config.timeout);

  proc.stdout.on('data', d => socket.emit('terminal_output', d.toString()));
  proc.stderr.on('data', d => socket.emit('terminal_error', d.toString()));

  proc.on('close', code => {
    const pyGifPath = path.join(execDir, 'frames', 'animation.gif');
    
    if (fs.existsSync(pyGifPath)) {
      try {
        const finalGifName = `anim_${Date.now()}_${socketId}.gif`;
        fs.renameSync(pyGifPath, path.join(TEMP_DIR, finalGifName));
        socket.emit('animation_ready', `/temp/${finalGifName}`);
      } catch (e) {
        console.error("Error rescatando GIF:", e);
      }
    }

    clearTimeout(timeoutId);
    activeProcesses.delete(socketId);
    socket.emit('execution_finished', `\n[${code === 0 ? '✓' : '✗'} Programa finalizado con código ${code}]\n`);
    cleanupDir(execDir);
  });

  proc.on('error', err => {
    clearTimeout(timeoutId);
    activeProcesses.delete(socketId);
    socket.emit('terminal_error', `\n[Error al ejecutar]: ${err.message}\n`);
    socket.emit('execution_finished', '');
    cleanupDir(execDir);
  });
}

// Detiene de manera forzada el proceso activo asociado a un socket y elimina sus archivos
function killProcess(socketId) {
  const session = activeProcesses.get(socketId);
  if (session) {
    session.proc.kill('SIGKILL');
    activeProcesses.delete(socketId);
    cleanupDir(session.dir);
  }
}

// Envía una cadena de texto como entrada estándar a un proceso en ejecución
function sendInput(socketId, input) {
  const session = activeProcesses.get(socketId);
  if (session && session.proc) {
    session.proc.stdin.write(`${input}\n`);
  }
}

module.exports = { startExecution, sendInput, killProcess };