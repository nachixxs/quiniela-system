from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from app.routers.auth import router as auth_router

app = FastAPI(docs_url="/api/docs", openapi_url="/api/openapi.json")
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])


@app.exception_handler(HTTPException)
async def manejar_error(request: Request, exc: HTTPException) -> JSONResponse:
    detalle = exc.detail if isinstance(exc.detail, dict) else {"error": "error", "detalle": str(exc.detail)}
    return JSONResponse(status_code=exc.status_code, content=detalle)


@app.get("/api/salud")
def salud() -> dict:
    return {"ok": True}
