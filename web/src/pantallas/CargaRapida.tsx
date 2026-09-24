import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, m } from "motion/react";
import { Banknote, Check, CircleCheck, Info, Search, X } from "lucide-react";
import { api, ApiError } from "../api/cliente";
import type { ClienteBusqueda, MovimientoCrear } from "../api/tipos";
import { pesos, uuid } from "../util";
import { AVATAR, Aviso, Boton, CampoMonto, EASE_SALIDA, Hoja, TIPOS } from "../ui";

// D18: Pago no es un solo tipo, es todo lo que no entró o salió de la caja.
const OPCIONES_PAGO: { etiqueta: string; tipo: MovimientoCrear["tipo"] }[] = [
  { etiqueta: "MP / transferencia", tipo: "cobro_mercado_pago" },
  { etiqueta: "Retiro del dueño", tipo: "retiro_dueno" },
  { etiqueta: "Gasto", tipo: "gasto" },
];

export const BOTONES = [
  { etiqueta: "Fiado", tipo: "fiado", requiereCliente: true, ayuda: "Suma a la cuenta del cliente", icono: TIPOS.fiado.icono, tono: TIPOS.fiado.tono },
  { etiqueta: "Cobro", tipo: "cobro_fiado", requiereCliente: true, ayuda: "El cliente paga su fiado", icono: TIPOS.cobro_fiado.icono, tono: TIPOS.cobro_fiado.tono },
  { etiqueta: "Pago", tipo: null, requiereCliente: false, ayuda: "MP, retiro del dueño o gasto", icono: Banknote, tono: TIPOS.gasto.tono },
  { etiqueta: "Premio", tipo: "pago_premio", requiereCliente: false, ayuda: "Sale efectivo, entra la boleta", icono: TIPOS.pago_premio.icono, tono: TIPOS.pago_premio.tono },
] as const;
export type BotonCarga = (typeof BOTONES)[number];

const CAJA = "flex h-14 items-center gap-3 rounded-2xl bg-superficie-2 px-4";

// La hoja de carga y su confirmación. La usan la pantalla de carga rápida y los accesos del tablero.
export function Carga({ seleccion, onSeleccion }: { seleccion: BotonCarga | null; onSeleccion: (b: BotonCarga | null) => void }) {
  const [monto, setMonto] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [cliente, setCliente] = useState<ClienteBusqueda | null>(null);
  const [refCliente, setRefCliente] = useState(() => uuid());
  const [tipoPago, setTipoPago] = useState(OPCIONES_PAGO[0].tipo);
  const [confirmacion, setConfirmacion] = useState<{ id: number; texto: string } | null>(null);
  const queryClient = useQueryClient();

  const dia = useQuery({ queryKey: ["dia-actual"], queryFn: api.diaActual });
  const cajaChica = dia.data?.cajas.find((c) => c.tipo === "operativa");
  const clientes = useQuery({
    queryKey: ["clientes-busqueda", busqueda],
    queryFn: () => api.clientes(busqueda),
    enabled: busqueda.length > 0 && !cliente,
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
      setConfirmacion({ id: Date.now(), texto: `${etiqueta} ${pesos(mov.monto)}${cliente ? ` · ${cliente.nombre}` : ""}` });
      setRefCliente(uuid());
      cerrar();
      // El tablero y los fiados muestran el saldo nuevo que calcula el servidor.
      for (const clave of ["dia-actual", "cajas", "deudores"]) queryClient.invalidateQueries({ queryKey: [clave] });
    },
  });

  function cerrar() {
    onSeleccion(null);
    setMonto("");
    setBusqueda("");
    setCliente(null);
    setTipoPago(OPCIONES_PAGO[0].tipo);
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
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-4 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 flex justify-center lg:inset-x-auto lg:right-8 lg:top-8">
        <AnimatePresence>
          {confirmacion && (
            <m.button
              key={confirmacion.id}
              type="button"
              onClick={() => setConfirmacion(null)}
              initial={{ opacity: 0, transform: "translateY(-120%)" }}
              animate={{ opacity: 1, transform: "translateY(0%)" }}
              exit={{ opacity: 0, transform: "translateY(-120%)", transition: { duration: 0.18 } }}
              transition={{ duration: 0.25, ease: EASE_SALIDA }}
              className="pointer-events-auto flex w-full max-w-sm items-center gap-3 rounded-2xl bg-tinta p-3 pr-4 text-left text-lienzo shadow-tarjeta"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-exito text-superficie">
                <Check className="size-5" strokeWidth={3} aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">Guardado</span>
                <span className="block truncate text-sm opacity-80">{confirmacion.texto}</span>
              </span>
            </m.button>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {seleccion && (
          <Hoja
            key="carga"
            titulo={seleccion.etiqueta}
            onCerrar={cerrar}
            icono={
              <span className={`grid size-10 place-items-center rounded-full ${seleccion.tono}`}>
                <seleccion.icono className="size-5" aria-hidden />
              </span>
            }
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (listo) guardar.mutate();
              }}
              className="flex flex-col gap-5"
            >
              {seleccion.tipo === null && (
                <fieldset className="grid gap-2">
                  <legend className="mb-1.5 text-sm font-medium text-tinta-suave">Qué fue</legend>
                  {OPCIONES_PAGO.map((o) => {
                    const Icono = TIPOS[o.tipo].icono;
                    const elegida = tipoPago === o.tipo;
                    return (
                      <label
                        key={o.tipo}
                        className={`presiona flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border-2 px-4 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-foco ${elegida ? "border-estrella bg-estrella/15" : "border-transparent bg-superficie-2"}`}
                      >
                        <input type="radio" name="tipo-pago" className="sr-only" checked={elegida} onChange={() => setTipoPago(o.tipo)} />
                        <Icono className="size-5 text-tinta-suave" aria-hidden />
                        <span className="flex-1 font-medium">{o.etiqueta}</span>
                        {elegida && <CircleCheck className="size-5" aria-hidden />}
                      </label>
                    );
                  })}
                </fieldset>
              )}

              <CampoMonto etiqueta="Monto" valor={monto} onValor={setMonto} grande autoFocus enterKeyHint={seleccion.requiereCliente ? "next" : "done"} />

              {seleccion.requiereCliente && (
                <div>
                  <label htmlFor="carga-cliente" className="mb-1.5 block text-sm font-medium text-tinta-suave">Cliente</label>
                  {cliente ? (
                    <div className={`${CAJA} pl-2 pr-1`}>
                      <span className={AVATAR} aria-hidden>{cliente.nombre.charAt(0)}</span>
                      <span className="flex-1 truncate font-semibold">{cliente.nombre}</span>
                      <button type="button" onClick={() => setCliente(null)} aria-label="Cambiar cliente" className="presiona grid size-11 place-items-center rounded-full text-tinta-suave hover:bg-borde">
                        <X className="size-5" aria-hidden />
                      </button>
                    </div>
                  ) : (
                    <div className={`${CAJA} ring-foco focus-within:ring-2`}>
                      <Search className="size-5 shrink-0 text-tinta-suave" aria-hidden />
                      <input
                        id="carga-cliente"
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
                        <div className="esqueleto h-14" aria-label="Buscando…" />
                      ) : clientes.isError ? (
                        <p className="px-1 text-sm text-peligro">No se pudo buscar. Probá de nuevo.</p>
                      ) : clientes.data?.length === 0 ? (
                        <p className="px-1 text-sm text-tinta-suave">Nadie con “{busqueda}”.</p>
                      ) : (
                        <ul className="overflow-hidden rounded-2xl ring-1 ring-borde">
                          {clientes.data?.map((c) => (
                            <li key={c.id}>
                              <button
                                type="button"
                                onClick={() => { setCliente(c); setBusqueda(""); }}
                                className="flex min-h-14 w-full items-center gap-3 px-3 text-left transition-colors hover:bg-superficie-2 active:bg-superficie-2"
                              >
                                <span className={AVATAR} aria-hidden>{c.nombre.charAt(0)}</span>
                                <span className="flex-1 truncate font-medium">{c.nombre}</span>
                                {c.saldo !== 0 && <span className={`text-sm ${c.saldo < 0 ? "text-exito" : "text-tinta-suave"}`}>{c.saldo < 0 ? "A favor " : "Debe "}{pesos(Math.abs(c.saldo))}</span>}
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

              <Boton type="submit" cargando={guardar.isPending} disabled={!listo} className="h-14 w-full text-base">
                {guardar.isPending ? "Guardando…" : `Guardar ${seleccion.etiqueta.toLowerCase()}`}
              </Boton>
            </form>
          </Hoja>
        )}
      </AnimatePresence>
    </>
  );
}

export function CargaRapida() {
  const [seleccion, setSeleccion] = useState<BotonCarga | null>(null);
  return (
    <div className="px-4 pt-5 lg:px-0 lg:pt-0">
      <p className="mb-5 flex items-center gap-2 text-sm text-tinta-suave">
        <Info className="size-4 shrink-0" aria-hidden />
        Las ventas en efectivo no se cargan acá: salen del ticket al cierre.
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        {BOTONES.map((b) => (
          <button
            key={b.etiqueta}
            type="button"
            onClick={() => setSeleccion(b)}
            className="presiona flex aspect-square flex-col justify-between rounded-3xl bg-superficie p-4 text-left shadow-tarjeta hover:bg-superficie-2 lg:aspect-[4/5] lg:p-6"
          >
            <span className={`grid size-12 place-items-center rounded-2xl ${b.tono}`}>
              <b.icono className="size-6" aria-hidden />
            </span>
            <span>
              <span className="block text-xl font-semibold tracking-tight">{b.etiqueta}</span>
              <span className="mt-0.5 block text-sm text-tinta-suave">{b.ayuda}</span>
            </span>
          </button>
        ))}
      </div>
      <Carga seleccion={seleccion} onSeleccion={setSeleccion} />
    </div>
  );
}
