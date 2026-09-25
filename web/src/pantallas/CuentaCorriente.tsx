import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "motion/react";
import { BookUser, ChevronRight, MousePointerClick } from "lucide-react";
import { api, ApiError } from "../api/cliente";
import { esSinDia } from "../api/tipos";
import { fechaCorta, pesos, useEscritorio, uuid } from "../util";
import { Aviso, Boton, CampoMonto, Hoja, Segmentado, TARJETA, TIPOS } from "../ui";
import { AvisoAbrirDia } from "./Dia";

const COLUMNAS = "grid grid-cols-[minmax(0,1fr)_3.5rem_7rem] items-center gap-3 px-4 lg:px-5";

// Saldo, movimientos que lo componen y cobro total o parcial de un cliente.
function Detalle({ clienteId }: { clienteId: number }) {
  const [monto, setMonto] = useState("");
  const [refCliente, setRefCliente] = useState(() => uuid());
  const [cobrado, setCobrado] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const dia = useQuery({ queryKey: ["dia-actual"], queryFn: api.diaActual });
  const sinDia = dia.isError ? esSinDia(dia.error) : dia.isSuccess && dia.data.dia.estado !== "abierto";
  const cajaChica = dia.data?.cajas.find((c) => c.tipo === "operativa");
  const detalle = useQuery({ queryKey: ["cliente", clienteId], queryFn: () => api.cliente(clienteId) });

  const cobrar = useMutation({
    mutationFn: () => api.crearMovimiento({
      ref_cliente: refCliente, tipo: "cobro_fiado", monto: Number(monto),
      caja_id: cajaChica!.id, cliente_id: clienteId,
    }),
    onSuccess: (mov) => {
      setRefCliente(uuid());
      setMonto("");
      setCobrado(mov.monto);
      queryClient.invalidateQueries({ queryKey: ["deudores"] });
      queryClient.invalidateQueries({ queryKey: ["cliente", clienteId] });
    },
  });

  if (detalle.isLoading) return <div className="esqueleto h-72" />;
  if (detalle.isError || !detalle.data) return <Aviso tono="error">No se pudo traer el cliente.</Aviso>;
  const c = detalle.data;
  const aFavor = c.saldo < 0;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className={`rotulo ${aFavor ? "text-exito" : c.saldo > 0 ? "text-peligro" : "text-muted-foreground"}`}>{aFavor ? "A favor" : "Deuda"}</p>
        <p className="monto mt-1 text-3xl font-semibold">{pesos(Math.abs(c.saldo))}</p>
      </div>

      {c.saldo > 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (Number(monto) > 0 && cajaChica && !sinDia) cobrar.mutate();
          }}
          className="flex flex-col gap-3"
        >
          <CampoMonto etiqueta="Cobrar" valor={monto} onValor={(v) => { setMonto(v); setCobrado(null); setRefCliente(uuid()); }} enterKeyHint="done" />
          <div className="flex gap-2">
            <Boton type="button" variante="secundario" onClick={() => { setMonto(String(c.saldo)); setRefCliente(uuid()); }} className="shrink-0">
              <span>Todo (<span className="monto">{pesos(c.saldo)}</span>)</span>
            </Boton>
            <Boton type="submit" cargando={cobrar.isPending} disabled={!Number(monto) || !cajaChica || sinDia} className="flex-1">
              {cobrar.isPending ? "Cobrando…" : "Cobrar"}
            </Boton>
          </div>
        </form>
      )}
      {sinDia && c.saldo > 0 && <AvisoAbrirDia />}
      {!sinDia && dia.isSuccess && !cajaChica && c.saldo > 0 && <Aviso tono="aviso">No hay caja chica abierta: hasta que se abra el día no se puede cobrar.</Aviso>}
      {cobrar.isError && <Aviso tono="error">{cobrar.error instanceof ApiError ? cobrar.error.detalle : "No se pudo cobrar."}</Aviso>}
      {cobrado !== null && <Aviso tono="exito">Cobro guardado: <span className="monto">{pesos(cobrado)}</span>.</Aviso>}

      <div>
        <h3 className="rotulo border-b pb-2 text-muted-foreground">Movimientos</h3>
        <ul className="divide-y">
          {c.movimientos.map((mov) => {
            const t = TIPOS[mov.tipo];
            return (
              <li key={mov.id} className="flex min-h-14 items-center gap-3 py-2.5">
                <t.icono className={`size-4 shrink-0 ${t.tono}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{t.etiqueta}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {fechaCorta(mov.corresponde_a_fecha)}{mov.nota ? ` · ${mov.nota}` : ""}
                  </span>
                </span>
                <span className="monto text-sm font-medium">{pesos(mov.monto)}</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function CuentaCorriente() {
  const [orden, setOrden] = useState<"monto" | "antiguedad">("monto");
  const [clienteId, setClienteId] = useState<number | null>(null);
  const escritorio = useEscritorio();
  const deudores = useQuery({ queryKey: ["deudores", orden], queryFn: () => api.deudores(orden) });
  const elegido = deudores.data?.find((d) => d.id === clienteId);

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start lg:gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
      <div>
        <div className="sm:max-w-xs">
          <Segmentado
            etiqueta="Ordenar deudores"
            valor={orden}
            onCambio={setOrden}
            opciones={[{ valor: "monto", texto: "Por monto" }, { valor: "antiguedad", texto: "Por antigüedad" }]}
          />
        </div>
        <div className={`${TARJETA} mt-4 overflow-hidden`}>
          <div className={`${COLUMNAS} h-10 border-b bg-muted/50 text-xs font-medium text-muted-foreground`} aria-hidden>
            <span>Cliente</span>
            <span className="text-right">Días</span>
            <span className="text-right">Saldo</span>
          </div>
          {deudores.isLoading && [0, 1, 2].map((i) => <div key={i} className="esqueleto m-3 h-10" />)}
          {deudores.isError && <div className="p-4"><Aviso tono="error">No se pudieron traer los deudores.</Aviso></div>}
          {deudores.data?.length === 0 && (
            <p className="flex flex-col items-center gap-2 px-6 py-12 text-center text-sm text-muted-foreground">
              <BookUser className="size-6" aria-hidden />
              Sin cuentas pendientes. Cuando cargues un fiado, el cliente aparece acá.
            </p>
          )}
          <ul className="divide-y">
            {deudores.data?.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => setClienteId(d.id)}
                  aria-current={d.id === clienteId || undefined}
                  className={`${COLUMNAS} min-h-14 w-full py-2 text-left transition-colors hover:bg-muted/50 active:bg-muted ${d.id === clienteId ? "bg-muted" : ""}`}
                >
                  <span className="truncate text-sm font-medium">{d.nombre}</span>
                  <span className="monto text-right text-sm text-muted-foreground">{d.dias_deuda_mas_vieja === 0 ? "Hoy" : d.dias_deuda_mas_vieja}</span>
                  <span className="flex items-center justify-end gap-1">
                    <span className={`text-right ${d.saldo < 0 ? "text-exito" : ""}`}>
                      <span className="monto block text-sm font-medium">{pesos(Math.abs(d.saldo))}</span>
                      {d.saldo < 0 && <span className="block text-xs">a favor</span>}
                    </span>
                    <ChevronRight className="-mr-1.5 size-4 shrink-0 text-muted-foreground lg:hidden" aria-hidden />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {escritorio ? (
        <aside className={`${TARJETA} sticky top-20 p-5`}>
          {clienteId === null ? (
            <p className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
              <MousePointerClick className="size-5" aria-hidden />
              Elegí un cliente para ver su cuenta y cobrarle.
            </p>
          ) : (
            <>
              <h2 className="mb-4 truncate text-base font-semibold tracking-tight">{elegido?.nombre}</h2>
              <Detalle key={clienteId} clienteId={clienteId} />
            </>
          )}
        </aside>
      ) : (
        <AnimatePresence>
          {clienteId !== null && (
            <Hoja key="detalle" titulo={elegido?.nombre ?? "Cliente"} descripcion="Cuenta corriente" onCerrar={() => setClienteId(null)}>
              <Detalle clienteId={clienteId} />
            </Hoja>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
