import json
import time
import os
import random
from google import genai
from google.genai import types
from google.genai import errors
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Message(BaseModel):
    role: str
    content: str

class SocraticDialogue(BaseModel):
    messages: list[Message]

claves = os.getenv("GEMINI_KEYS", "")
if not claves:
    print("[ERROR] No se han encontrado claves de API en las variables de entorno.")
    exit(1)
KEYS = claves.split(",")

MODEL_ID = 'gemini-2.5-flash'
NO_SAMPLES = 750

INPUT_FILE = f"ia-model/datasets/datasets-filtrados/{NO_SAMPLES}_samples.jsonl"
OUTPUT_FILE = f"ia-model/datasets/datasets-generados/dataset_{NO_SAMPLES}samples.jsonl"

# 1. DEFINICIÓN DE ESCENARIOS (5 Estados)
ESCENARIOS = [
    "NIVEL CERO: El alumno dice que tiene esta tarea pero no sabe absolutamente nada del tema. Pide una explicación con analogías antes de ver cualquier código.",
    "FRUSTRACIÓN: El alumno empieza bien, pero en el turno 3 o 4 se desespera y exige que le des el código final resuelto porque 'ya se cansó de intentar'. El tutor cederá un poco dando un bloque grande pero dejará un hueco (# Tu lógica aquí).",
    "INTENTO CON ERRORES: El alumno saluda compartiendo un código que él mismo hizo intentando resolver la tarea, pero tiene errores de lógica o sintaxis. Pide ayuda para entender por qué no funciona.",
    "DIVISIÓN DE CONCEPTOS: El alumno hace la pregunta, pero está muy confundido y mezcla conceptos (ej. menciona etiquetas HTML cuando la tarea es de Java o C++). El tutor debe corregir la confusión primero.",
    "PETICIÓN DIRECTA (TRAMPA): El alumno ignora el aprendizaje y desde el primer mensaje exige que se le haga la tarea o se le dé el código final. El tutor se niega educadamente, explica los pasos lógicos en viñetas y le da SOLO la estructura vacía de la función (con 'pass')."
]

# Pesos balanceados para los 5 escenarios
PESOS = [0.30, 0.20, 0.20, 0.10, 0.20] 

def generar_dataset():
    if not os.path.exists(INPUT_FILE):
        print(f"[ERROR] Archivo de entrada {INPUT_FILE} inexistente.")
        return

    # 2. PROMPT BASE PARA CONTEXTOS LARGOS (2048 Tokens)
    prompt_base = """
        Eres un tutor de programación experto especializado en el método socrático. 
        Genera una conversación simulada LARGA Y PROFUNDA (de 6 a 8 turnos) entre un 'user' (alumno) y un 'assistant' (tutor).
        
        TAREA DEL ALUMNO (Instrucción original): "{tema}"
        ACTITUD Y ESCENARIO DEL ALUMNO: "{escenario}"

        INSTRUCCIONES DE ACTUACIÓN PARA EL ALUMNO ('user'):
        1. Lee la "Tarea del alumno". TRADÚCELA mentalmente y haz que el alumno inicie la conversación en ESPAÑOL NATURAL.
        2. El comportamiento del alumno DEBE apegarse estrictamente a su "Actitud y Escenario".
        3. El alumno debe hacer preguntas de seguimiento, cometer errores lógicos normales o pedir que le expliquen más a fondo.

        REGLAS DE FORMATO Y DISEÑO VISUAL PARA EL TUTOR (¡MUY IMPORTANTES!):
        1. NO escribas muros de texto. Obligatorio usar saltos de línea (\\n) entre ideas y párrafos.
        2. Usa **negritas** para resaltar conceptos clave.
        3. Usa listas (viñetas o numeradas) cuando expliques pasos o características.
        4. CUANDO DES EJEMPLOS, usa bloques de código Markdown con la etiqueta del lenguaje correspondiente.

        REGLAS PEDAGÓGICAS SOCRÁTICAS PARA EL TUTOR (¡ESTRICTAS!):
        1. NUNCA des la solución completa a la tarea original.
        2. ¡PROHIBIDO RESPONDER TU PROPIA PREGUNTA! El tutor hace una pregunta y DEBE detenerse para que el alumno ('user') responda en el siguiente turno.
        3. EL PROTOCOLO "NIVEL CERO": Usa una analogía sencilla de la vida real, muestra sintaxis básica, y haz una pregunta fácil de deducción.
        4. EL PROTOCOLO "TRAMPA": Si el escenario indica que el alumno pide el código directamente, el tutor debe negarse, dar pasos lógicos y entregar una función vacía.
        5. Cada intervención del tutor DEBE terminar con una sola pregunta guía o un mini-reto lógico.
        
        LÍMITES:
        - Aprovecha el espacio. Puedes generar hasta 1800 tokens de conversación detallada.
    """

    prompts_totales = []
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        for line in f:
            prompts_totales.append(json.loads(line)["prompt"])

    prompts_totales = prompts_totales[:NO_SAMPLES]
    total_a_procesar = len(prompts_totales)

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    ejemplos_generados = 0
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            ejemplos_generados = sum(1 for line in f)

    print(f"\n[INFO] Estado: {ejemplos_generados} / {total_a_procesar} registros procesados.")

    if ejemplos_generados >= total_a_procesar:
        print("[INFO] El corpus ha sido procesado. Finalizando ejecución.")
        return

    prompts_faltantes = prompts_totales[ejemplos_generados:]
    
    indice_llave_actual = 0
    errores_429_consecutivos = 0
    client = genai.Client(api_key=KEYS[indice_llave_actual])
    
    print(f"[INFO] Inicializando motor con llave #{indice_llave_actual + 1}...")

    with open(OUTPUT_FILE, "a", encoding="utf-8") as f:
        for i, tema in enumerate(prompts_faltantes):
            indice_real = ejemplos_generados + i + 1
            
            escenario_elegido = random.choices(ESCENARIOS, weights=PESOS, k=1)[0]
            
            exito = False
            reintentos_parseo = 0

            while not exito:
                try:
                    prompt_final = prompt_base.format(tema=tema, escenario=escenario_elegido)
                    
                    print(f"[TRACE] Petición [{indice_real}/{total_a_procesar}] - Escenario: {escenario_elegido[:15]}... (Llave #{indice_llave_actual + 1})")
                    
                    response = client.models.generate_content(
                        model=MODEL_ID,
                        contents=prompt_final,
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=SocraticDialogue,
                            temperature=0.85,
                            max_output_tokens=2500
                        )
                    )
                    
                    data = json.loads(response.text)
                    
                    f.write(json.dumps(data, ensure_ascii=False) + "\n")
                    f.flush()
                    os.fsync(f.fileno())
                    
                    exito = True 
                    errores_429_consecutivos = 0
                    time.sleep(4)
                    
                except json.JSONDecodeError as e:
                    reintentos_parseo += 1
                    print(f"[WARNING] JSON corrupto devuelto por la API. Reintentando...")
                    time.sleep(2)
                        
                except errors.APIError as e:
                    if e.code == 429:
                        errores_429_consecutivos += 1
                        if errores_429_consecutivos >= 5:
                            indice_llave_actual = (indice_llave_actual + 1) % len(KEYS)
                            print(f"\n[SISTEMA] Llave agotada. Rotando a la llave #{indice_llave_actual + 1}...")
                            client = genai.Client(api_key=KEYS[indice_llave_actual])
                            errores_429_consecutivos = 0 
                            time.sleep(2) 
                        else:
                            print(f"[WARNING] Cuota excedida (Intento {errores_429_consecutivos}/5). Esperando 15s...")
                            time.sleep(15) 
                    else:
                        print(f"[EXCEPTION] Falla de API: {e.message}. Reintentando en 20s...")
                        time.sleep(20)
                        
                except KeyboardInterrupt:
                    print("\n[INFO] Detención manual (Ctrl+C). Guardado seguro completado.")
                    return
                except Exception as e:
                    print(f"[EXCEPTION] Error general: {e}. Reintentando en 5s...")
                    time.sleep(5)

    print("\n[SUCCESS] Pipeline de dataset concluido exitosamente.")

if __name__ == "__main__":
    generar_dataset()