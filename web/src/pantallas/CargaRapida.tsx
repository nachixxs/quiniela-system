import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "motion/react";
import { Banknote, Search, UserPlus, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "../api/cliente";
import { detalleError, esSinDia, faltaDia, type ClienteBusqueda, type MovimientoCrear } from "../api/tipos";
import { pesos, uuid } from "../util";
import { Aviso, AvisoAbrirDia, Boton, CampoMonto, Hoja, OPCION, PUNTO_RADIO, Reintentar, TARJETA, TIPOS } from "../ui";
import { Input } from "@/components/ui/input";

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

// Campo con ícono o botón adentro (buscar cliente, cliente elegido); el contorno de foco lo pone el borde.
const CAJA = "flex h-12 items-center gap-2 rounded-lg border border-input bg-card px-3 shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20 lg:h-11";

// La hoja de carga y su confirmación. La usan la pantalla de carga rápida y los accesos del inicio.
export function Carga({ seleccion, onSeleccion }: { seleccion: BotonCarga | null; onSeleccion: (b: BotonCarga | null) => void }) {
  const [monto, setMonto] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [cliente, setCliente] = useState<ClienteBusqueda | null>(null);
  const [contraparte, setContraparte] = useState("");
  const [subtipo, setSubtipo] = useState<MovimientoCrear["tipo"] | null>(null);

  const dia = useQuery({ queryKey: ["dia-actual"], queryFn: api.diaActual });
  const sinDia = faltaDia(dia);
  // El tipo elegido: fijo (Fiado, Premio) o el de la opción marcada en Cobro/Pago.
  const tipoFinal = seleccion?.tipo ?? subtipo ?? seleccion?.opciones?.[0] ?? null;
  const requiereCliente = !!tipoFinal && CON_CLIENTE.has(tipoFinal);
  const requiereContraparte = tipoFinal === "cobro_subagente";
  const caja = dia.data?.cajas.find((c) => c.tipo === (tipoFinal && CAJA_GRANDE.has(tipoFinal) ? "central" : "operativa"));
  // Misma ref para reintentos del mismo payload (doble clic, error de red); ref nueva apenas cambia cualquier dato.
  const refCliente = useMemo(uuid, [tipoFinal, monto, requiereCliente && cliente?.id, requiereContraparte && contraparte.trim(), caja?.id]);
  const clientes = useQuery({
    queryKey: ["clientes-busqueda", busqueda],
    queryFn: () => api.clientes(busqueda),
    enabled: busqueda.length > 0,
  });
  // Sin esto, con la base real vacía no se puede fiar a nadie: crea y selecciona en el mismo paso.
  const crearCliente = useMutation({
    mutationFn: (nombre: string) => api.crearCliente({ nombre }),
    onSuccess: (c) => { setCliente(c); setBusqueda(""); },
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
      const quien = requiereCliente ? cliente?.nombre : mov.contraparte;
      toast.success(`Cargado: ${TIPOS[mov.tipo].etiqueta} · ${pesos(mov.monto)}${quien ? ` · ${quien}` : ""}`);
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
    guardar.reset();
  }

  // Caso 8: qué falta, escrito debajo del botón (solo si el día y la caja están; si no, ya hay un aviso).
  const falta = Number(monto) <= 0 ? "Escribí el monto." : requiereCliente && !cliente ? "Elegí el cliente." : requiereContraparte && !contraparte.trim() ? "Escribí el nombre del subagente." : null;
  const listo = !sinDia && !!caja && !falta;
  const nombreExiste = clientes.data?.some((c) => c.nombre.trim().toLowerCase() === busqueda.trim().toLowerCase());

  return (
    <>
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
              <CampoMonto etiqueta="Monto" valor={monto} onValor={setMonto} grande autoFocus enterKeyHint={requiereCliente || requiereContraparte ? "next" : "done"} />

              {seleccion.opciones && (
                <fieldset>
                  <legend className="mb-2 text-sm font-medium">Qué fue</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {seleccion.opciones.map((op) => {
                      const t = TIPOS[op];
                      return (
                        <label key={op} className={`${OPCION} min-h-12 min-w-0 gap-2 px-3`}>
                          <input type="radio" name="subtipo" className="sr-only" checked={tipoFinal === op} onChange={() => setSubtipo(op)} />
                          <t.icono className={`size-4 shrink-0 max-lg:hidden ${t.tono}`} aria-hidden />
                          <span className="min-w-0 flex-1 break-words text-sm font-medium leading-tight">{t.etiqueta}</span>
                          {PUNTO_RADIO}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {requiereContraparte && (
                <div>
                  <label htmlFor="carga-contraparte" className="mb-2 block text-sm font-medium">Nombre</label>
                  <Input
                    id="carga-contraparte"
                    name="contraparte"
                    value={contraparte}
                    onChange={(e) => setContraparte(e.target.value)}
                    placeholder="Nombre del subagente"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    className="h-12 lg:h-11"
                  />
                </div>
              )}

              {requiereCliente && (
                <div>
                  <label htmlFor="carga-cliente" className="mb-2 block text-sm font-medium">Cliente</label>
                  {cliente ? (
                    <div className={`${CAJA} pr-1`}>
                      <span className="min-w-0 flex-1 break-words font-medium">{cliente.nombre}</span>
                      <button type="button" onClick={() => setCliente(null)} aria-label="Cambiar cliente" className="presiona grid size-11 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:size-8">
                        <X className="size-4" aria-hidden />
                      </button>
                    </div>
                  ) : (
                    <div className={CAJA}>
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
                        className="h-full min-w-0 flex-1 bg-transparent text-base focus-visible:outline-none lg:text-sm"
                      />
                    </div>
                  )}
                  {!cliente && busqueda && (
                    <div className="mt-2 grid gap-2" aria-live="polite">
                      {clientes.isLoading ? (
                        <div className="esqueleto h-12" aria-label="Buscando…" />
                      ) : clientes.isError ? (
                        <Aviso tono="error" accion={<Reintentar onClick={() => clientes.refetch()} />}>No se pudo buscar.</Aviso>
                      ) : (
                        <ul className="divide-y overflow-hidden rounded-lg border">
                          {clientes.data?.map((c) => (
                            <li key={c.id}>
                              <button
                                type="button"
                                onClick={() => { setCliente(c); setBusqueda(""); }}
                                className="flex min-h-12 w-full items-center gap-3 px-3 py-1 text-left transition-colors hover:bg-muted/60 active:bg-muted"
                              >
                                <span className="min-w-0 flex-1 break-words text-sm font-medium">{c.nombre}</span>
                                {c.saldo !== 0 && (
                                  <span className={`text-xs ${c.saldo < 0 ? "text-exito" : "text-muted-foreground"}`}>
                                    {c.saldo < 0 ? "A favor " : "Debe "}<span className="monto">{pesos(Math.abs(c.saldo))}</span>
                                  </span>
                                )}
                              </button>
                            </li>
                          ))}
                          {/* Sin duplicar: si ya hay un cliente con ese nombre exacto, no se ofrece crearlo. */}
                          {!nombreExiste && (
                            <li>
                              <button
                                type="button"
                                onClick={() => crearCliente.mutate(busqueda.trim())}
                                disabled={crearCliente.isPending}
                                className="flex min-h-12 w-full items-center gap-2 px-3 text-left text-sm font-medium transition-colors hover:bg-muted/60 active:bg-muted disabled:opacity-50"
                              >
                                <UserPlus className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                                {crearCliente.isPending ? "Creando…" : `Nuevo cliente: “${busqueda.trim()}”`}
                              </button>
                            </li>
                          )}
                        </ul>
                      )}
                      {crearCliente.isError && <Aviso tono="error">{detalleError(crearCliente.error, "No se pudo crear el cliente.")}</Aviso>}
                    </div>
                  )}
                </div>
              )}

              {dia.isError && (esSinDia(dia.error) ? <AvisoAbrirDia /> : <Aviso tono="error">No se pudo traer el día. Revisá la conexión.</Aviso>)}
              {dia.isSuccess && sinDia && <AvisoAbrirDia />}
              {dia.isSuccess && !sinDia && !caja && <Aviso tono="aviso">No hay caja abierta: hasta que se abra el día no se puede cargar.</Aviso>}
              {guardar.isError && <Aviso tono="error">{detalleError(guardar.error, "No se pudo guardar.")}</Aviso>}

              <div>
                <Boton type="submit" size="lg" cargando={guardar.isPending} disabled={!listo} className="w-full">
                  {guardar.isPending ? "Guardando…" : `Guardar ${seleccion.etiqueta.toLowerCase()}`}
                </Boton>
                {!listo && falta && <p className="mt-2 text-center text-sm text-muted-foreground">{falta}</p>}
              </div>
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
