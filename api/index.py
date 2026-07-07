"""Punto de entrada para el runtime de Python de Vercel.

Vercel ejecuta cada archivo de `api/` como función serverless y busca una app
ASGI/WSGI llamada `app`. El paquete real vive en `backend/app`, así que lo
añadimos al path e importamos la instancia de FastAPI ya construida.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.main import app  # noqa: E402  (import tras ajustar sys.path)

__all__ = ["app"]
