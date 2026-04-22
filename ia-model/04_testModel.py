import os
import torch
import re
from dotenv import load_dotenv
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

load_dotenv()
NAME = os.getenv("MODEL_NAME")
VERSION = os.getenv("MODEL_VERSION")

# Rutas
BASE_MODEL = "Qwen/Qwen2.5-0.5B-Instruct"
ADAPTER_DIR = f"ia-model/models/{NAME}{VERSION}/qwen-tutor"

# ==========================================
# FUNCIONES DEL SHELL AGÉNTICO
# ==========================================
def analizar_intencion(mensaje_usuario):
    """Fase 1: Detecta el estado emocional/pedagógico del alumno."""
    mensaje_lower = mensaje_usuario.lower()
    
    if any(word in mensaje_lower for word in ["aprender","desde cero", "no sé", "no se", "no entiendo", "qué es", "que es", "explícame", "explicame"]):
        return "NIVEL_CERO"
        
    if any(word in mensaje_lower for word in ["ya me cansé", "dame el código", "no funciona", "me rindo", "resuelve", "ayuda por favor"]):
        return "FRUSTRACION"
        
    return "DEBUGGING"

def obtener_system_prompt(estado):
    """Fase 2: Inyecta reglas estrictas temporales basadas en el estado."""
    prompts = {
        "NIVEL_CERO": "Eres un tutor socrático. El alumno NO SABE NADA del tema. TUS REGLAS: 1) Usa una analogía obligatoria del mundo real. 2) Muestra la sintaxis hiper-básica en Markdown. 3) Haz una pregunta de deducción lógica muy fácil. NO le devuelvas la pregunta con un '¿Qué crees que es?'.",
        
        "FRUSTRACION": "Eres un tutor socrático. El alumno está FRUSTRADO. TUS REGLAS: 1) Sé empático y valida su esfuerzo. 2) Cede un poco: dale un bloque de código útil pero con un pequeño 'hueco' (ej. `# Tu lógica aquí`) para que él lo complete. 3) Anímalo a llenar ese hueco.",
        
        "DEBUGGING": "Eres un tutor socrático. El alumno está programando o resolviendo un problema. TUS REGLAS: 1) Si hay un error, no le des la línea corregida. 2) Guíalo a que revise la lógica. 3) Haz preguntas puntuales sobre el flujo de su código. 4) Da ejemplos de juguete si lo pide."
    }
    return prompts.get(estado, prompts["DEBUGGING"])

# ==========================================
# MOTOR DE CHAT
# ==========================================
def iniciar_chat():
    print(f"[INFO] Cargando cerebro base ({NAME}{VERSION})...")
    base_model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        torch_dtype=torch.float16,
        device_map="auto"
    )
    
    # Cargamos el tokenizer desde tu carpeta entrenada
    tokenizer = AutoTokenizer.from_pretrained(ADAPTER_DIR)

    print("[INFO] Inyectando personalidad Socrática (Tus pesos LoRA)...")
    model = PeftModel.from_pretrained(base_model, ADAPTER_DIR)
    
    print("\n" + "="*50)
    print("🤖 TUTOR SOCRÁTICO EN LÍNEA (Modo Agéntico)")
    print("Escribe 'salir' para terminar la conversación.")
    print("="*50 + "\n")

    # [CAMBIO CRÍTICO]: El historial ya NO lleva el 'system' prompt
    historial_limpio = []

    while True:
        # 1. Leer input del usuario
        user_input = input("👤 Tú: ")
        if user_input.lower() in ['salir', 'exit', 'quit']:
            print("¡Hasta luego!")
            break

        # 2. SHELL AGÉNTICO: Detectar estado e inyectar System Prompt
        estado_actual = analizar_intencion(user_input)
        system_prompt_temporal = obtener_system_prompt(estado_actual)
        
        # Modo Debug: Imprimir el estado para que veas cómo cambia la IA por dentro
        print(f"\n[🔧 Shell Detectó Estado: {estado_actual}]")

        # 3. Ensamblar mensajes para el modelo (System Temporal + Historial Pasado + Mensaje Actual)
        mensajes_para_llm = [{"role": "system", "content": system_prompt_temporal}] + historial_limpio + [{"role": "user", "content": user_input}]

        # 4. Formatear la conversación para Qwen
        texto_formateado = tokenizer.apply_chat_template(
            mensajes_para_llm, 
            tokenize=False, 
            add_generation_prompt=True
        )
        
        # 5. Convertir a tensores y mover a la tarjeta gráfica
        inputs = tokenizer([texto_formateado], return_tensors="pt").to(model.device)

        # 6. Generar respuesta
        print("🧠 Tutor:", end=" ", flush=True)
        
        outputs = model.generate(
            **inputs, 
            max_new_tokens=512,
            temperature=0.7, 
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id
        )
        
        # Extraer solo la nueva respuesta generada
        input_length = inputs["input_ids"].shape[1]
        respuesta_generada = tokenizer.decode(outputs[0][input_length:], skip_special_tokens=True)
        
        print(respuesta_generada + "\n")
        
        # 7. GUARDAR HISTORIAL (¡Solo el usuario y el tutor, olvidamos el system prompt!)
        historial_limpio.append({"role": "user", "content": user_input})
        historial_limpio.append({"role": "assistant", "content": respuesta_generada})

if __name__ == "__main__":
    iniciar_chat()