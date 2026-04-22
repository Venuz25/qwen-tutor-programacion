import os
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

BASE_MODEL = "Qwen/Qwen2.5-1.5B-Instruct" 

def analizar_intencion(mensaje_usuario):
    """Fase 1: Enrutador Mejorado"""
    mensaje_lower = mensaje_usuario.lower()
    
    palabras_cero = [
        "desde cero", "no sé", "no se ", "explícame", "explicame",
        "no entiendo", "qué es", "que es ", "aprender sobre", "enseñame", 
        "enseñar", "cómo funciona", "como funciona", "conceptos"
    ]
    palabras_frustracion = [
        "ya me cansé", "dame el código", "me rindo", "resuelve", "estoy harto", "dame la solución"
    ]

    if any(word in mensaje_lower for word in palabras_cero): return "NIVEL_CERO"
    if any(word in mensaje_lower for word in palabras_frustracion): return "FRUSTRACION"
    return "DEBUGGING"

def obtener_system_prompt(estado):
    """Fase 2: Inyector de Contexto para Respuestas LARGAS Y ESTRUCTURADAS"""
    
    estructura_larga = "REGLA: Tu respuesta debe ser DETALLADA Y COMPLETA. Usa formato Markdown. Divide tu explicación en: 1) Concepto teórico, 2) Analogía, 3) Múltiples ejemplos de código comentados, y 4) Una pregunta final de reflexión."
    
    prompts = {
        "NIVEL_CERO": f"Eres un tutor socrático de programación. El alumno NO SABE NADA. {estructura_larga}",
        
        "FRUSTRACION": "Eres un tutor socrático. El alumno está FRUSTRADO. 1) Sé empático. 2) Explica el problema a detalle. 3) Dale un bloque de código casi completo con un '# Tu lógica aquí' para que lo llene.",
        
        "DEBUGGING": f"Eres un tutor socrático. NO des la solución directa, pero haz un análisis PROFUNDO y DETALLADO de por qué su lógica está fallando. Da ejemplos de conceptos similares. Termina con una pregunta."
    }
    return prompts.get(estado, prompts["DEBUGGING"])

def iniciar_chat():
    print(f"[INFO] Cargando modelo {BASE_MODEL} en 4-bits...")
    
    # 1. Configuramos el "compresor" a 4-bits para que entre en tus 4GB de VRAM
    quantization_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )
    
    tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
    
    # 2. Cargamos el modelo comprimido
    model = AutoModelForCausalLM.from_pretrained(
        BASE_MODEL,
        quantization_config=quantization_config,
        device_map="auto" 
    )
    
    print("\n" + "="*50)
    print("🤖 TUTOR SOCRÁTICO (Modelo 1.5B + Shell Agéntico)")
    print("="*50 + "\n")

    historial_limpio = []

    while True:
        user_input = input("👤 Tú: ")
        if user_input.lower() in ['salir', 'exit']: break

        estado_actual = analizar_intencion(user_input)
        system_prompt = obtener_system_prompt(estado_actual)
        
        print(f"\n[🔧 Shell: {estado_actual}]")

        mensajes_para_llm = [{"role": "system", "content": system_prompt}] + historial_limpio + [{"role": "user", "content": user_input}]

        texto_formateado = tokenizer.apply_chat_template(mensajes_para_llm, tokenize=False, add_generation_prompt=True)
        inputs = tokenizer([texto_formateado], return_tensors="pt").to(model.device)

        print("🧠 Tutor:", end=" ", flush=True)
        
         # 3. Configuración para textos largos y completos sin tartamudeos
        outputs = model.generate(
            **inputs, 
            max_new_tokens=2048,
            temperature=0.4,
            do_sample=True, 
            repetition_penalty=1.15,
            pad_token_id=tokenizer.eos_token_id
        )
        
        input_length = inputs["input_ids"].shape[1]
        respuesta_generada = tokenizer.decode(outputs[0][input_length:], skip_special_tokens=True)
        print(respuesta_generada + "\n")
        
        historial_limpio.append({"role": "user", "content": user_input})
        historial_limpio.append({"role": "assistant", "content": respuesta_generada})

if __name__ == "__main__":
    iniciar_chat()