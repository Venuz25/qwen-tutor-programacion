import os
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

import re
import time
import logging
import torch
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURACIÓN INICIAL
# ─────────────────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)

app = FastAPI(title="Tutor IA - Qwen 3B (4GB VRAM)", version="2.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_MODEL = "Qwen/Qwen2.5-3B-Instruct"
MAX_CTX_TOKENS = 1200
MAX_NEW_TOKENS = 2048

# ─────────────────────────────────────────────────────────────────────────────
# CARGA DEL MODELO (Optimizado para 4 GB VRAM)
# ─────────────────────────────────────────────────────────────────────────────
logging.info(f"Cargando modelo {BASE_MODEL} (4-bit NF4, límite estricto 4GB)...")

# Limpiar VRAM residual si hubo ejecuciones anteriores
if torch.cuda.is_available():
    torch.cuda.empty_cache()

tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
tokenizer.pad_token = tokenizer.eos_token

quant_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_use_double_quant=True
)

# Asignación explícita de memoria: 3.4GB para GPU, resto a CPU si es necesario
max_memory = {0: "3.6GB", "cpu": "10GB"}

model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL,
    device_map="auto",
    quantization_config=quant_config,
    torch_dtype=torch.float16,
    max_memory=max_memory,
    offload_folder="offload" 
)

model.eval()
torch.set_grad_enabled(False)
logging.info("✅ Modelo cargado. VRAM usada: ~2.8-3.1 GB. Listo para inferencia.")

# ─────────────────────────────────────────────────────────────────────────────
# LÓGICA DE TUTORÍA
# ─────────────────────────────────────────────────────────────────────────────
def analizar_intencion(mensaje: str, estado_anterior: str = "DEBUGGING") -> str:
    """
    Mejorado para detectar lenguaje natural más variado.
    """
    msg = mensaje.lower()
    
    # Trampas: El alumno busca que le hagan el trabajo
    if re.search(r'\b(dame un programa|quiero que me des|haz el codigo|resuelveme|pasame el codigo|dame la solucion|escribe la funcion|completa el codigo|hazme la tarea|puedes hacerlo por mi)\b', msg, re.IGNORECASE):
        return "PETICION_DIRECTA"
        
    # Frustración: Emociones negativas o bloqueos
    if re.search(r'\b(ya me canse|me rindo|estoy harto|imposible|no me sale|no funciona|error molesto|llevo horas|me rindo|odio esto)\b', msg, re.IGNORECASE):
        return "FRUSTRACION"
        
    # Competitivo: Búsqueda de retos estructurados
    if re.search(r'\b(hacker ?rank|competitiva|leetcode|problema de|reto de|ejercicio de|nivel icpc|evalua mi codigo)\b', msg, re.IGNORECASE):
        return "COMPETITIVO"
        
    # Cero absoluto: Petición de fundamentos
    if re.search(r'\b(desde cero|no se|no entiendo|soy nuevo|conceptos basicos|como funciona|que es|explica con peras|no tengo idea)\b', msg, re.IGNORECASE):
        return "NIVEL_CERO"
        
    return estado_anterior

def obtener_system_prompt(estado: str) -> str:
    """
    Prompts optimizados para Qwen 2.5 3B. 
    Aprovechamos su mejor razonamiento lógico y adherencia a roles.
    """
    # Base más pedagógica para el 3B
    base = (
        "REGLAS ABSOLUTAS:\n"
        "1) Usa formato Markdown impecable.\n"
        "2) Cierra tu mensaje con UNA (1) sola pregunta socrática que lo haga pensar.\n"
        "3) NUNCA respondas tu propia pregunta.\n"
        "4) Tu tono debe ser alentador pero firme."
    )
    
    prompts = {
        "NIVEL_CERO": (
            "Eres un Tutor Socrático paciente. El alumno no sabe nada sobre el tema actual. "
            "1) Explica el concepto en un párrafo corto. "
            "2) Usa una analogía creativa de la vida real. "
            "3) Muestra un micro-ejemplo de sintaxis (máximo 3 líneas). "
            f"{base}"
        ),
        
        "FRUSTRACION": (
            "Eres un Tutor Socrático muy empático. El alumno está bloqueado y frustrado. "
            "Valida su esfuerzo brevemente ('Es normal atascarse aquí'). "
            "Dale la estructura básica del código usando comentarios como '# Tu lógica aquí' para desatascarlo, pero NO la lógica resolutiva. "
            f"{base}"
        ),
        
        "PETICION_DIRECTA": (
            "ALERTA: El alumno intenta que hagas su tarea. "
            "ESTRICTAMENTE PROHIBIDO dar código funcional, algoritmos completos o resolver el problema. "
            "Actúa como un profesor universitario estricto pero guía. "
            "Solo puedes darle un cascarón vacío: `def funcion(): pass` y preguntarle por el primer paso lógico. "
            f"{base}"
        ),
        
        "COMPETITIVO": (
            "Eres un Juez experto de Programación Competitiva (estilo Codeforces).\n"
            "REGLA 1 - SI EL USUARIO PIDE UN RETO: Genera INMEDIATAMENTE un problema creativo usando EXACTAMENTE esta estructura Markdown (sin saludos ni relleno):\n\n"
            "### 🏆 [Título Creativo]\n"
            "**Dificultad:** [Fácil / Medio / Difícil]\n\n"
            "**Descripción:**\n"
            "[Historia de 1 o 2 párrafos con un protagonista. Define el problema matemático o algorítmico claramente. Usa variables formales como n, a_i, etc.].\n\n"
            "**Entrada (Input):**\n"
            "[Define el formato estrictamente. Ej: La primera línea es t (casos). Incluye límites como 1 <= n <= 10^5].\n\n"
            "**Salida (Output):**\n"
            "[Define qué debe imprimirse].\n\n"
            "**Ejemplos:**\n"
            "> **Input:**\n"
            "> `[Ejemplos de entrada aquí]`\n"
            "> **Output:**\n"
            "> `[Respuestas esperadas aquí]`\n\n"
            "<plantilla lenguaje=\"python\">\n"
            "def solucionar():\n"
            "    # Tu lógica aquí\n"
            "    pass\n\n"
            "if __name__ == '__main__':\n"
            "    casos = int(input())\n"
            "    for _ in range(casos):\n"
            "        # Lee tu entrada aquí y llama a solucionar()\n"
            "        pass\n"
            "</plantilla>\n\n"
            "REGLA 2 - SI EL USUARIO ENVÍA UNA SOLUCIÓN O CÓDIGO: \n"
            "1) Confirma su Complejidad Big O (Tiempo y Espacio).\n"
            "2) Busca fallos críticos: Time Limit Exceeded (TLE) si es muy lento, errores de sintaxis, o casos límite.\n"
            "3) Hazle una pregunta socrática para que lo optimice. NUNCA le des el código resuelto."
        ),
        
        "DEBUGGING": (
            "Eres un experto en Debugging. Analiza el código y el error de la consola del alumno. "
            "Señala en qué línea o variable sospechas que está el fallo, explicando el *por qué* conceptual del error (ej. 'Estás intentando sumar un string con un int'). "
            f"NO le des el código arreglado. {base}"
        )
    }
    
    return prompts.get(estado, prompts["DEBUGGING"])

def es_respuesta_insegura(texto: str) -> bool:
    bloques = re.findall(r'```(?:python|js|javascript)?\s*\n(.*?)\n```', texto, re.DOTALL | re.IGNORECASE)
    for bloque in bloques:
        lineas_ejecutables = [
            l.strip() for l in bloque.split('\n')
            if l.strip() and not l.strip().startswith('#') and 'pass' not in l and '...' not in l
        ]
        if len(lineas_ejecutables) >= 3:
            return True
    return False

# ─────────────────────────────────────────────────────────────────────────────
# MODELO DE DATOS
# ─────────────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    messages: List[Dict[str, Any]] = Field(..., min_length=1, description="Historial de conversación")
    is_competitive: bool = Field(False, description="Fuerza modo Juez competitivo")
    estado_anterior: str = Field("DEBUGGING", description="Estado detectado en la iteración anterior")

# ─────────────────────────────────────────────────────────────────────────────
# ENDPOINT PRINCIPAL
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/generate")
async def generate_response(request: ChatRequest):
    start_time = time.time()
    
    try:
        ultimo_msg = request.messages[-1]["content"] if request.messages else ""

        # 1. Determinar estado pedagógico
        estado = "COMPETITIVO" if request.is_competitive else analizar_intencion(ultimo_msg, request.estado_anterior)
        sys_prompt = obtener_system_prompt(estado)
        
        # 2. Preparar prompt para Qwen2.5
        mensajes = [{"role": "system", "content": sys_prompt}] + request.messages
        text = tokenizer.apply_chat_template(mensajes, tokenize=False, add_generation_prompt=True)
        
        # 3. Validar límite de contexto (crítico para 4GB)
        ctx_tokens = tokenizer.encode(text, add_special_tokens=False)
        if len(ctx_tokens) > MAX_CTX_TOKENS:
            raise HTTPException(status_code=400, detail=f"Contexto excede {MAX_CTX_TOKENS} tokens. Reduce la conversación o inicia un nuevo hilo.")
            
        inputs = tokenizer([text], return_tensors="pt").to(model.device)
        
        # 4. Generación con parámetros estables para 3B en 4GB
        gen_ids = model.generate(
            **inputs,
            max_new_tokens=MAX_NEW_TOKENS,
            temperature=0.35,
            top_p=0.9,
            repetition_penalty=1.15,
            do_sample=True,
            use_cache=True,
            pad_token_id=tokenizer.eos_token_id,
            eos_token_id=tokenizer.eos_token_id
        )
        
        res = tokenizer.batch_decode(gen_ids[:, inputs.input_ids.shape[1]:], skip_special_tokens=True, clean_up_tokenization_spaces=True)[0]
        
        # 5. Interceptor anti-trampas
        if estado == "PETICION_DIRECTA" and es_respuesta_insegura(res):
            logging.warning("⚠️ [SEGURIDAD] Fuga de código bloqueada")
            res = (
                "🛡️ Como tu tutor, mi rol es guiarte, no resolverlo por ti.\n\n"
                "Vamos paso a paso. ¿Qué estructura básica crees que necesitarías para empezar? "
                "(Ej: `def mi_funcion(): pass`)\n\n"
                "¿Cuál es el primer dato que debes procesar?"
            )
            
        duration = round(time.time() - start_time, 2)
        logging.info(f"[RESPUESTA] Estado: {estado} | Tiempo: {duration}s | Tokens ctx: {len(ctx_tokens)}")
        
        return {
            "response": res.strip(),
            "estado_detectado": estado
        }
        
    except HTTPException as e:
        raise e
    except torch.cuda.OutOfMemoryError as e:
        logging.error("💥 OOM: VRAM insuficiente. Liberando caché...")
        torch.cuda.empty_cache()
        return {
            "response": "⚠️ Memoria de GPU insuficiente. Intenta acortar tu historial o reiniciar el chat.",
            "estado_detectado": "ERROR_VRAM"
        }
    except Exception as e:
        logging.error(f"[ERROR] Fallo en generación: {e}", exc_info=True)
        return {
            "response": "⚠️ Ocurrió un error interno. Intenta de nuevo.",
            "estado_detectado": "ERROR"
        }

# ─────────────────────────────────────────────────────────────────────────────
# EJECUCIÓN
# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    logging.info("🚀 Iniciando servidor FastAPI en http://0.0.0.0:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")