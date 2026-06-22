# Qwen-Tutor-Programacion: Sistema de Tutoría Inteligente en Programación

Aplicación web diseñada para actuar como un tutor de programación interactivo, potenciada por el modelo de lenguaje Qwen2.5. 

---

## Acerca del Proyecto

**Qwen-Tutor-Programacion** es una plataforma web integral que proporciona asistencia interactiva para el aprendizaje de programación. El sistema integra un backend robusto desarrollado con Node.js, Express y Socket.IO, el cual se comunica con una base de datos SQLite para la gestión persistente de las sesiones de chat. 

El frontend, construido con React y Vite, ofrece una interfaz de usuario reactiva y moderna que incluye un editor de código integrado (Monaco Editor) y capacidades de compilación en tiempo real para múltiples lenguajes de programación, todo orquestado por el modelo de lenguaje Qwen2.5.

---

## Características Principales

- **Tutoría Inteligente:** Proporciona explicaciones detalladas, sugerencias de código y resolución de dudas utilizando el modelo Qwen2.5.
- **Gestión de Sesiones:** Chat interactivo con almacenamiento local del historial y capacidad para renombrar conversaciones.
- **Compilador Integrado:** Entorno para escribir, compilar y ejecutar código en múltiples lenguajes (Python, JavaScript, C++, Java, PHP, C) directamente en la interfaz.
- **Modos de Aprendizaje:** Configuraciones específicas para diferentes enfoques pedagógicos, como el modo 'Competitivo' para desafíos o el modo 'Debugging' para depuración.
- **Análisis de Archivos:** Soporte para la carga y análisis de archivos de código o texto adjuntos a las consultas.
- **Visualización de Algoritmos:** Ejecución de scripts en Python que generan representaciones gráficas animadas (GIFs) del comportamiento del algoritmo.
- **Interfaz Moderna:** Desarrollo de la interfaz de usuario con React y Tailwind CSS para garantizar una experiencia intuitiva.

---

## Tecnologías Utilizadas

| Capa | Tecnologías |
| :--- | :--- |
| **Frontend** | React, Vite, Tailwind CSS, Monaco Editor, Lucide React, React Markdown |
| **Backend** | Node.js, Express, Socket.IO, Axios, CORS, dotenv |
| **Base de Datos** | SQLite (mediante `better-sqlite3`) |
| **Inteligencia Artificial**| Qwen2.5 (integración vía API REST) |

---

## Instalación y Configuración

Para configurar el entorno de desarrollo local, siga los siguientes pasos:

1. **Clonar el Repositorio:**
   ```bash
   git clone https://github.com/Venuz25/qwen-tutor-programacion.git
   cd qwen-tutor-programacion
   ```

2. **Instalar Dependencias:**
   Ejecute el instalador de paquetes en el directorio raíz o en las carpetas `server` y `client` por separado.
   ```bash
   npm install
   ```

3. **Configurar Variables de Entorno:**
   Cree un archivo `.env` dentro del directorio `server` y configure la URL de la API del modelo de lenguaje y el puerto del servidor:
   ```env
   IA_URL=http://127.0.0.1:8000/generate 
   PORT=5000
   ```

4. **Ejecutar la Aplicación:**
   Inicie el servidor backend y el cliente frontend en paralelo utilizando el script de desarrollo:
   ```bash
   npm run dev
   ```
   El backend estará disponible en `http://localhost:5000` y el frontend en el puerto asignado por Vite (por defecto, `http://localhost:5173`).

---

## Guía de Uso

Una vez iniciados los servicios, acceda a la aplicación a través de la URL del cliente en su navegador.

- **Interacción con el Tutor:** Utilice el área de chat principal para formular preguntas o enviar fragmentos de código. El sistema procesará la consulta mediante Qwen2.5 y devolverá una respuesta contextual.
- **Ejecución de Código:** Abra el panel del compilador, seleccione el lenguaje de programación deseado, escriba el código y presione "Ejecutar" para visualizar la salida en la consola integrada.
- **Modo Competitivo y Depuración:** Active los interruptores correspondientes en la interfaz para cambiar el comportamiento del tutor hacia la resolución de desafíos o el análisis de errores.
- **Visualización de Algoritmos:** Al enviar código en Python que implemente la clase `Visualizer`, el sistema procesará el script y generará un GIF animado con el resultado de la ejecución.

---

## Estructura del Proyecto

```text
qwen-tutor-programacion/
├── frontend/                 # Frontend (React, Vite, Tailwind CSS)
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── index.html
│   └── package.json
│
├── backend/                 # Backend (Node.js, Express, SQLite)
│   ├── temp/               # Archivos temporales del compilador
│   ├── lib/
│   │   └── visualizer.py   # Script para visualización de algoritmos
│   ├── models/
│   │   └── db.js           # Lógica de conexión y consultas SQLite
│   ├── executor.js         # Lógica de ejecución de código
│   ├── index.js            # Punto de entrada del servidor Express
│   └── package.json
│
├── .gitignore
├── README.md
└── package.json            # Scripts y dependencias raíz (concurrently)
```

---
  
<div align="center">
  <strong>© 2026 | <a href="https://github.com/Venuz25">Areli Guevara</strong>
</div>
