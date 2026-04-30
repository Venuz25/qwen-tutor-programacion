# Tutor Socrático IA - Qwen 3B

![Python](https://img.shields.io/badge/Python-3.10-blue.svg)
![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-ee4c2c.svg)
![HuggingFace](https://img.shields.io/badge/HuggingFace-Transformers-yellow.svg)
![React](https://img.shields.io/badge/React-Frontend-61DAFB.svg)

Este proyecto implementa un asistente de Inteligencia Artificial especializado en enseñar programación mediante el **Método Socrático**. En lugar de dar respuestas directas, la IA guía al usuario a través de preguntas deductivas y ejemplos analógicos. 

El modelo base es `Qwen2.5-3B-Instruct`, el cual ha sido ajustado para poder ser ejecutado localmente en hardware modesto (GPUs con 4GB de VRAM).

---

## Requisitos Previos

Para replicar este proyecto en tu entorno local, asegúrate de tener instalado:

* **Sistema Operativo:** Windows 10/11, Linux, o macOS.
* **Hardware Mínimo:** Tarjeta Gráfica (NVIDIA) con al menos **4GB de VRAM**.
* **Software Base:**
    * [Miniconda](https://docs.conda.io/en/latest/miniconda.html) o Anaconda (Para la gestión del entorno de IA).
    * [Node.js](https://nodejs.org/) (Versión 18+ para el frontend).
    * [Git](https://git-scm.com/)

---

## Instalación y Configuración

Sigue estos pasos en el orden exacto para configurar el motor de Inteligencia Artificial sin errores de compatibilidad.

1. Clonar el repositorio
```bash
git clone https://github.com/Venuz25/qwen-tutor-programacion
cd qwen-tutor-programacion
```

2. Crear el entorno virtual
Es crítico usar Python 3.10 para garantizar la estabilidad de las librerías de PyTorch y Transformers en Windows.

```bash
conda create -n qwen-tutor python=3.10 -y
conda activate qwen-tutor
```

3. Instalar Dependencias
Instala todas las librerías necesarias (Transformers, Peft, TRL, etc.) con un solo comando:

```bash
pip install -r requirements.txt
```

4. Variables de Entorno
Crea un archivo llamado .env en la raíz del proyecto basándote en el archivo de ejemplo:

```bash
cp .env.example .env
```
(Añade tus claves de API para la generación del dataset sintético si es necesario).

---

## Instalación del Web App (Node/React)  
El proyecto está dividido en un cliente (Frontend) y un servidor (Backend). Debes instalar las dependencias en ambos.

### Configurar el Backend
En una terminal desde la raiz.
```bash
cd server
npm install
```

### Configurar el Frontend  
En una terminal desde la raiz.
```bash
cd client
npm install
```

### Levantar el servicio  
En una terminal desde la raiz.
```bash
npm install
npm run dev
```
> Accede a la web desde el url que proporciona al iniciar el servicio

---

## Arquitectura del Proyecto
``` Plaintext 
/
├── .env                  # Credenciales
├── .gitignore            # Reglas de exclusión de Git
├── requirements.txt      # Dependencias exactas de Python
├── README.md             # Esta documentación
│
├── client/               # Frontend en React (Vite + Tailwind)
│   ├── package.json
│   └── src/
│
└── server/               # Backend en Node.js / Express
    ├── package.json
    └── index.js
```

---
> Desarrollado con ❤️ combinando Ingeniería de Software e Inteligencia Artificial.
---

***
