# quiniela-system

Sistema de cajas para una agencia de quiniela: reemplaza siete cuadernos por un libro único
de movimientos, cuatro arqueos físicos y reportes calculados. Datos ficticios en todo el repo.

## Documentos

Fuera del repo, en la carpeta de notas de la agencia (la ruta está en `CLAUDE.local.md`):
`SPECS.md` (el contrato del sistema), `CONTRATO-API.md` (endpoints), `ROADMAP.md`
(checkpoints, dueños de archivos, presupuestos) y `ESTADO.md` (en curso y decisiones).
Se trabaja por checkpoints con la skill `orquestador`, cada uno en su rama `cp-N`.

## Regla 0: el código más corto que funcione

Está por encima de todo lo demás (SPECS §0).

- Un arreglo de tres líneas se hace en tres líneas. Sin capas nuevas ni refactors alrededor.
- Se testea solo lo que puede costar plata: ecuaciones de arqueo, saldos de clientes,
  efectos de cada tipo de movimiento. No se testea el andamiaje (config, scripts, Docker).
- Presupuesto del MVP ~4.000 líneas. Un archivo que pasa de 300 líneas se discute antes.
- Ratio tests/código máximo 0,6 a 1.
- Antes de crear un archivo, preguntarse si el contenido entra en uno existente. Todo
  archivo nuevo tiene dueño en el ROADMAP antes de crearse.

## Reglas duras (SPECS §7)

1. Ningún movimiento se borra ni se edita: se anula con contra-asiento (motivo y momento).
2. Un arqueo que no cierra se guarda igual, con su diferencia. Nunca se ajusta un número.
3. El "esperado" de la caja chica no existe hasta cargar el ticket.
4. `negocio_id` en toda tabla y toda query. Nunca viaja en el request: sale de la sesión.
5. Login desde el primer día.
6. Backup diario automático, fuera del servidor.
7. Un turno no se cierra sin arqueo. Un día no se cierra con turnos abiertos.
8. Un día cerrado no se reabre (cargas tardías: SPECS §7.8).
9. El asistente no calcula plata.
10. Todo dato de ejemplo es ficticio.

## Convenciones

- Nombres del dominio en español, tal cual el glosario de SPECS §2 (`movimiento`, `arqueo`,
  `caja_chica`, `fiado`, `boleta`). Infraestructura en inglés (`Dockerfile`, `compose.yaml`).
- Montos enteros en pesos, sin decimales.
- Commits `tipo: descripción` en español, cortos: `feat`, `fix`, `test`, `docs`, `chore`.
- Nunca `git add -A` ni `git add .`: se agregan los archivos por nombre.
- Nunca leer, mostrar ni commitear `.env`.
- Dependencias versionadas en `requirements.txt`; una que no está en SPECS §12 la aprueba
  Nacho antes de entrar.

## Comandos

```powershell
.\.venv\Scripts\python.exe -m pytest          # tests
docker compose up -d --build                  # api (127.0.0.1:8000) y db (127.0.0.1:5433)
docker compose exec api alembic upgrade head  # migraciones (el contenedor ya las corre al arrancar)
```
