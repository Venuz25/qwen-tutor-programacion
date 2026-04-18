import torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

NAME = "SHUKAKU"
VERSION = "1.0"

# Rutas
BASE_MODEL = "Qwen/Qwen2.5-0.5B-Instruct"
ADAPTER_DIR = f"ia-model/models/{NAME}{VERSION}/qwen-tutor"

def iniciar_chat():
    print("[INFO] Cargando cerebro base (Qwen 0.5B)...")
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
    print("🤖 TUTOR SOCRÁTICO EN LÍNEA")
    print("Escribe 'salir' para terminar la conversación.")
    print("="*50 + "\n")

    # Historial de conversación
    mensajes = [
        {"role": "system", "content": "Eres un tutor de programación experto especializado en el método socrático. NO des la respuesta directa, guía al alumno con preguntas y fragmentos de código."}
    ]

    while True:
        # 1. Leer input del usuario
        user_input = input("👤 Tú: ")
        if user_input.lower() in ['salir', 'exit', 'quit']:
            print("¡Hasta luego!")
            break

        mensajes.append({"role": "user", "content": user_input})

        # 2. Formatear la conversación para Qwen
        texto_formateado = tokenizer.apply_chat_template(
            mensajes, 
            tokenize=False, 
            add_generation_prompt=True
        )
        
        # 3. Convertir a tensores y mover a la tarjeta gráfica
        inputs = tokenizer([texto_formateado], return_tensors="pt").to(model.device)

        # 4. Generar respuesta (Haciendo streaming del texto)
        print("🧠 Tutor:", end=" ", flush=True)
        
        outputs = model.generate(
            **inputs, 
            max_new_tokens=512,
            temperature=0.7, # Creatividad controlada
            do_sample=True,
            pad_token_id=tokenizer.eos_token_id
        )
        
        # Extraer solo la nueva respuesta generada (ignorando el historial previo)
        input_length = inputs["input_ids"].shape[1]
        respuesta_generada = tokenizer.decode(outputs[0][input_length:], skip_special_tokens=True)
        
        print(respuesta_generada + "\n")
        
        # Guardar respuesta en el historial
        mensajes.append({"role": "assistant", "content": respuesta_generada})

if __name__ == "__main__":
    iniciar_chat()