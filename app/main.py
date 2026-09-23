from fastapi import FastAPI, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.routers.asistente import router as asistente_router
from app.routers.auth import router as auth_router
from app.routers.caja import router as caja_router
from app.routers.catalogos import router as catalogos_router
from app.routers.dia import router as dia_router
from app.routers.movimientos import router as movimientos_router
from app.routers.reportes import router as reportes_router

ERROR_NEGOCIO_ID = {"error": "negocio_id_no_permitido", "detalle": "negocio_id sale de la sesión, no viaja en el request."}

app = FastAPI(docs_url="/api/docs", openapi_url="/api/openapi.json")
app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(dia_router, prefix="/api", tags=["dia"])
app.include_router(movimientos_router, prefix="/api", tags=["movimientos"])
app.include_router(caja_router, prefix="/api", tags=["caja"])
app.include_router(catalogos_router, prefix="/api", tags=["catalogos"])
app.include_router(reportes_router, prefix="/api", tags=["reportes"])
app.include_router(asistente_router, prefix="/api", tags=["asistente"])


@app.middleware("http")
async def bloquear_negocio_id(request: Request, call_next):
    if "negocio_id" in request.query_params:
        return JSONResponse(ERROR_NEGOCIO_ID, 400)
    cuerpo = await request.body()
    if b'"negocio_id"' in cuerpo:
        return JSONResponse(ERROR_NEGOCIO_ID, 400)

    async def receive():  # restaura el body consumido, para que la ruta lo vuelva a leer
        return {"type": "http.request", "body": cuerpo}

    request._receive = receive
    return await call_next(request)


@app.exception_handler(StarletteHTTPException)
async def manejar_error(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    detalle = exc.detail if isinstance(exc.detail, dict) else {"error": "error", "detalle": str(exc.detail)}
    return JSONResponse(status_code=exc.status_code, content=detalle)


@app.exception_handler(RequestValidationError)
async def manejar_validacion(request: Request, exc: RequestValidationError) -> JSONResponse:
    return JSONResponse({"error": "datos_invalidos", "detalle": jsonable_encoder(exc.errors())}, 422)


@app.get("/api/salud")
def salud() -> dict:
    return {"ok": True}
