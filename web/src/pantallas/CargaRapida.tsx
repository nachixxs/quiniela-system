import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, m } from "motion/react";
import { Banknote, CircleCheck, Search, X } from "lucide-react";
import { api, ApiError } from "../api/cliente";
import type { ClienteBusqueda, MovimientoCrear } from "../api/tipos";
import { pesos, uuid } from "../util";
import { Aviso, Boton, CampoMonto, Hoja, OPCION, PUNTO_RADIO, TARJETA, TIPOS } from "../ui";

// D18: Pago no es un solo tipo, es todo lo que no entró o salió de la caja.
const TIPOS_PAGO: MovimientoCrear["tipo"][] = ["cobro_mercado_pago", "retiro_dueno", "gasto"];

export const BOTONES = [
  { etiqueta: "Fiado", tipo: "fiado", requiereCliente: true, ayuda: "Suma a la cuenta del cliente", icono: TIPOS.fiado.icono, tono: TIPOS.fiado.tono },
  { etiqueta: "Cobro", tipo: "cobro_fiado", requiereCliente: true, ayuda: "El cliente paga su fiado", icono: TIPOS.cobro_fiado.icono, tono: TIPOS.cobro_fiado.tono },
  { etiqueta: "Pago", tipo: null, requiereCliente: false, ayuda: "MP, retiro del dueño o gasto", icono: Banknote, tono: TIPOS.gasto.tono },
  { etiqueta: "Premio", tipo: "pago_premio", requiereCliente: false, ayuda: "Sale efectivo, entra la boleta", icono: TIPOS.pago_premio.icono, tono: TIPOS.pago_premio.tono },
] as const;
export type BotonCarga = (typeof BOTONES)[number];

const CAJA = "flex h-12 items-center gap-2 rounded-md border border-input bg-background px-3 shadow-xs dark:bg-input/30";

// La hoja de carga y su confirmación. La usan la pantalla de carga rápida y los accesos del inicio.
export function Carga({ seleccion, onSeleccion }: { seleccion: BotonCarga | null; onSeleccion: (b: BotonCarga | null) => void }) {
  const [monto, setMonto] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [cliente, setCliente] = useState<ClienteBusqueda | null>(null);
  const [refCliente, setRefCliente] = useState(() => uuid());
  const [tipoPago, setTipoPago] = useState(TIPOS_PAGO[0]);
  const [confirmacion, setConfirmacion] = useState<{ id: number; titulo: string; texto: string } | null>(null);
  const queryClient = useQueryClient();

  const dia = useQuery({ queryKey: ["dia-actual"], queryFn: api.diaActual });
  const cajaChica = dia.data?.cajas.find((c) => c.tipo === "operativa");
  const clientes = useQuery({
    queryKey: ["clientes-busqueda", busqueda],
    queryFn: () => api.clientes(busqueda),
    enabled: busqueda.length > 0,
  });

  const guardar = useMutation({
    mutationFn: () => {
      if (!cajaChica) throw new ApiError("sin_caja", "No hay caja chica abierta.");
      const mov: MovimientoCrear = {
        ref_cliente: refCliente, tipo: seleccion!.tipo ?? tipoPago, monto: Number(monto),
        caja_id: cajaChica.id, cliente_id: cliente?.id ?? null,
      };
      return api.crearMovimiento(mov);
    },
    onSuccess: (mov) => {
      const etiqueta = seleccion?.tipo ? seleccion.etiqueta : TIPOS[mov.tipo].etiqueta;
      setConfirmacion({ id: Date.now(), titulo: `${etiqueta} guardado`, texto: `${pesos(mov.monto)}${cliente ? ` · ${cliente.nombre}` : ""}` });
      cerrar();
      // El inicio y los fiados muestran el saldo nuevo que calcula el servidor.
      for (const clave of ["dia-actual", "cajas", "deudores"]) queryClient.invalidateQueries({ queryKey: [clave] });
    },
  });

  function cerrar() {
    onSeleccion(null);
    setMonto("");
    setBusqueda("");
    setCliente(null);
    setTipoPago(TIPOS_PAGO[0]);
    setRefCliente(uuid());
    guardar.reset();
  }

  useEffect(() => {
    if (!confirmacion) return;
    const t = setTimeout(() => setConfirmacion(null), 4000);
    return () => clearTimeout(t);
  }, [confirmacion]);

  const listo = !!cajaChica && Number(monto) > 0 && (!seleccion?.requiereCliente || !!cliente);

  return (
    <>
      {/* Confirmación: baja desde arriba y se va por el mismo lado, sin tapar la próxima carga. */}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-4 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 flex justify-center lg:inset-x-auto lg:right-6 lg:top-4">
        <AnimatePresence>
          {confirmacion && (
            <m.button
              key={confirmacion.id}
              type="button"
              onClick={() => setConfirmacion(null)}
              initial={{ opacity: 0, transform: "translateY(-16px) scale(0.97)" }}
              animate={{ opacity: 1, transform: "translateY(0px) scale(1)" }}
              exit={{ opacity: 0, transform: "translateY(-16px) scale(0.97)", transition: { duration: 0.15 } }}
              transition={{ type: "spring", duration: 0.35, bounce: 0.1 }}
              className="pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg border bg-card p-4 text-left shadow-lg"
            >
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-exito" aria-hidden />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{confirmacion.titulo}</span>
                <span className="monto block truncate text-sm text-muted-foreground">{confirmacion.texto}</span>
              </span>
            </m.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {seleccion && (
          <Hoja key="carga" titulo={seleccion.etiqueta} descripcion={seleccion.ayuda} onCerrar={cerrar}
            icono={<seleccion.icono className={`mt-0.5 size-5 shrink-0 ${seleccion.tono}`} aria-hidden />}>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (listo) guardar.mutate();
              }}
              className="flex flex-col gap-5"
            >
              {seleccion.tipo === null && (
                <fieldset className="grid gap-2">
                  <legend className="mb-2 text-sm font-medium">Qué fue</legend>
                  {TIPOS_PAGO.map((tipo) => {
                    const t = TIPOS[tipo];
                    return (
                      <label key={tipo} className={`${OPCION} min-h-12 px-3`}>
                        <input type="radio" name="tipo-pago" className="sr-only" checked={tipoPago === tipo} onChange={() => { setTipoPago(tipo); setRefCliente(uuid()); }} />
                        <t.icono className={`size-4 ${t.tono}`} aria-hidden />
                        <span className="flex-1 text-sm font-medium">{t.etiqueta}</span>
                        {PUNTO_RADIO}
                      </label>
                    );
                  })}
                </fieldset>
              )}

              <CampoMonto etiqueta="Monto" valor={monto} onValor={(v) => { setMonto(v); setRefCliente(uuid()); }} grande autoFocus enterKeyHint={seleccion.requiereCliente ? "next" : "done"} />

              {seleccion.requiereCliente && (
                <div>
                  <label htmlFor="carga-cliente" className="mb-2 block text-sm font-medium">Cliente</label>
                  {cliente ? (
                    <div className={`${CAJA} pr-1`}>
                      <span className="flex-1 truncate font-medium">{cliente.nombre}</span>
                      <button type="button" onClick={() => { setCliente(null); setRefCliente(uuid()); }} aria-label="Cambiar cliente" className="presiona grid size-10 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground">
                        <X className="size-4" aria-hidden />
                      </button>
                    </div>
                  ) : (
                    <div className={`${CAJA} transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20`}>
                      <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <input
                        id="carga-cliente"
                        name="cliente"
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                        placeholder="Buscar por nombre…"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        className="h-full min-w-0 flex-1 bg-transparent text-base focus-visible:outline-none"
                      />
                    </div>
                  )}
                  {!cliente && busqueda && (
                    <div className="mt-2" aria-live="polite">
                      {clientes.isLoading ? (
                        <div className="esqueleto h-12" aria-label="Buscando…" />
                      ) : clientes.isError ? (
                        <p className="px-1 text-sm text-peligro">No se pudo buscar. Probá de nuevo.</p>
                      ) : clientes.data?.length === 0 ? (
                        <p className="px-1 text-sm text-muted-foreground">Nadie con “{busqueda}”.</p>
                      ) : (
                        <ul className="divide-y overflow-hidden rounded-lg border">
                          {clientes.data?.map((c) => (
                            <li key={c.id}>
                              <button
                                type="button"
                                onClick={() => { setCliente(c); setBusqueda(""); setRefCliente(uuid()); }}
                                className="flex min-h-12 w-full items-center gap-3 px-3 text-left transition-colors hover:bg-muted/60 active:bg-muted"
                              >
                                <span className="flex-1 truncate text-sm font-medium">{c.nombre}</span>
                                {c.saldo !== 0 && (
                                  <span className={`text-xs ${c.saldo < 0 ? "text-exito" : "text-muted-foreground"}`}>
                                    {c.saldo < 0 ? "A favor " : "Debe "}<span className="monto">{pesos(Math.abs(c.saldo))}</span>
                                  </span>
                                )}
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              )}

              {dia.isError && <Aviso tono="error">No se pudo traer el día. Revisá la conexión.</Aviso>}
              {dia.isSuccess && !cajaChica && <Aviso tono="aviso">No hay caja chica abierta: hasta que se abra el día no se puede cargar.</Aviso>}
              {guardar.isError && <Aviso tono="error">{guardar.error instanceof ApiError ? guardar.error.detalle : "No se pudo guardar."}</Aviso>}

              <Boton type="submit" cargando={guardar.isPending} disabled={!listo} className="h-12 w-full text-base lg:h-10 lg:text-sm">
                {guardar.isPending ? "Guardando…" : `Guardar ${seleccion.etiqueta.toLowerCase()}`}
              </Boton>
            </form>
          </Hoja>
        )}
      </AnimatePresence>
    </>
  );
}

// Cuatro accesos grandes, a dos columnas en el celular: se tocan con el pulgar sin mirar dos veces.
export function CargaRapida() {
  const [seleccion, setSeleccion] = useState<BotonCarga | null>(null);
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {BOTONES.map((b) => (
          <button
            key={b.etiqueta}
            type="button"
            onClick={() => setSeleccion(b)}
            className={`${TARJETA} presiona flex min-h-36 flex-col justify-between p-4 text-left hover:bg-muted/50 lg:min-h-40 lg:p-5`}
          >
            <b.icono className={`size-5 ${b.tono}`} aria-hidden />
            <span>
              <span className="block text-base font-semibold tracking-tight">{b.etiqueta}</span>
              <span className="mt-1 block text-sm leading-snug text-muted-foreground">{b.ayuda}</span>
            </span>
          </button>
        ))}
      </div>
      <Carga seleccion={seleccion} onSeleccion={setSeleccion} />
    </>
  );
}
