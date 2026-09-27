import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence, m } from "motion/react";
import { Banknote, CircleCheck, Search, UserPlus, X } from "lucide-react";
import { api, ApiError } from "../api/cliente";
import { esSinDia, type ClienteBusqueda, type MovimientoCrear } from "../api/tipos";
import { pesos, uuid } from "../util";
import { Aviso, Boton, CampoMonto, Hoja, OPCION, PUNTO_RADIO, TARJETA, TIPOS } from "../ui";
import { AvisoAbrirDia } from "./Dia";

// D18: Pago no es un solo tipo, es todo lo que no entró o salió de la caja. D42: Cobro tampoco.
const OPCIONES_COBRO: MovimientoCrear["tipo"][] = ["cobro_fiado", "cobro_subagente", "ingreso_del_dueno"];
const OPCIONES_PAGO: MovimientoCrear["tipo"][] = ["cobro_mercado_pago", "retiro_dueno", "gasto", "pago_banco", "sueldo"];
// D42: estos van a la caja grande; el resto sigue en la chica.
const CAJA_GRANDE = new Set<MovimientoCrear["tipo"]>(["cobro_subagente", "ingreso_del_dueno", "pago_banco", "sueldo"]);
const CON_CLIENTE = new Set<MovimientoCrear["tipo"]>(["fiado", "cobro_fiado"]);

export const BOTONES = [
  { etiqueta: "Fiado", tipo: "fiado", opciones: null, ayuda: "Suma a la cuenta del cliente", icono: TIPOS.fiado.icono, tono: TIPOS.fiado.tono },
  { etiqueta: "Cobro", tipo: null, opciones: OPCIONES_COBRO, ayuda: "Fiado, subagente o lo trae el dueño", icono: TIPOS.cobro_fiado.icono, tono: TIPOS.cobro_fiado.tono },
  { etiqueta: "Pago", tipo: null, opciones: OPCIONES_PAGO, ayuda: "MP, banco, sueldo, retiro o gasto", icono: Banknote, tono: TIPOS.gasto.tono },
  { etiqueta: "Premio", tipo: "pago_premio", opciones: null, ayuda: "Sale efectivo, entra la boleta", icono: TIPOS.pago_premio.icono, tono: TIPOS.pago_premio.tono },
] as const;
export type BotonCarga = (typeof BOTONES)[number];

const CAJA = "flex h-12 items-center gap-2 rounded-md border border-input bg-background px-3 shadow-xs dark:bg-input/30";

// La hoja de carga y su confirmación. La usan la pantalla de carga rápida y los accesos del inicio.
export function Carga({ seleccion, onSeleccion }: { seleccion: BotonCarga | null; onSeleccion: (b: BotonCarga | null) => void }) {
  const [monto, setMonto] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [cliente, setCliente] = useState<ClienteBusqueda | null>(null);
  const [contraparte, setContraparte] = useState("");
  const [refCliente, setRefCliente] = useState(() => uuid());
  const [subtipo, setSubtipo] = useState<MovimientoCrear["tipo"] | null>(null);
  const [confirmacion, setConfirmacion] = useState<{ id: number; titulo: string; texto: string } | null>(null);

  const dia = useQuery({ queryKey: ["dia-actual"], queryFn: api.diaActual });
  const sinDia = dia.isError ? esSinDia(dia.error) : dia.isSuccess && dia.data.dia.estado !== "abierto";
  // El tipo elegido: fijo (Fiado, Premio) o el de la opción marcada en Cobro/Pago.
  const tipoFinal = seleccion?.tipo ?? subtipo ?? seleccion?.opciones?.[0] ?? null;
  const requiereCliente = !!tipoFinal && CON_CLIENTE.has(tipoFinal);
  const requiereContraparte = tipoFinal === "cobro_subagente";
  const caja = dia.data?.cajas.find((c) => c.tipo === (tipoFinal && CAJA_GRANDE.has(tipoFinal) ? "central" : "operativa"));
  const clientes = useQuery({
    queryKey: ["clientes-busqueda", busqueda],
    queryFn: () => api.clientes(busqueda),
    enabled: busqueda.length > 0,
  });
  // Sin esto, con la base real vacía no se puede fiar a nadie: crea y selecciona en el mismo paso.
  const crearCliente = useMutation({
    mutationFn: (nombre: string) => api.crearCliente({ nombre }),
    onSuccess: (c) => { setCliente(c); setBusqueda(""); setRefCliente(uuid()); },
  });

  const guardar = useMutation({
    mutationFn: () => {
      const mov: MovimientoCrear = {
        ref_cliente: refCliente, tipo: tipoFinal!, monto: Number(monto),
        caja_id: caja!.id, cliente_id: requiereCliente ? cliente?.id ?? null : null,
        contraparte: requiereContraparte ? contraparte.trim() : null,
      };
      return api.crearMovimiento(mov);
    },
    onSuccess: (mov) => {
      const etiqueta = seleccion?.tipo ? seleccion.etiqueta : TIPOS[mov.tipo].etiqueta;
      const quien = requiereCliente ? cliente?.nombre : mov.contraparte;
      setConfirmacion({ id: Date.now(), titulo: `${etiqueta} guardado`, texto: `${pesos(mov.monto)}${quien ? ` · ${quien}` : ""}` });
      cerrar();
    },
  });

  function cerrar() {
    onSeleccion(null);
    setMonto("");
    setBusqueda("");
    setCliente(null);
    setContraparte("");
    setSubtipo(null);
    setRefCliente(uuid());
    guardar.reset();
  }

  useEffect(() => {
    if (!confirmacion) return;
    const t = setTimeout(() => setConfirmacion(null), 4000);
    return () => clearTimeout(t);
  }, [confirmacion]);

  const listo = !sinDia && !!caja && Number(monto) > 0 && (!requiereCliente || !!cliente) && (!requiereContraparte || contraparte.trim().length > 0);

  return (
    <>
      {/* Confirmación: baja desde arriba y se va por el mismo lado, sin tapar la próxima carga. */}
      <div role="status" className="pointer-events-none fixed inset-x-4 top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 flex justify-center lg:inset-x-auto lg:right-6 lg:top-4">
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
              {seleccion.opciones && (
                <fieldset className="grid gap-2">
                  <legend className="mb-2 text-sm font-medium">Qué fue</legend>
                  {seleccion.opciones.map((op) => {
                    const t = TIPOS[op];
                    return (
                      <label key={op} className={`${OPCION} min-h-12 px-3`}>
                        <input type="radio" name="subtipo" className="sr-only" checked={tipoFinal === op} onChange={() => { setSubtipo(op); setRefCliente(uuid()); }} />
                        <t.icono className={`size-4 ${t.tono}`} aria-hidden />
                        <span className="flex-1 text-sm font-medium">{t.etiqueta}</span>
                        {PUNTO_RADIO}
                      </label>
                    );
                  })}
                </fieldset>
              )}

              <CampoMonto etiqueta="Monto" valor={monto} onValor={(v) => { setMonto(v); setRefCliente(uuid()); }} grande autoFocus enterKeyHint={requiereCliente || requiereContraparte ? "next" : "done"} />

              {requiereContraparte && (
                <div>
                  <label htmlFor="carga-contraparte" className="mb-2 block text-sm font-medium">Nombre</label>
                  <div className={`${CAJA} transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20`}>
                    <input
                      id="carga-contraparte"
                      name="contraparte"
                      value={contraparte}
                      onChange={(e) => { setContraparte(e.target.value); setRefCliente(uuid()); }}
                      placeholder="Nombre del subagente"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      className="h-full min-w-0 flex-1 bg-transparent text-base focus-visible:outline-none"
                    />
                  </div>
                </div>
              )}

              {requiereCliente && (
                <div>
                  <label htmlFor="carga-cliente" className="mb-2 block text-sm font-medium">Cliente</label>
                  {cliente ? (
                    <div className={`${CAJA} pr-1`}>
                      <span className="flex-1 truncate font-medium">{cliente.nombre}</span>
                      <button type="button" onClick={() => { setCliente(null); setRefCliente(uuid()); }} aria-label="Cambiar cliente" className="presiona grid size-11 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:size-8">
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
                          <li>
                            <button
                              type="button"
                              onClick={() => crearCliente.mutate(busqueda)}
                              disabled={crearCliente.isPending}
                              className="flex min-h-12 w-full items-center gap-2 px-3 text-left text-sm font-medium transition-colors hover:bg-muted/60 active:bg-muted disabled:opacity-50"
                            >
                              <UserPlus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                              {crearCliente.isPending ? "Creando…" : `Nuevo cliente: “${busqueda}”`}
                            </button>
                          </li>
                        </ul>
                      )}
                      {crearCliente.isError && (
                        <p className="mt-1 px-1 text-sm text-peligro">{crearCliente.error instanceof ApiError ? crearCliente.error.detalle : "No se pudo crear el cliente."}</p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {dia.isError && (esSinDia(dia.error) ? <AvisoAbrirDia /> : <Aviso tono="error">No se pudo traer el día. Revisá la conexión.</Aviso>)}
              {dia.isSuccess && sinDia && <AvisoAbrirDia />}
              {dia.isSuccess && !sinDia && !caja && <Aviso tono="aviso">No hay caja abierta: hasta que se abra el día no se puede cargar.</Aviso>}
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
