import json
import os
import random
from datasets import load_dataset

# ---------------- CONFIGURACIÓN ----------------
CANTIDAD_EJEMPLOS = 450 # Cuántos ejemplos aleatorios quieres extraer en total
MAX_CHARS_PROMPT = 1000 # Ignorar problemas muy largos para no gastar demasiados tokens

# Ruta de salida
RAW_SAMPLES_FILE = f"ia-model/datasets/datasets-filtrados/{CANTIDAD_EJEMPLOS}_samples.jsonl"

def extraer_ejemplos():
    print("Descargando e indexando datasets desde Hugging Face...")
    ejemplos_extraidos = []

    try:
        print("Cargando CodeFeedback...")
        ds_feedback = load_dataset("m-a-p/CodeFeedback-Filtered-Instruction", split="train")
        ds_feedback = ds_feedback.shuffle(seed=42).select(range(min(5000, len(ds_feedback))))
        for item in ds_feedback:
            if len(item['query']) < MAX_CHARS_PROMPT:
                ejemplos_extraidos.append(item['query'])
    except Exception as e:
        print(f"Error cargando CodeFeedback: {e}")

    try:
        print("Cargando Alpaca 122k...")
        ds_alpaca = load_dataset("TokenBender/code_instructions_122k_alpaca_style", split="train")
        ds_alpaca = ds_alpaca.shuffle(seed=42).select(range(min(5000, len(ds_alpaca))))
        for item in ds_alpaca:
            texto = item['instruction']
            if item.get('input'):
                texto += f"\nCódigo/Contexto: {item['input']}"
            
            if len(texto) < MAX_CHARS_PROMPT:
                ejemplos_extraidos.append(texto)
    except Exception as e:
        print(f"Error cargando Alpaca: {e}")

    random.shuffle(ejemplos_extraidos)
    ejemplos_finales = ejemplos_extraidos[:CANTIDAD_EJEMPLOS]

    os.makedirs(os.path.dirname(RAW_SAMPLES_FILE), exist_ok=True)
    with open(RAW_SAMPLES_FILE, "w", encoding="utf-8") as f:
        for ej in ejemplos_finales:
            f.write(json.dumps({"prompt": ej}, ensure_ascii=False) + "\n")
            
    print(f"\n{len(ejemplos_finales)} ejemplos aleatorios guardados en {RAW_SAMPLES_FILE}")

if __name__ == "__main__":
    extraer_ejemplos()