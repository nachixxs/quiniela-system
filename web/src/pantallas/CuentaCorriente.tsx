import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AnimatePresence } from "motion/react";
import { ChevronRight, Clock, MousePointerClick } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "../api/cliente";
import { esSinDia } from "../api/tipos";
import { DIAS_VENCIDO, fechaCorta, pesos, useEscritorio, uuid } from "../util";
import { Aviso, Boton, CampoMonto, Hoja, Reintentar, Segmentado, TARJETA, TIPOS } from "../ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Saldo, movimientos que lo componen y cobro total o parcial de un cliente.
function Detalle({ clienteId }: { clienteId: number }) {
  const [monto, setMonto] = useState("");
  const [refCliente, setRefCliente] = useState(() => uuid());
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
      toast.success(`Cobrado: ${pesos(mov.monto)} · ${detalle.data?.nombre}`);
    },
  });

  if (detalle.isLoading) return <div className="esqueleto h-72" />;
  if (detalle.isError || !detalle.data) return <Aviso tono="error" accion={<Reintentar onClick={() => detalle.refetch()} />}>No se pudo traer el cliente.</Aviso>;
  const c = detalle.data;
  const aFavor = c.saldo < 0;
  const motivo = dia.isLoading ? "" : sinDia ? "Falta abrir el día para cobrar." : !cajaChica ? "Falta una caja chica abierta para cobrar." : !Number(monto) ? "Ingresá cuánto cobrás." : "";

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className={`rotulo ${aFavor ? "text-exito" : c.saldo > 0 ? "text-peligro" : "text-muted-foreground"}`}>{aFavor ? "A favor" : "Deuda"}</p>
        <p className={`monto mt-1 text-3xl font-semibold ${aFavor ? "text-exito" : ""}`}>{pesos(Math.abs(c.saldo))}</p>
      </div>

      {c.saldo > 0 && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!motivo) cobrar.mutate();
          }}
          className="flex flex-col gap-3"
        >
          <CampoMonto etiqueta="Cobrar" valor={monto} onValor={(v) => { setMonto(v); setRefCliente(uuid()); }} enterKeyHint="done" />
          <div className="flex gap-2">
            <Boton type="button" variante="secundario" onClick={() => { setMonto(String(c.saldo)); setRefCliente(uuid()); }} className="shrink-0">
              <span>Todo (<span className="monto">{pesos(c.saldo)}</span>)</span>
            </Boton>
            <Boton type="submit" cargando={cobrar.isPending} disabled={!!motivo || dia.isLoading} className="flex-1">
              {cobrar.isPending ? "Cobrando…" : "Cobrar"}
            </Boton>
          </div>
          <p aria-live="polite" className="text-sm text-muted-foreground empty:hidden">{motivo}</p>
        </form>
      )}
      {cobrar.isError && <Aviso tono="error">{cobrar.error instanceof ApiError ? cobrar.error.detalle : "No se pudo cobrar."}</Aviso>}

      <div>
        <h3 className="border-b pb-2 text-sm font-medium">Movimientos</h3>
        {c.movimientos.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Este cliente todavía no tiene movimientos.</p>}
        <ul className="divide-y">
          {c.movimientos.map((mov) => {
            const t = TIPOS[mov.tipo];
            const contra = mov.anula_id !== null;
            // Fiado suma deuda (sale plata del cliente a la cuenta); el cobro la baja. Una anulación va sin signo.
            const signo = contra ? null : mov.tipo === "fiado" ? ["−", "text-peligro"] : mov.tipo === "cobro_fiado" ? ["+", "text-exito"] : null;
            return (
              <li key={mov.id} className="flex min-h-14 items-center gap-3 py-2.5">
                <t.icono className={`size-4 shrink-0 ${t.tono}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{contra ? `Anulación · ${t.etiqueta}` : t.etiqueta}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {fechaCorta(mov.corresponde_a_fecha)}{mov.nota ? ` · ${mov.nota}` : ""}
                  </span>
                </span>
                <span className={`monto text-sm font-medium ${signo?.[1] ?? ""}`}>{signo?.[0]}{pesos(mov.monto)}</span>
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
        <section className={`${TARJETA} mt-4 overflow-hidden`} aria-labelledby="deben">
          <div className="flex items-baseline justify-between gap-3 px-4 pb-2 pt-4 lg:px-5 lg:pt-5">
            <h2 id="deben" className="font-medium">Deben</h2>
            {deudores.data && deudores.data.length > 0 && (
              <span className="text-sm text-muted-foreground">{deudores.data.length} {deudores.data.length === 1 ? "cliente" : "clientes"}</span>
            )}
          </div>
          {deudores.isLoading && [0, 1, 2].map((i) => <div key={i} className="esqueleto m-3 h-10" />)}
          {deudores.isError && (
            <div className="p-4">
              <Aviso tono="error" accion={<Reintentar onClick={() => deudores.refetch()} />}>No se pudieron traer los deudores.</Aviso>
            </div>
          )}
          {deudores.data?.length === 0 && (
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center text-sm text-muted-foreground">
              Nadie debe nada. Cuando cargues un fiado, el cliente aparece acá.
              <Button asChild variant="outline"><a href="#carga-rapida">Cargar un fiado</a></Button>
            </div>
          )}
          {!!deudores.data?.length && (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="pl-4 text-xs text-muted-foreground lg:pl-5">Cliente</TableHead>
                  <TableHead className="text-right text-xs text-muted-foreground">Días</TableHead>
                  <TableHead className="pr-4 text-right text-xs text-muted-foreground lg:pr-5">Saldo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deudores.data.map((d) => {
                  const vencido = d.dias_deuda_mas_vieja >= DIAS_VENCIDO;
                  return (
                    <TableRow key={d.id} onClick={() => setClienteId(d.id)} className={`cursor-pointer active:bg-muted ${d.id === clienteId ? "bg-muted/60" : ""}`}>
                      <TableCell className="min-h-14 whitespace-normal py-2 pl-4 lg:pl-5">
                        <button type="button" aria-pressed={d.id === clienteId} className="block min-h-9 w-full text-left text-sm font-medium break-words">{d.nombre}</button>
                        {vencido && <Badge variant="peligro" className="mt-1">Vencido</Badge>}
                      </TableCell>
                      <TableCell className={`monto text-right text-sm ${vencido ? "text-peligro" : "text-muted-foreground"}`}>
                        <span className="inline-flex items-center gap-1">
                          {vencido && <Clock className="size-4" aria-hidden />}
                          {d.dias_deuda_mas_vieja === 0 ? "Hoy" : d.dias_deuda_mas_vieja}
                        </span>
                      </TableCell>
                      <TableCell className="pr-4 lg:pr-5">
                        <span className="flex items-center justify-end gap-1">
                          <span className="monto text-sm font-medium">{pesos(d.saldo)}</span>
                          <ChevronRight className="-mr-1.5 size-4 shrink-0 text-muted-foreground lg:hidden" aria-hidden />
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </section>
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
              <h2 className="mb-4 text-base font-semibold tracking-tight break-words">{elegido?.nombre}</h2>
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
