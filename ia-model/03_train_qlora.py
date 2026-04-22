import torch
import os
from dotenv import load_dotenv
from datasets import load_dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from trl import SFTTrainer, SFTConfig

load_dotenv()
NAME = os.getenv("MODEL_NAME")
VERSION = os.getenv("MODEL_VERSION")

# ==========================================
# CONFIGURACIÓN DE RUTAS Y MODELO
# ==========================================
# [IMPORTANTE] Asegúrate de apuntar a tu dataset V2 (el que tiene los 750+ ejemplos balanceados)
DATASET_FILE = "ia-model/datasets/datasets-generados/dataset_v2.jsonl" 
OUTPUT_DIR = f"ia-model/models/{NAME}{VERSION}/qwen-checkpoints"
FINAL_MODEL_DIR = f"ia-model/models/{NAME}{VERSION}/qwen-tutor"

# [NUEVO] Subimos la inteligencia al modelo "Ricitos de Oro"
MODEL_ID = "Qwen/Qwen2.5-1.5B-Instruct" 

def entrenar_modelo():
    if not os.path.exists(DATASET_FILE):
        print(f"[ERROR] No se encontró el dataset en {DATASET_FILE}")
        return

    print(f"[INFO] Iniciando pipeline de Fine-Tuning para {MODEL_ID}...")

    # 1. CUANTIZACIÓN (El Compresor)
    print("[TRACE] Configurando cuantización a 4-bits (NF4)...")
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16
    )

    # 2. CARGA DE TOKENIZER Y MODELO
    print("[TRACE] Cargando modelo base en memoria...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    tokenizer.pad_token = tokenizer.eos_token
    
    # [ANTI-OOM CRÍTICO] Reducimos la memoria de lectura a 512 tokens para proteger tus 4GB VRAM
    tokenizer.model_max_length = 512 

    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        quantization_config=bnb_config,
        device_map="auto",
        torch_dtype=torch.float16
    )
    
    # 3. PREPARACIÓN PARA ENTRENAMIENTO EFICIENTE
    model = prepare_model_for_kbit_training(model, use_gradient_checkpointing=True)

    # 4. CONFIGURACIÓN DEL ADAPTADOR LoRA (El Cerebro Socrático)
    lora_config = LoraConfig(
        r=8,              # [ANTI-OOM CRÍTICO] Bajamos el rango a 8 (antes 16) para ahorrar VRAM
        lora_alpha=16,    # Ajuste proporcional al rango
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM"
    )
    model = get_peft_model(model, lora_config)

    # ESCANEANDO EN BUSCA DE VARIABLES FANTASMA (BUG DE CUANTIZACIÓN)
    print("[TRACE] Limpiando tensores bfloat16 para evitar errores de hardware...")
    for name, param in model.named_parameters():
        if param.dtype == torch.bfloat16:
            param.data = param.data.to(torch.float16)
            
    for name, buffer in model.named_buffers():
        if buffer.dtype == torch.bfloat16:
            buffer.data = buffer.data.to(torch.float16)

    model.print_trainable_parameters()

    # 5. PREPARACIÓN DEL DATASET
    print("[TRACE] Cargando dataset en memoria...")
    dataset = load_dataset("json", data_files=DATASET_FILE, split="train")

    # 6. HIPERPARÁMETROS (Blindaje Extremo Anti-OOM)
    training_args = SFTConfig(
        output_dir=OUTPUT_DIR,
        dataset_text_field="text",
        max_seq_length=512,        # [ANTI-OOM CRÍTICO] Forzamos secuencias cortas
        per_device_train_batch_size=1,      
        gradient_accumulation_steps=4,      
        learning_rate=2e-4,
        num_train_epochs=3,                 
        logging_steps=5,
        report_to="tensorboard",
        optim="paged_adamw_8bit",           
        fp16=True,                 # Activamos FP16 puro en lugar de desactivarlo
        bf16=False,
        gradient_checkpointing=True,
        save_strategy="epoch",              
        max_grad_norm=0.3,                  
        warmup_steps=10,
    )

    # 7. MOTOR DE ENTRENAMIENTO (SFT)
    print("[INFO] Inicializando SFTTrainer...")
    trainer = SFTTrainer(
        model=model,
        train_dataset=dataset,
        processing_class=tokenizer,
        args=training_args,
    )

    # 8. EJECUCIÓN
    print("\n[START] Iniciando entrenamiento. Esto tomará tiempo, ve por un café...\n")
    trainer.train()

    # Guardado del modelo final
    print("\n[SUCCESS] Entrenamiento finalizado. Guardando adaptador...")
    os.makedirs(FINAL_MODEL_DIR, exist_ok=True)
    trainer.model.save_pretrained(FINAL_MODEL_DIR)
    tokenizer.save_pretrained(FINAL_MODEL_DIR)
    
    print(f"\n[SUCCESS] Tu tutor Socrático 1.5B está listo. Los pesos finales están en: {FINAL_MODEL_DIR}")

if __name__ == "__main__":
    entrenar_modelo()