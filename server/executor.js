/**
 * executor.js — Ejecutor nativo de código (sin Docker)
 *
 * Usa los runtimes instalados en el sistema directamente:
 *   Python  → python3
 *   JS      → node
 *   C       → gcc  (compila + ejecuta)
 *   C++     → g++  (compila + ejecuta)
 *   Java    → javac + java
 *   PHP     → php
 *
 * Seguridad básica aplicada:
 *   - Timeout configurable por lenguaje (TLE)
 *   - El proceso se mata si supera el límite
 *   - Archivos temporales en /temp, borrados al terminar
 *   - Stdin interactivo via socket.io (igual que antes)
 */

const { spawn } = require('child_process');
const fs        = require('fs');
const path      = require('path');

const TEMP_DIR = path.join(__dirname, '..', 'temp');
if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });

// ── Configuración por lenguaje ──────────────────────────────────
//   prepare(file) → devuelve { cmd, args, cleanup }
//   cmd/args      → cómo ejecutar el binario
//   compile       → (opcional) paso previo de compilación
//   timeout       → ms antes de TLE
// ────────────────────────────────────────────────────────────────
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
function cleanup(...files) {
  for (const f of files) {
    try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch (_) {}
  }
}

// ── Compilar (solo lenguajes compilados) ─────────────────────────
function compileAsync(cmd, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args);
    let stderr = '';
    proc.stderr.on('data', d => (stderr += d.toString()));
    proc.on('close', code => {
      if (code !== 0) reject(new Error(stderr || 'Error de compilación'));
      else resolve();
    });
    proc.on('error', err => reject(new Error(`No se encontró '${cmd}'. ¿Está instalado?`)));
  });
}

// ── Registro de procesos activos (para poder matarlos) ───────────
const activeProcesses = new Map();  // socketId → childProcess

/**
 * Inicia la ejecución de código para un socket dado.
 *
 * @param {string}   socketId  - ID del socket del cliente
 * @param {object}   socket    - instancia socket.io del cliente
 * @param {string}   code      - código fuente
 * @param {string}   language  - lenguaje (python, javascript, c, cpp, java, php)
 */
async function startExecution(socketId, socket, code, language) {
  const config = LANG_CONFIG[language];
  if (!config) {
    socket.emit('terminal_error', `Lenguaje '${language}' no soportado.\n`);
    return;
  }

  // ── Nombres de archivo únicos por ejecución ──
  const ts      = Date.now();
  const srcName = language === 'java' ? 'Main.java' : `script_${ts}.${config.ext}`;
  const srcPath = path.join(TEMP_DIR, srcName);
  const outPath = path.join(TEMP_DIR, `out_${ts}`);   // binario compilado (C/C++)

  fs.writeFileSync(srcPath, code, 'utf8');

  // ── Paso 1: compilar si es necesario ──
  if (config.compile) {
    try {
      const { cmd, args } = config.compile(srcPath, outPath);
      socket.emit('terminal_output', `[Compilando ${language.toUpperCase()}...]\n`);
      await compileAsync(cmd, args);
      socket.emit('terminal_output', `[Compilación exitosa]\n\n`);
    } catch (err) {
      socket.emit('terminal_error', `\n[Error de compilación]\n${err.message}\n`);
      socket.emit('execution_finished', '');
      cleanup(srcPath, outPath);
      return;
    }
  }

  // ── Paso 2: ejecutar ──
  const { cmd, args } = config.run(srcPath, outPath, TEMP_DIR);

  let proc;
  try {
    proc = spawn(cmd, args, { cwd: TEMP_DIR });
  } catch (err) {
    socket.emit('terminal_error', `No se pudo iniciar '${cmd}'. ¿Está instalado?\n`);
    socket.emit('execution_finished', '');
    cleanup(srcPath, outPath);
    return;
  }

  activeProcesses.set(socketId, proc);

  // ── TLE watchdog ──
  const tle = setTimeout(() => {
    if (activeProcesses.has(socketId)) {
      socket.emit('terminal_error',
        `\n⏱ [TLE] El programa superó ${config.timeout / 1000}s.\n` +
        `Revisa si hay un bucle infinito o un algoritmo muy lento.\n`
      );
      proc.kill('SIGKILL');
    }
  }, config.timeout);

  proc.stdout.on('data', d => socket.emit('terminal_output', d.toString()));
  proc.stderr.on('data', d => socket.emit('terminal_error',  d.toString()));

  proc.on('close', code => {
    clearTimeout(tle);
    activeProcesses.delete(socketId);

    const msg = code === 0
      ? `\n[✓ Programa finalizado con código ${code}]\n`
      : `\n[✗ Programa finalizado con código ${code}]\n`;
    socket.emit('execution_finished', msg);

    // Limpiar archivos temporales
    cleanup(srcPath, outPath);
    // Para Java: limpiar el .class generado
    if (language === 'java') cleanup(path.join(TEMP_DIR, 'Main.class'));
  });

  proc.on('error', err => {
    clearTimeout(tle);
    activeProcesses.delete(socketId);
    socket.emit('terminal_error', `\n[Error al ejecutar]: ${err.message}\n`);
    socket.emit('execution_finished', '');
    cleanup(srcPath, outPath);
  });
}

/** Envía input al proceso activo del socket */
function sendInput(socketId, input) {
  const proc = activeProcesses.get(socketId);
  if (proc) proc.stdin.write(input + '\n');
}

/** Mata el proceso activo del socket */
function killProcess(socketId) {
  const proc = activeProcesses.get(socketId);
  if (proc) {
    proc.kill('SIGKILL');
    activeProcesses.delete(socketId);
  }
}

module.exports = { startExecution, sendInput, killProcess };