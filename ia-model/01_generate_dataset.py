import json
import time
import os
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
    print("[ERROR] No se han encontrado claves de API en las variables de entorno. Asegúrate de configurar GEMINI_KEYS.")
    exit(1)
KEYS = claves.split(",")

PETICIONES_POR_LLAVER = 10
MODEL_ID = 'gemini-2.5-flash'
NO_SAMPLES = 450

INPUT_FILE = f"ia-model/datasets/datasets-filtrados/{NO_SAMPLES}_samples.jsonl"
OUTPUT_FILE = f"ia-model/datasets/datasets-generados/dataset_{NO_SAMPLES}samples.jsonl"

def generar_dataset():
    if not os.path.exists(INPUT_FILE):
        print(f"[ERROR] Dependencia no resuelta: Archivo de entrada {INPUT_FILE} inexistente.")
        return

    prompt_base = """
        Eres un tutor de programación experto especializado en el método socrático y el aprendizaje por andamiaje. 
        Genera una conversación simulada entre un 'user' (alumno) y un 'assistant' (tutor).
        El alumno plantea el siguiente problema o duda: "{tema}"

        REGLAS ESENCIALES:
        1. IDIOMA ESTRICTO: TODA la conversación DEBE estar en ESPAÑOL. Si el problema planteado original está en inglés, el 'user' debe traducirlo e interpretarlo al español de forma natural en su primer mensaje. NUNCA uses inglés para conversar.
        2. NUNCA des la solución completa ni un código listo para copiar y pegar.
        3. SÍ debes proporcionar fragmentos de código cortos, esqueletos, ejemplos parciales o pseudocódigo que sirvan como punto de partida o referencia.
        4. Explica conceptos clave, analiza fragmentos de código cuando sea necesario y enseña fundamentos de programación (lógica, sintaxis, estructuras, patrones) si detectas que el alumno carece de esa base.
        5. Desglosa el problema en pasos lógicos, usa analogías claras y fomenta la reflexión crítica sobre el "porqué" y el "cómo".
        6. Cada intervención del tutor debe terminar con una pregunta guía, un mini-reto o una indicación concreta que obligue al alumno a intentar, corregir o justificar su siguiente paso.

        Usa formato Markdown para el código dentro de las respuestas.
        No exedas los 750 tokens en total para toda la conversación. Si el problema es muy complejo, enfócate en la primera parte o en un aspecto específico para mantener la brevedad y claridad.
    """

    prompts_totales = []
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        for line in f:
            prompts_totales.append(json.loads(line)["prompt"])

    total_a_procesar = len(prompts_totales)

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)
    ejemplos_generados = 0
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            ejemplos_generados = sum(1 for line in f)

    print(f"\n[INFO] Estado de la canalización: {ejemplos_generados} / {total_a_procesar} registros procesados.")

    if ejemplos_generados >= total_a_procesar:
        print("[INFO] El corpus ha sido procesado en su totalidad. Finalizando ejecución.")
        return

    prompts_faltantes = prompts_totales[ejemplos_generados:]
    
    indice_llave_actual = 0
    client = genai.Client(api_key=KEYS[indice_llave_actual])
    ejemplos_en_esta_sesion = 0
    
    print(f"[INFO] Inicializando motor con llave #{indice_llave_actual + 1} para {len(prompts_faltantes)} registros pendientes...")

    with open(OUTPUT_FILE, "a", encoding="utf-8") as f:
        for i, tema in enumerate(prompts_faltantes):
            indice_real = ejemplos_generados + i + 1
            
            exito = False
            reintentos_parseo = 0

            while not exito:
                try:
                    print(f"[TRACE] Ejecutando petición [{indice_real}/{total_a_procesar}] (Intento {reintentos_parseo + 1})...")
                    
                    response = client.models.generate_content(
                        model=MODEL_ID,
                        contents=prompt_base.format(tema=tema),
                        config=types.GenerateContentConfig(
                            response_mime_type="application/json",
                            response_schema=SocraticDialogue,
                            temperature=0.7
                        )
                    )
                    
                    data = json.loads(response.text)
                    
                    f.write(json.dumps(data, ensure_ascii=False) + "\n")
                    f.flush()
                    os.fsync(f.fileno())
                    
                    exito = True 
                    ejemplos_en_esta_sesion += 1
                    
                    if ejemplos_en_esta_sesion % PETICIONES_POR_LLAVER == 0:
                        indice_llave_actual = (indice_llave_actual + 1) % len(KEYS)
                        print(f"\n[SISTEMA] Límite de {PETICIONES_POR_LLAVER} peticiones alcanzado. Rotando a la llave #{indice_llave_actual + 1}...")
                        
                        client = genai.Client(api_key=KEYS[indice_llave_actual])
                    
                    time.sleep(4)
                    
                except json.JSONDecodeError as e:
                    reintentos_parseo += 1
                    print(f"[WARNING] JSON corrupto devuelto por la API. Error: {e}")
                    print(f"[SISTEMA] Reintentando forzosamente el registro {indice_real}...")
                    time.sleep(2)
                        
                except errors.APIError as e:
                    if e.code == 429:
                        print(f"[WARNING] Cuota excedida (Error 429). Esperando 5 minutos...")
                        time.sleep(300) 
                    else:
                        print(f"[EXCEPTION] Falla de API en el registro {indice_real}: {e.message}")
                        print(f"[SISTEMA] Reintentando forzosamente en 20 segundos...")
                        time.sleep(20)
                        
                except KeyboardInterrupt:
                    print("\n[INFO] Detención manual solicitada por el usuario (Ctrl+C).")
                    print(f"[INFO] Progreso guardado de manera segura en el registro {indice_real - 1}.")
                    return
                    
                except Exception as e:
                    print(f"[EXCEPTION] Error general de red o sistema: {e}")
                    print(f"[SISTEMA] Reintentando forzosamente en 5 segundos...")
                    time.sleep(5)

    print("\n[SUCCESS] Pipeline de generación de dataset concluido exitosamente.")

if __name__ == "__main__":
    generar_dataset()