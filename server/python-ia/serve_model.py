import os
import logging
import httpx
from typing import List, Dict, Any
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))
COLAB_URL = os.getenv("IA_URL")

logging.basicConfig(level=logging.INFO, format="%(asctime)s | %(levelname)-8s | %(message)s")
app = FastAPI(title="Tutor IA - Proxy Local")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

class ChatRequest(BaseModel):
    messages: List[Dict[str, Any]] = Field(..., min_length=1)
    is_competitive: bool = Field(False)
    estado_anterior: str = Field("GENERAL")

@app.post("/generate")
async def generate_response(request: ChatRequest):
    if not COLAB_URL:
        return {"response": "⚠️ Error: Falta IA_URL en el archivo .env", "estado_detectado": "ERROR"}

    # Reenvía la petición a Google Colab
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            respuesta_nube = await client.post(COLAB_URL, json=request.model_dump())
            respuesta_nube.raise_for_status()
            return respuesta_nube.json() # Devuelve lo que respondió Colab
        except Exception as e:
            return {"response": f"⚠️ Error conectando con Colab: {e}", "estado_detectado": "ERROR"}

if __name__ == "__main__":
    import uvicorn
    logging.info("🚀 Iniciando Puente Local en el puerto 8000")
    uvicorn.run(app, host="127.0.0.1", port=8000)