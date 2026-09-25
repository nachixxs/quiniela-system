import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "motion/react";
import { api, ApiError } from "../api/cliente";
import type { MovimientoOut } from "../api/tipos";
import { pesos } from "../util";
import { Aviso, Boton, Hoja, INSIGNIA, TARJETA, TIPOS, TONOS } from "../ui";

const FILA = "flex min-h-14 items-center gap-3 px-4 py-2.5 lg:px-5";
const horaFormato = new Intl.DateTimeFormat("es-AR", { hour: "2-digit", minute: "2-digit" });
const hora = (iso: string) => horaFormato.format(new Date(iso));
// D31: sin nombre de cliente en el contrato de movimientos, se identifica por id hasta que lo sume.
const quien = (m: MovimientoOut) => m.contraparte ?? (m.cliente_id ? `Cliente #${m.cliente_id}` : null);

const Reintentar = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} className="presiona -my-1 h-11 rounded-md px-2 font-medium underline underline-offset-4 lg:h-8">
    Reintentar
  </button>
);

// Hoja de confirmación: qué se anula, el motivo (obligatorio) y el botón primario sin vuelta atrás.
function HojaAnular({ mov, onCerrar, onExito }: { mov: MovimientoOut; onCerrar: () => void; onExito: () => void }) {
  const [motivo, setMotivo] = useState("");
  const queryClient = useQueryClient();
  const t = TIPOS[mov.tipo];

  const anular = useMutation({
    mutationFn: () => api.anular(mov.id, motivo),
    onSuccess: () => {
      for (const clave of ["cajas", "dia-actual", "deudores", "movimientos"]) queryClient.invalidateQueries({ queryKey: [clave] });
      if (mov.cliente_id) queryClient.invalidateQueries({ queryKey: ["cliente", mov.cliente_id] });
      onExito();
    },
  });

  return (
    <Hoja titulo="Anular movimiento" descripcion="Queda un contra-asiento con el motivo: no se puede deshacer." onCerrar={onCerrar}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3 rounded-lg border px-4 py-3">
          <t.icono className={`size-4 shrink-0 ${t.tono}`} aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{t.etiqueta}</span>
            <span className="block truncate text-xs text-muted-foreground">{hora(mov.creado_en)}{quien(mov) ? ` · ${quien(mov)}` : ""}</span>
          </span>
          <span className="monto text-sm font-medium">{pesos(mov.monto)}</span>
        </div>

        <div>
          <label htmlFor="motivo-anulacion" className="mb-2 block text-sm font-medium">Motivo</label>
          <textarea
            id="motivo-anulacion"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={3}
            placeholder="Por qué se anula"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs transition-[border-color,box-shadow] focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/20 dark:bg-input/30"
          />
        </div>

        {anular.isError && <Aviso tono="error">{anular.error instanceof ApiError ? anular.error.detalle : "No se pudo anular."}</Aviso>}

        <Boton type="button" cargando={anular.isPending} disabled={!motivo.trim()} onClick={() => anular.mutate()} className="h-12 w-full text-base lg:h-10 lg:text-sm">
          {anular.isPending ? "Anulando…" : "Anular"}
        </Boton>
      </div>
    </Hoja>
  );
}

// Últimos movimientos del día (D31): tarjeta siempre presente, con sus tres estados y la
// acción de anular por fila. Nuevos primero; un movimiento anulado se ve tachado, y su
// contra-asiento marca a qué movimiento corresponde.
export function TarjetaMovimientos() {
  const [aAnular, setAAnular] = useState<MovimientoOut | null>(null);
  const [avisoExito, setAvisoExito] = useState<string | null>(null);
  const dia = useQuery({ queryKey: ["dia-actual"], queryFn: api.diaActual });
  const fecha = dia.data?.dia.fecha;
  const movimientos = useQuery({
    queryKey: ["movimientos", fecha],
    queryFn: () => api.movimientos({ desde: fecha!, hasta: fecha! }),
    enabled: !!fecha,
  });

  useEffect(() => {
    if (!avisoExito) return;
    const t = setTimeout(() => setAvisoExito(null), 4000);
    return () => clearTimeout(t);
  }, [avisoExito]);

  const items = movimientos.data ? [...movimientos.data.items].sort((a, b) => b.creado_en.localeCompare(a.creado_en)) : undefined;
  const anulados = new Set(items?.filter((m) => m.anula_id !== null).map((m) => m.anula_id));
  const cargando = dia.isLoading || (dia.isSuccess && movimientos.isLoading);
  const error = dia.isError || movimientos.isError;

  return (
    <section className={`${TARJETA} mt-3 overflow-hidden lg:mt-4`} aria-labelledby="movimientos-hoy">
      <div className="px-4 pb-2 pt-4 lg:px-5 lg:pt-5">
        <h2 id="movimientos-hoy" className="font-medium">Movimientos de hoy</h2>
        <p className="text-sm text-muted-foreground">Lo cargado en el día, más nuevo primero</p>
      </div>

      {avisoExito && <div className="px-4 pb-2 lg:px-5"><Aviso tono="exito">{avisoExito}</Aviso></div>}
      {cargando && <div className="esqueleto m-4 h-40" />}
      {error && (
        <div className="p-4">
          <Aviso tono="error" accion={<Reintentar onClick={() => (dia.isError ? dia.refetch() : movimientos.refetch())} />}>
            No se pudieron traer los movimientos.
          </Aviso>
        </div>
      )}
      {items?.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">Sin movimientos hoy. Los que cargues aparecen acá.</p>}

      <ul className="divide-y">
        {items?.map((mov) => {
          const t = TIPOS[mov.tipo];
          const anulado = anulados.has(mov.id);
          const esContraAsiento = mov.anula_id !== null;
          const anulable = !anulado && !esContraAsiento;
          return (
            <li key={mov.id} className={FILA}>
              <t.icono className={`size-4 shrink-0 ${t.tono}`} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className={`block text-sm font-medium ${anulado ? "text-muted-foreground line-through" : ""}`}>{t.etiqueta}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {hora(mov.creado_en)}
                  {quien(mov) ? ` · ${quien(mov)}` : ""}
                  {esContraAsiento ? ` · Anula #${mov.anula_id}` : ""}
                  {mov.motivo_anulacion ? ` · ${mov.motivo_anulacion}` : ""}
                </span>
              </span>
              {anulado && <span className={`${INSIGNIA} ${TONOS.neutro}`}>Anulado</span>}
              <span className={`monto text-sm font-medium ${anulado ? "text-muted-foreground line-through" : ""}`}>{pesos(mov.monto)}</span>
              {anulable && (
                <button type="button" onClick={() => setAAnular(mov)} className="presiona -my-1 h-11 shrink-0 rounded-md px-2 text-xs font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground lg:h-8">
                  Anular
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <AnimatePresence>
        {aAnular && (
          <HojaAnular
            key={aAnular.id}
            mov={aAnular}
            onCerrar={() => setAAnular(null)}
            onExito={() => { setAAnular(null); setAvisoExito("Movimiento anulado."); }}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
