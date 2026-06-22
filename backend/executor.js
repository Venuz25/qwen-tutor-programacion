const { spawn } = require('child_process');
const fs        = require('fs');
const path      = require('path');

const TEMP_DIR = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

const LANG_CONFIG = {
  python: {
    ext: 'py',
    timeout: 30_000,
    run: (file) => ({ cmd: 'python3', args: [file] }),
  },
  javascript: {
    ext: 'js',
    timeout: 30_000,
    run: (file) => ({ cmd: 'node', args: [file] }),
  },
  php: {
    ext: 'php',
    timeout: 30_000,
    run: (file) => ({ cmd: 'php', args: [file] }),
  },
  c: {
    ext: 'c',
    timeout: 30_000,
    compile: (src, out) => ({ cmd: 'gcc', args: [src, '-o', out, '-lm'] }),
    run: (_src, out) => ({ cmd: out, args: [] }),
  },
  cpp: {
    ext: 'cpp',
    timeout: 30_000,
    compile: (src, out) => ({ cmd: 'g++', args: [src, '-o', out, '-std=c++17'] }),
    run: (_src, out) => ({ cmd: out, args: [] }),
  },
  java: {
    ext: 'java',
    timeout: 45_000,          // Java arranca más lento
    // Java obliga a que el archivo se llame igual que la clase pública
    compile: (src) => ({ cmd: 'javac', args: [src] }),
    run: (_src, _out, dir) => ({ cmd: 'java', args: ['-cp', dir, 'Main'] }),
  },
};

// ── Limpieza de archivos temporales ──────────────────────────────
function cleanupDir(dirPath) {
  try {
    if (fs.existsSync(dirPath)) {
      fs.rmSync(dirPath, { recursive: true, force: true });
    }
  } catch (err) {
    console.error(`[Aviso] No se pudo limpiar la carpeta temporal: ${dirPath}`, err);
  }
}

// ── Compilar (solo lenguajes compilados) ─────────────────────────
function compileAsync(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd });
    let stderr = '';
    proc.stderr.on('data', d => (stderr += d.toString()));
    proc.on('close', code => {
      if (code !== 0) reject(new Error(stderr || 'Error de compilación'));
      else resolve();
    });
    proc.on('error', err => reject(new Error(`No se encontró '${cmd}'. ¿Está instalado?`)));
  });
}

// ── Registro de procesos activos ───────────
const activeProcesses = new Map();

async function startExecution(socketId, socket, code, language) {
  const config = LANG_CONFIG[language];
  if (!config) {
    socket.emit('terminal_error', `Lenguaje '${language}' no soportado.\n`);
    return;
  }

  const ts = Date.now();
  const execDir = path.join(TEMP_DIR, `exec_${ts}_${socketId}`);
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
      cleanupDir(execDir);
      return;
    }
  }

  const { cmd, args } = config.run(srcPath, outPath, execDir);

  let proc;
  try {
    proc = spawn(cmd, args, { cwd: execDir });
  } catch (err) {
    socket.emit('terminal_error', `No se pudo iniciar '${cmd}'. ¿Está instalado?\n`);
    socket.emit('execution_finished', '');
    cleanupDir(execDir);
    return;
  }

  activeProcesses.set(socketId, { proc, dir: execDir });

  const tle = setTimeout(() => {
    if (activeProcesses.has(socketId)) {
      socket.emit('terminal_error',
        `\n⏱ [TLE] El programa superó ${config.timeout / 1000}s.\nRevisa si hay un bucle infinito.\n`
      );
      proc.kill('SIGKILL');
    }
  }, config.timeout);

  proc.stdout.on('data', d => socket.emit('terminal_output', d.toString()));
  proc.stderr.on('data', d => socket.emit('terminal_error',  d.toString()));

  proc.on('close', async (code) => {
    const framesPath = path.join(execDir, 'frames');
    const pyGifPath = path.join(framesPath, 'animation.gif');
    
    if (fs.existsSync(pyGifPath)) {
        try {
            const finalGifName = `anim_${Date.now()}_${socketId}.gif`;
            const finalGifPath = path.join(TEMP_DIR, finalGifName);
            
            fs.renameSync(pyGifPath, finalGifPath);
            socket.emit('animation_ready', `/temp/${finalGifName}`);
        } catch (e) { 
            console.error("Error rescatando GIF:", e); 
        }
    }

    clearTimeout(tle);
    activeProcesses.delete(socketId);

    const msg = code === 0
      ? `\n[✓ Programa finalizado con código ${code}]\n`
      : `\n[✗ Programa finalizado con código ${code}]\n`;
    socket.emit('execution_finished', msg);

    cleanupDir(execDir);
  });

  proc.on('error', err => {
    clearTimeout(tle);
    activeProcesses.delete(socketId);
    socket.emit('terminal_error', `\n[Error al ejecutar]: ${err.message}\n`);
    socket.emit('execution_finished', '');
    cleanupDir(execDir);
  });
}

/** Mata el proceso activo del socket y limpia su carpeta */
function killProcess(socketId) {
  const session = activeProcesses.get(socketId);
  if (session) {
    session.proc.kill('SIGKILL');
    activeProcesses.delete(socketId);
    cleanupDir(session.dir);
  }
}

/** Envía input al proceso activo del socket */
function sendInput(socketId, input) {
  const proc = activeProcesses.get(socketId);
  if (proc) proc.stdin.write(input + '\n');
}

module.exports = { startExecution, sendInput, killProcess };