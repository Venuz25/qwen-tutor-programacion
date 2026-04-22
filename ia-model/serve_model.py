import os
import torch
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 1. CONFIGURACIÓN DEL MODELO Y SHELL (1.5B Ricitos de Oro)
# ==========================================
BASE_MODEL = "Qwen/Qwen2.5-1.5B-Instruct"

print(f"[INFO] Cargando API con {BASE_MODEL} en 4-bits...")

quantization_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_compute_dtype=torch.float16,
    bnb_4bit_use_double_quant=True,
)

tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
model = AutoModelForCausalLM.from_pretrained(
    BASE_MODEL, 
    quantization_config=quantization_config, 
    device_map="auto"
)

def analizar_intencion(mensaje_usuario):
    """Enrutador de Estados"""
    mensaje_lower = mensaje_usuario.lower()
    
    palabras_cero = ["desde cero", "no sé", "no se ", "explícame", "explicame", "no entiendo", "qué es", "que es ", "aprender sobre", "enseñame", "cómo funciona"]
    # Quitamos las palabras de "dame código" de la frustración para no confundir con las trampas
    palabras_frustracion = ["ya me cansé", "me rindo", "estoy harto", "imposible", "no me sale", "estoy bloqueado"]
    palabras_trampa = ["dame un programa", "quiero que me des", "haz el código", "haz un programa", "escribe el código", "resuelve", "dame el código", "dame la solución", "pasame el codigo", "como se hace el programa"]

    if any(word in mensaje_lower for word in palabras_cero): return "NIVEL_CERO"
    if any(word in mensaje_lower for word in palabras_trampa): return "PETICION_DIRECTA" # Evaluamos trampa antes que frustración
    if any(word in mensaje_lower for word in palabras_frustracion): return "FRUSTRACION"
    
    return "DEBUGGING"

def obtener_system_prompt(estado):
    """Inyector de Contexto - FRENTE 1 (Plantillas y Reglas Estrictas)"""
    estructura_base = (
        "REGLAS OBLIGATORIAS: "
        "1) Usa formato Markdown con SALTOS DE LÍNEA (\\n) correctos. "
        "2) Si usas una analogía, DEBE ser de la VIDA REAL (ej. cajas, menús, trenes), NO uses otros lenguajes de programación. "
        "3) TERMINA SIEMPRE tu mensaje con UNA SOLA pregunta de reflexión para el alumno. "
        "4) ¡PROHIBIDO RESPONDER TU PROPIA PREGUNTA! Una vez que escribas el signo de interrogación final (?), DETENTE COMPLETAMENTE."
    )
    
    prompts = {
        "NIVEL_CERO": f"Eres un tutor socrático. El alumno NO SABE NADA. Divide tu respuesta en: 1) Concepto claro, 2) Analogía de la vida real, 3) 1 ejemplo mínimo de código. {estructura_base}",
        
        "FRUSTRACION": f"Eres un tutor socrático. El alumno está FRUSTRADO. Sé empático. Dale un bloque de código casi completo con un '# Tu lógica aquí' para que lo llene. {estructura_base}",
        
        # EL BLINDAJE ANTI-TRAMPAS CON PLANTILLA
        "PETICION_DIRECTA": (
            "Eres un tutor socrático. El alumno te está pidiendo que resuelvas su tarea. "
            "ESTÁ PROHIBIDO EXPLICAR ALGORITMOS O ESCRIBIR LÓGICA. "
            "DEBES responder EXACTAMENTE con esta estructura y NADA MÁS:\n\n"
            "¡Hola! Como tu tutor, estoy aquí para guiarte, no para hacerte la tarea.\n\n"
            "Usa esta estructura base para empezar:\n"
            "```python\n"
            "def nombre_de_la_funcion(parametros):\n"
            "    # Tu código aquí\n"
            "    pass\n"
            "```\n\n"
            "¿Cuál crees que debería ser el primer paso lógico dentro de esa función?"
        ),
        
        "DEBUGGING": f"Eres un tutor socrático. NO des la solución directa. Analiza la lógica del alumno detalladamente y guíalo a encontrar su error. {estructura_base}"
    }
    return prompts.get(estado, prompts["DEBUGGING"])

# ==========================================
# 2. ENDPOINT DE LA API
# ==========================================
class ChatRequest(BaseModel):
    messages: list

@app.post("/generate")
async def generate_response(request: ChatRequest):
    ultimo_mensaje = request.messages[-1]["content"] if request.messages else ""
    
    estado_actual = analizar_intencion(ultimo_mensaje)
    system_prompt = obtener_system_prompt(estado_actual)
    
    print(f"[API] Petición recibida. Estado detectado: {estado_actual}")

    mensajes_para_llm = [{"role": "system", "content": system_prompt}] + request.messages

    text = tokenizer.apply_chat_template(mensajes_para_llm, tokenize=False, add_generation_prompt=True)
    model_inputs = tokenizer([text], return_tensors="pt").to(model.device)

    generated_ids = model.generate(
        **model_inputs, 
        max_new_tokens=2048, 
        temperature=0.4,
        do_sample=True,
        repetition_penalty=1.15,
        pad_token_id=tokenizer.eos_token_id
    )
    
    response = tokenizer.batch_decode(generated_ids[:, model_inputs.input_ids.shape[1]:], skip_special_tokens=True)[0]
    
    # ==========================================
    # FRENTE 2: LA OPCIÓN NUCLEAR (Interceptor Anti-Trampas)
    # ==========================================
    if estado_actual == "PETICION_DIRECTA":
        # Si la IA desobedece e intenta dar bucles, condicionales o funciones completas...
        palabras_prohibidas = ["for ", "while ", "import ", "sort(", "sorted(", "if ", "else:"]
        
        if any(palabra in response for palabra in palabras_prohibidas):
            print("[SECURITY] Fuga de tarea detectada. El modelo intentó dar código. Interceptando...")
            # Reemplazamos la respuesta de la IA por este mensaje seguro y universal
            response = (
                "¡Buen intento! 😉 Pero como tu tutor socrático, mi objetivo es que tú mismo construyas la lógica.\n\n"
                "Para resolver este problema, vamos a ir paso a paso. ¿Cuál crees que debería ser el **primer paso lógico** que debemos darle a la computadora?"
            )

    return {"response": response, "estado_detectado": estado_actual}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)