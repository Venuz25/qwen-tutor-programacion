import torch
import os
from datasets import load_dataset
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from trl import SFTTrainer, SFTConfig

NAME = "SHUKAKU" 
VERSION = "1.0"

# CONFIGURACIÓN DE RUTAS Y MODELO
DATASET_FILE = "ia-model/datasets/dataset_450samples_v1.jsonl"
OUTPUT_DIR = f"ia-model/models/{NAME}{VERSION}/qwen-checkpoints"
FINAL_MODEL_DIR = f"ia-model/models/{NAME}{VERSION}/qwen-tutor"

# Qwen2.5-0.5B-Instruct para 4GB VRAM
MODEL_ID = "Qwen/Qwen2.5-0.5B-Instruct" 

def entrenar_modelo():
    if not os.path.exists(DATASET_FILE):
        print(f"[ERROR] No se encontró el dataset limpio en {DATASET_FILE}")
        return

    print("[INFO] Iniciando pipeline de Fine-Tuning (QLoRA)...")

    # 1. CUANTIZACIÓN
    print("[TRACE] Configurando cuantización a 4-bits (NF4)...")
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_use_double_quant=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16
    )

    # 2. CARGA DE TOKENIZER Y MODELO
    print(f"[TRACE] Descargando/Cargando modelo base {MODEL_ID} en memoria...")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_ID)
    tokenizer.pad_token = tokenizer.eos_token
    tokenizer.model_max_length = 1024

    model = AutoModelForCausalLM.from_pretrained(
        MODEL_ID,
        quantization_config=bnb_config,
        device_map="auto",
        torch_dtype=torch.float16
    )
    
    # 3. PREPARACIÓN PARA ENTRENAMIENTO EFICIENTE
    model = prepare_model_for_kbit_training(model, use_gradient_checkpointing=True)

    # 4. CONFIGURACIÓN DEL ADAPTADOR LoRA
    lora_config = LoraConfig(
        r=16,
        lora_alpha=32,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM"
    )
    model = get_peft_model(model, lora_config)

    # ESCANEANDOLA EN BUSCA DE VARIABLES FANTASMA (BUG DE CUANTIZACIÓN)
    print("[TRACE] Escaneando el modelo en busca de variables fantasma...")
    
    # 1. Limpiar parámetros (Pesos neuronales)
    for name, param in model.named_parameters():
        if param.dtype == torch.bfloat16:
            param.data = param.data.to(torch.float16)
            
    # 2. Limpiar Buffers (Variables ocultas como los embeddings rotatorios)
    for name, buffer in model.named_buffers():
        if buffer.dtype == torch.bfloat16:
            buffer.data = buffer.data.to(torch.float16)

    model.print_trainable_parameters()

    # 5. PREPARACIÓN DEL DATASET
    print("[TRACE] Cargando dataset en memoria...")
    dataset = load_dataset("json", data_files=DATASET_FILE, split="train")

    # 6. HIPERPARÁMETROS ANTI-OOM
    training_args = SFTConfig(
        output_dir=OUTPUT_DIR,
        per_device_train_batch_size=1,      
        gradient_accumulation_steps=4,      
        learning_rate=2e-4,
        num_train_epochs=3,                 
        logging_steps=5,
        report_to="tensorboard",
        optim="paged_adamw_8bit",           
        fp16=False,
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
    print("\n[START] Iniciando entrenamiento...\n")
    trainer.train()

    # Guardado del modelo final
    print("\n[SUCCESS] Entrenamiento finalizado. Guardando adaptador...")
    os.makedirs(FINAL_MODEL_DIR, exist_ok=True)
    trainer.model.save_pretrained(FINAL_MODEL_DIR)
    tokenizer.save_pretrained(FINAL_MODEL_DIR)
    
    print(f"\n[SUCCESS] Tu tutor listo. Los pesos finales están en: {FINAL_MODEL_DIR}")

if __name__ == "__main__":
    entrenar_modelo()