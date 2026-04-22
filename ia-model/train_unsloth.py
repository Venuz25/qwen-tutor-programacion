import os
import torch
from dotenv import load_dotenv
from datasets import load_dataset
from unsloth import FastLanguageModel
from trl import SFTTrainer
from transformers import TrainingArguments

load_dotenv()
NAME = os.getenv("MODEL_NAME", "SHUKAKU")
VERSION = os.getenv("MODEL_VERSION", "2.0")

# CONFIGURACIÓN
DATASET_FILE = "ia-model/datasets/datasets-generados/dataset_v2.jsonl" 
OUTPUT_DIR = f"ia-model/models/{NAME}{VERSION}/unsloth-checkpoints"
FINAL_MODEL_DIR = f"ia-model/models/{NAME}{VERSION}/qwen-tutor-unsloth"

MODEL_ID = "Qwen/Qwen2.5-1.5B-Instruct" 

# ¡AQUÍ ESTÁ LA MAGIA! Contexto largo sin OOM
MAX_SEQ_LENGTH = 2048 

def entrenar_con_unsloth():
    if not os.path.exists(DATASET_FILE):
        print(f"[ERROR] No se encontró el dataset en {DATASET_FILE}")
        return

    print(f"[INFO] Iniciando Fine-Tuning de Alto Rendimiento con Unsloth...")

    # 1. CARGA DE MODELO Y TOKENIZER OPTIMIZADOS
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name = MODEL_ID,
        max_seq_length = MAX_SEQ_LENGTH,
        dtype = None,
        load_in_4bit = True,
    )

    # 2. CONFIGURACIÓN DEL CEREBRO (LoRA)
    model = FastLanguageModel.get_peft_model(
        model,
        r = 16,
        target_modules = ["q_proj", "k_proj", "v_proj", "o_proj",
                          "gate_proj", "up_proj", "down_proj",],
        lora_alpha = 16,
        lora_dropout = 0,
        bias = "none",
        use_gradient_checkpointing = "unsloth",
        random_state = 3407,
    )

    # 3. CARGA DE DATASET
    print("[TRACE] Cargando dataset...")
    dataset = load_dataset("json", data_files=DATASET_FILE, split="train")

    # 4. MOTOR DE ENTRENAMIENTO
    print("[INFO] Configurando SFTTrainer...")
    trainer = SFTTrainer(
        model = model,
        tokenizer = tokenizer,
        train_dataset = dataset,
        dataset_text_field = "text",
        max_seq_length = MAX_SEQ_LENGTH,
        dataset_num_proc = 2,
        packing = False,
        args = TrainingArguments(
            per_device_train_batch_size = 1,
            gradient_accumulation_steps = 8, 
            warmup_steps = 5,
            num_train_epochs = 3,
            learning_rate = 2e-4,
            fp16 = not torch.cuda.is_bf16_supported(),
            bf16 = torch.cuda.is_bf16_supported(),
            logging_steps = 5,
            optim = "adamw_8bit",
            weight_decay = 0.01,
            lr_scheduler_type = "linear",
            seed = 3407,
            output_dir = OUTPUT_DIR,
            report_to="none"
        ),
    )

    # 5. ¡A ENTRENAR!
    print("\n[START] Iniciando entrenamiento Turbo. Monitorea tu VRAM...\n")
    trainer_stats = trainer.train()

    # 6. GUARDADO EFICIENTE
    print("\n[SUCCESS] Guardando pesos adaptados (LoRA)...")
    os.makedirs(FINAL_MODEL_DIR, exist_ok=True)
    model.save_pretrained(FINAL_MODEL_DIR) # Solo guarda el adaptador, súper ligero
    tokenizer.save_pretrained(FINAL_MODEL_DIR)
    
    print(f"\n[SUCCESS] ¡Entrenamiento Unsloth completado! Pesos en: {FINAL_MODEL_DIR}")

if __name__ == "__main__":
    entrenar_con_unsloth()