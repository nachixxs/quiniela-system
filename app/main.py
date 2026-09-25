import os
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.operaciones import Conflicto, ErrorDominio, Invalido, NoEncontrado
from app.routers import asistente, auth, caja, catalogos, dia, movimientos, reportes

ERROR_NEGOCIO_ID = {"error": "negocio_id_no_permitido", "detalle": "negocio_id sale de la sesión, no viaja en el request."}
ERROR_BODY_GRANDE = {"error": "cuerpo_muy_grande", "detalle": "El cuerpo del request supera el límite permitido."}
LIMITE_BODY = 65_536  # 64 KB (auditoría 3.C2)
PRODUCCION = os.environ.get("PRODUCCION") == "1"
CODIGOS_ERROR_DOMINIO = {NoEncontrado: 404, Invalido: 400, Conflicto: 409}

app = FastAPI(docs_url=None if PRODUCCION else "/api/docs",
              openapi_url=None if PRODUCCION else "/api/openapi.json",
              redoc_url=None if PRODUCCION else "/api/redoc")
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(dia.router, prefix="/api", tags=["dia"])
app.include_router(movimientos.router, prefix="/api", tags=["movimientos"])
app.include_router(caja.router, prefix="/api", tags=["caja"])
app.include_router(catalogos.router, prefix="/api", tags=["catalogos"])
app.include_router(reportes.router, prefix="/api", tags=["reportes"])
app.include_router(asistente.router, prefix="/api", tags=["asistente"])


@app.middleware("http")
async def bloquear_negocio_id(request: Request, call_next):
    largo = request.headers.get("content-length")
    if request.headers.get("transfer-encoding") or int(largo or 0) > LIMITE_BODY:
        return JSONResponse(ERROR_BODY_GRANDE, 413)
    cuerpo = await request.body()  # el server no entrega más bytes que el Content-Length
    if "negocio_id" in request.query_params or b'"negocio_id"' in cuerpo:
        return JSONResponse(ERROR_NEGOCIO_ID, 400)
    return await call_next(request)


@app.exception_handler(ErrorDominio)
async def manejar_error_dominio(request: Request, exc: ErrorDominio) -> JSONResponse:
    codigo = next((c for clase, c in CODIGOS_ERROR_DOMINIO.items() if isinstance(exc, clase)), 400)
    return JSONResponse({"error": exc.codigo, "detalle": exc.detalle}, codigo)


@app.exception_handler(StarletteHTTPException)
async def manejar_error(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    detalle = exc.detail if isinstance(exc.detail, dict) else {"error": "error", "detalle": str(exc.detail)}
    return JSONResponse(status_code=exc.status_code, content=detalle)


@app.exception_handler(RequestValidationError)
async def manejar_validacion(request: Request, exc: RequestValidationError) -> JSONResponse:
    primero = exc.errors()[0]
    detalle = f"{'.'.join(str(p) for p in primero['loc'])}: {primero['msg']}"
    return JSONResponse({"error": "datos_invalidos", "detalle": detalle}, 422)


@app.get("/api/salud")
def salud() -> dict:
    return {"ok": True}


# Al final: el mount en "/" se traga toda ruta que se declare después (/api/salud daba 404)
DIST = Path(__file__).resolve().parent.parent / "web" / "dist"
if DIST.is_dir():  # D12: FastAPI sirve el build de React, en un solo dominio sin CORS
    app.mount("/", StaticFiles(directory=DIST, html=True), name="frontend")
