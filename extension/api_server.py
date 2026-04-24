from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import re
from urllib.parse import urlparse

app = FastAPI()

# Configuração vital de CORS para permitir que a extensão (que roda no contexto 
# de qualquer site) consiga se comunicar com este servidor local.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Chave da API do Google Cloud Console (Safe Browsing API)
GOOGLE_API_KEY = "SUA_CHAVE_API_DO_GOOGLE_AQUI"
GOOGLE_SAFE_BROWSING_URL = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={GOOGLE_API_KEY}"

class UrlRequest(BaseModel):
    url: str

def check_static_heuristics(url: str) -> dict:
    parsed_url = urlparse(url)
    domain = parsed_url.netloc
    
    # Regra 1: Domínio é um endereço IP em vez de nome? (ex: http://192.168.1.1/login)
    is_ip = re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", domain.split(':')[0])
    
    # Regra 2: Quantidade suspeita de hífens no domínio (ex: loja-oficial-promocao-brasil.com)
    many_hyphens = domain.count('-') >= 3
    
    # Regra 3: TLDs (Top-Level Domains) frequentemente gratuitos e usados em golpes
    suspicious_tld = re.search(r"\.tk$|\.ml$|\.ga$|\.cf$|\.gq$|\.xyz$", domain)

    if is_ip or many_hyphens or suspicious_tld:
        return {
            "is_danger": True, 
            "status": "Aparência Suspeita (Heurística)", 
            "reason": "Características de URL associadas a golpes"
        }
    
    return {"is_danger": False, "status": "Seguro", "reason": "Nenhuma ameaça detectada localmente"}

@app.post("/verify")
async def verify(request: UrlRequest):
    # 1. Monta o corpo da requisição padrão exigido pelo Google Safe Browsing
    payload = {
        "client": {
            "clientId": "ifc-videira-sentinela",
            "clientVersion": "1.0.0"
        },
        "threatInfo": {
            "threatTypes": ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE"],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [
                {"url": request.url}
            ]
        }
    }

    # 2. Consulta a API do Google de forma assíncrona
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(GOOGLE_SAFE_BROWSING_URL, json=payload)
            response.raise_for_status()
            data = response.json()
            
            # Se a resposta contiver 'matches', a URL está na lista negra do Google
            if "matches" in data:
                return {
                    "is_danger": True,
                    "status": "GOLPE CONFIRMADO",
                    "reason": "URL listada no banco de dados oficial do Google Safe Browsing"
                }
                
        except httpx.RequestError:
            raise HTTPException(status_code=500, detail="Erro ao comunicar com o Google Safe Browsing")

    # 3. Se o Google não detectou nada, aciona as regras estáticas de backup (Heurísticas)
    heuristic_result = check_static_heuristics(request.url)
    
    return heuristic_result