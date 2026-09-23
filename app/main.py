from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.routers import asistente, auth, caja, catalogos, dia, movimientos, reportes

ERROR_NEGOCIO_ID = {"error": "negocio_id_no_permitido", "detalle": "negocio_id sale de la sesión, no viaja en el request."}

app = FastAPI(docs_url="/api/docs", openapi_url="/api/openapi.json")
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(dia.router, prefix="/api", tags=["dia"])
app.include_router(movimientos.router, prefix="/api", tags=["movimientos"])
app.include_router(caja.router, prefix="/api", tags=["caja"])
app.include_router(catalogos.router, prefix="/api", tags=["catalogos"])
app.include_router(reportes.router, prefix="/api", tags=["reportes"])
app.include_router(asistente.router, prefix="/api", tags=["asistente"])


@app.middleware("http")
async def bloquear_negocio_id(request: Request, call_next):
    cuerpo = await request.body()
    if "negocio_id" in request.query_params or b'"negocio_id"' in cuerpo:
        return JSONResponse(ERROR_NEGOCIO_ID, 400)
    return await call_next(request)


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
