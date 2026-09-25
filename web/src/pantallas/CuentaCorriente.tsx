import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "motion/react";
import { BookUser, ChevronRight } from "lucide-react";
import { api, ApiError } from "../api/cliente";
import { fechaCorta, pesos, useEscritorio, uuid } from "../util";
import { AVATAR, Aviso, Boton, CampoMonto, Hoja, Segmentado, TIPOS } from "../ui";

// Saldo, movimientos que lo componen y cobro total o parcial de un cliente.
function Detalle({ clienteId }: { clienteId: number }) {
  const [monto, setMonto] = useState("");
  const [refCliente, setRefCliente] = useState(() => uuid());
  const [cobrado, setCobrado] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const dia = useQuery({ queryKey: ["dia-actual"], queryFn: api.diaActual });
  const cajaChica = dia.data?.cajas.find((c) => c.tipo === "operativa");
  const detalle = useQuery({ queryKey: ["cliente", clienteId], queryFn: () => api.cliente(clienteId) });

  const cobrar = useMutation({
    mutationFn: () => {
      if (!cajaChica) throw new ApiError("sin_caja", "No hay caja chica abierta.");
      return api.crearMovimiento({
        ref_cliente: refCliente, tipo: "cobro_fiado", monto: Number(monto),
        caja_id: cajaChica.id, cliente_id: clienteId,
      });
    },
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

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm font-medium text-tinta-suave">{c.saldo < 0 ? "Saldo a favor" : "Debe"}</p>
        <p className={`text-4xl font-semibold tracking-tight ${c.saldo < 0 ? "text-exito" : ""}`}>{pesos(Math.abs(c.saldo))}</p>
      </div>

      {c.saldo > 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (Number(monto) > 0 && cajaChica) cobrar.mutate();
          }}
          className="flex flex-col gap-3"
        >
          <CampoMonto etiqueta="Cobrar" valor={monto} onValor={(v) => { setMonto(v); setCobrado(null); setRefCliente(uuid()); }} enterKeyHint="done" />
          <div className="flex gap-2">
            <Boton type="button" variante="secundario" onClick={() => { setMonto(String(c.saldo)); setRefCliente(uuid()); }} className="shrink-0">
              Todo ({pesos(c.saldo)})
            </Boton>
            <Boton type="submit" cargando={cobrar.isPending} disabled={!Number(monto) || !cajaChica} className="flex-1">
              {cobrar.isPending ? "Cobrando…" : "Cobrar"}
            </Boton>
          </div>
        </form>
      )}
      {dia.isSuccess && !cajaChica && c.saldo > 0 && <Aviso tono="aviso">No hay caja chica abierta: hasta que se abra el día no se puede cobrar.</Aviso>}
      {cobrar.isError && <Aviso tono="error">{cobrar.error instanceof ApiError ? cobrar.error.detalle : "No se pudo cobrar."}</Aviso>}
      {cobrado !== null && <Aviso tono="exito">Cobro guardado: {pesos(cobrado)}.</Aviso>}

      <div>
        <h3 className="mb-1 text-sm font-medium text-tinta-suave">Movimientos</h3>
        <ul>
          {c.movimientos.map((mov) => {
            const t = TIPOS[mov.tipo];
            return (
              <li key={mov.id} className="flex min-h-14 items-center gap-3 py-2">
                <span className={`grid size-10 shrink-0 place-items-center rounded-full ${t.tono}`}>
                  <t.icono className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{t.etiqueta}</span>
                  <span className="block truncate text-sm text-tinta-suave">
                    {fechaCorta(mov.corresponde_a_fecha)}{mov.nota ? ` · ${mov.nota}` : ""}
                  </span>
                </span>
                <span className="font-semibold">{pesos(mov.monto)}</span>
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
    <div className="px-4 pt-5 lg:grid lg:grid-cols-[1fr_24rem] lg:items-start lg:gap-8 lg:px-0 lg:pt-0">
      <div>
        <Segmentado
          etiqueta="Ordenar deudores"
          valor={orden}
          onCambio={setOrden}
          opciones={[{ valor: "monto", texto: "Por monto" }, { valor: "antiguedad", texto: "Por antigüedad" }]}
        />
        <div className="mt-4 rounded-2xl bg-superficie p-2 shadow-tarjeta">
          <div className="grid grid-cols-[1fr_3.5rem_6rem] gap-2 px-3 pb-1 pt-2 text-xs font-medium text-tinta-suave" aria-hidden>
            <span>Cliente</span>
            <span className="text-right">Días</span>
            <span className="text-right">Saldo</span>
          </div>
          {deudores.isLoading && [0, 1, 2].map((i) => <div key={i} className="esqueleto m-1 h-14" />)}
          {deudores.isError && <Aviso tono="error">No se pudieron traer los deudores.</Aviso>}
          {deudores.data?.length === 0 && (
            <p className="flex flex-col items-center gap-2 px-6 py-10 text-center text-sm text-tinta-suave">
              <BookUser className="size-8" aria-hidden />
              Sin cuentas pendientes. Cuando cargues un fiado, el cliente aparece acá.
            </p>
          )}
          <ul>
            {deudores.data?.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => setClienteId(d.id)}
                  aria-current={d.id === clienteId || undefined}
                  className={`presiona grid min-h-16 w-full grid-cols-[1fr_3.5rem_6rem] items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-superficie-2 ${d.id === clienteId ? "bg-acento/8" : ""}`}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className={`${AVATAR} max-sm:hidden`} aria-hidden>{d.nombre.charAt(0)}</span>
                    <span className="truncate font-medium">{d.nombre}</span>
                  </span>
                  <span className="text-right text-sm text-tinta-suave">
                    {d.dias_deuda_mas_vieja === 0 ? "Hoy" : `${d.dias_deuda_mas_vieja} ${d.dias_deuda_mas_vieja === 1 ? "día" : "días"}`}
                  </span>
                  <span className={`text-right font-semibold ${d.saldo < 0 ? "text-exito" : ""}`}>
                    {pesos(Math.abs(d.saldo))}
                    {d.saldo < 0 && <span className="block text-xs font-medium">a favor</span>}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {escritorio ? (
        <aside className="sticky top-10 rounded-2xl bg-superficie p-6 shadow-tarjeta">
          {clienteId === null ? (
            <p className="flex items-center gap-2 py-8 text-sm text-tinta-suave">
              <ChevronRight className="size-4 rotate-180" aria-hidden />
              Elegí un cliente para ver su cuenta y cobrarle.
            </p>
          ) : (
            <>
              <h2 className="mb-4 text-lg font-semibold tracking-tight">{elegido?.nombre}</h2>
              <Detalle key={clienteId} clienteId={clienteId} />
            </>
          )}
        </aside>
      ) : (
        <AnimatePresence>
          {clienteId !== null && (
            <Hoja key="detalle" titulo={elegido?.nombre ?? "Cliente"} onCerrar={() => setClienteId(null)}>
              <Detalle clienteId={clienteId} />
            </Hoja>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
