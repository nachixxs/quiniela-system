from fastapi import HTTPException


def no_implementado() -> HTTPException:
    """Stub compartido: lo conecta la 3.A3 a la lógica de dominio (backend-dev)."""
    return HTTPException(501, {"error": "no_implementado", "detalle": "Endpoint pendiente de conectar."})
