import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
import torch

load_dotenv()
NAME = os.getenv("MODEL_NAME")
VERSION = os.getenv("MODEL_VERSION")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

script_dir = os.path.dirname(os.path.abspath(__file__))

BASE_MODEL = "Qwen/Qwen2.5-0.5B-Instruct"
ADAPTER_DIR = os.path.join(script_dir, "models", f"{NAME}{VERSION}", "qwen-tutor")

print(f"Cargando a {NAME}...")
tokenizer = AutoTokenizer.from_pretrained(BASE_MODEL)
model = AutoModelForCausalLM.from_pretrained(BASE_MODEL, torch_dtype="auto", device_map="auto")
model = PeftModel.from_pretrained(model, ADAPTER_DIR)

class ChatRequest(BaseModel):
    messages: list

@app.post("/generate")
async def generate_response(request: ChatRequest):
    text = tokenizer.apply_chat_template(request.messages, tokenize=False, add_generation_prompt=True)
    model_inputs = tokenizer([text], return_tensors="pt").to(model.device)

    generated_ids = model.generate(**model_inputs, max_new_tokens=512, temperature=0.7)
    response = tokenizer.batch_decode(generated_ids[:, model_inputs.input_ids.shape[1]:], skip_special_tokens=True)[0]
    
    return {"response": response}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)