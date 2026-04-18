import json
import os

INPUT_FILE = "ia-model/datasets/datasets-generados/dataset_450samples.jsonl"
OUTPUT_FILE = "ia-model/datasets/dataset_450samples_v1.jsonl"

MAX_CARACTERES_TOTALES = 4000

def verificar_y_limpiar_dataset():
    if not os.path.exists(INPUT_FILE):
        print(f"[ERROR] No se encontró el archivo de entrada: {INPUT_FILE}")
        return

    print(f"[INFO] Iniciando sanitización de datos desde: {INPUT_FILE}...\n")

    estadisticas = {
        "total_procesados": 0,
        "validos": 0,
        "invalidos": 0,
        "json_corrupto": 0,
        "falta_messages": 0,
        "formato_interno_roto": 0,
        "contenido_vacio": 0,
        "demasiado_largos": 0
    }

    os.makedirs(os.path.dirname(OUTPUT_FILE), exist_ok=True)

    with open(INPUT_FILE, 'r', encoding='utf-8') as f_in, \
         open(OUTPUT_FILE, 'w', encoding='utf-8') as f_out:

        for num_linea, linea in enumerate(f_in, 1):
            linea = linea.strip()
            if not linea:
                continue 

            estadisticas["total_procesados"] += 1

            try:
                data = json.loads(linea)

                if "messages" not in data or not isinstance(data["messages"], list):
                    estadisticas["invalidos"] += 1
                    estadisticas["falta_messages"] += 1
                    continue

                es_valido = True
                caracteres_del_dialogo = 0 # <-- Acumulador de longitud
                
                for msg in data["messages"]:
                    if "role" not in msg or "content" not in msg:
                        es_valido = False
                        estadisticas["formato_interno_roto"] += 1
                        break
                    
                    if msg["role"] not in ["user", "assistant", "system"]:
                        es_valido = False
                        estadisticas["formato_interno_roto"] += 1
                        break
                    
                    if not msg["content"] or not msg["content"].strip():
                        es_valido = False
                        estadisticas["contenido_vacio"] += 1
                        break
                    
                    # Sumamos la longitud de este mensaje al total de la conversación
                    caracteres_del_dialogo += len(msg["content"])

                # Validación de longitud (El nuevo filtro)
                if es_valido and caracteres_del_dialogo > MAX_CARACTERES_TOTALES:
                    es_valido = False
                    estadisticas["demasiado_largos"] += 1

                if not es_valido:
                    estadisticas["invalidos"] += 1
                    continue

                # Si pasa todas las pruebas de formato y longitud, se guarda
                f_out.write(json.dumps(data, ensure_ascii=False) + "\n")
                estadisticas["validos"] += 1

            except json.JSONDecodeError:
                estadisticas["invalidos"] += 1
                estadisticas["json_corrupto"] += 1

    print("=" * 50)
    print("REPORTE DE SANITIZACIÓN DE DATASET")
    print("=" * 50)
    print(f"Total de registros evaluados : {estadisticas['total_procesados']}")
    print(f"✓ Registros VÁLIDOS (salvados) : {estadisticas['validos']}")
    print(f"× Registros INVÁLIDOS (borrados): {estadisticas['invalidos']}")
    print("-" * 50)
    if estadisticas['invalidos'] > 0:
        print("Causas de descarte (Análisis Forense):")
        print(f"  - Exceden límite de {MAX_CARACTERES_TOTALES} chars: {estadisticas['demasiado_largos']}")
        print(f"  - Error sintáctico (JSON corrupto) : {estadisticas['json_corrupto']}")
        print(f"  - Falta el arreglo 'messages'      : {estadisticas['falta_messages']}")
        print(f"  - Roles incorrectos o faltantes    : {estadisticas['formato_interno_roto']}")
        print(f"  - Texto de respuesta vacío         : {estadisticas['contenido_vacio']}")
    
    print("-" * 50)
    print(f"[INFO] Dataset impecable y seguro para 4GB VRAM guardado en:")
    print(f"   -> {OUTPUT_FILE}")

if __name__ == "__main__":
    verificar_y_limpiar_dataset()