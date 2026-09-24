import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../api/cliente";
import { pesos, uuid, type Tema } from "../util";
import { BotonTema } from "../App";

export function CuentaCorriente({ onVolver, tema, onTema }: { onVolver: () => void; tema: Tema; onTema: () => void }) {
  const [orden, setOrden] = useState<"monto" | "antiguedad">("monto");
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [monto, setMonto] = useState("");
  const [refCliente, setRefCliente] = useState(() => uuid());
  const queryClient = useQueryClient();

  const dia = useQuery({ queryKey: ["dia-actual"], queryFn: api.diaActual });
  const cajaChica = dia.data?.cajas.find((c) => c.tipo === "operativa");
  const deudores = useQuery({ queryKey: ["deudores", orden], queryFn: () => api.deudores(orden) });
  const detalle = useQuery({
    queryKey: ["cliente", clienteId],
    queryFn: () => api.cliente(clienteId!),
    enabled: clienteId !== null,
  });

  const cobrar = useMutation({
    mutationFn: () => {
      if (!cajaChica) throw new ApiError("sin_caja", "No hay caja chica abierta.");
      return api.crearMovimiento({
        ref_cliente: refCliente, tipo: "cobro_fiado", monto: Number(monto),
        caja_id: cajaChica.id, cliente_id: clienteId!,
      });
    },
    onSuccess: () => {
      setRefCliente(uuid());
      setMonto("");
      queryClient.invalidateQueries({ queryKey: ["deudores"] });
      queryClient.invalidateQueries({ queryKey: ["cliente", clienteId] });
    },
  });

  return (
    <div className="mx-auto min-h-screen max-w-4xl bg-fondo px-4 pb-10 pt-6">
      <div className="mb-4 flex items-center justify-between">
        <button onClick={onVolver} className="text-sm text-tinta-suave">← Inicio</button>
        <BotonTema tema={tema} onClick={onTema} />
      </div>
      <h1 className="mb-4 text-lg font-semibold text-tinta">Cuenta corriente</h1>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setOrden("monto")}
          className={`h-9 rounded-full px-3 text-sm ${orden === "monto" ? "bg-marca text-white" : "border border-borde text-tinta-suave"}`}
        >
          Por monto
        </button>
        <button
          onClick={() => setOrden("antiguedad")}
          className={`h-9 rounded-full px-3 text-sm ${orden === "antiguedad" ? "bg-marca text-white" : "border border-borde text-tinta-suave"}`}
        >
          Por antigüedad
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <table className="w-full overflow-hidden rounded-[20px] bg-tarjeta text-sm">
          <thead>
            <tr className="border-b border-borde text-left text-tinta-suave">
              <th className="p-3">Cliente</th>
              <th className="p-3">Saldo</th>
              <th className="p-3">Días</th>
            </tr>
          </thead>
          <tbody>
            {deudores.data?.map((d) => (
              <tr
                key={d.id}
                onClick={() => setClienteId(d.id)}
                className={`cursor-pointer border-b border-borde active:bg-fondo ${clienteId === d.id ? "bg-marca/10" : ""}`}
              >
                <td className="p-3 text-tinta">{d.nombre}</td>
                <td className={`p-3 ${d.saldo < 0 ? "text-exito" : "text-tinta"}`}>{pesos(d.saldo)}</td>
                <td className="p-3 text-tinta">{d.dias_deuda_mas_vieja}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {detalle.data && (
          <div className="rounded-[20px] bg-tarjeta p-4">
            <h2 className="text-base font-semibold text-tinta">{detalle.data.nombre}</h2>
            <p className={`mb-3 text-2xl font-semibold ${detalle.data.saldo < 0 ? "text-exito" : "text-tinta"}`}>
              {pesos(detalle.data.saldo)}{detalle.data.saldo < 0 ? " (a favor)" : ""}
            </p>
            <ul className="mb-4 max-h-40 overflow-auto text-sm text-tinta-suave">
              {detalle.data.movimientos.map((m) => (
                <li key={m.id} className="border-b border-borde py-1">{m.tipo}: {pesos(m.monto)}</li>
              ))}
            </ul>

            {detalle.data.saldo > 0 && (
              <>
                <label className="mb-2 block">
                  <span className="mb-1 block text-sm text-tinta-suave">Cobrar</span>
                  <input
                    type="number" inputMode="numeric"
                    className="h-14 w-full rounded-xl border border-borde bg-fondo px-4 text-xl text-tinta"
                    value={monto} onChange={(e) => setMonto(e.target.value)}
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMonto(String(detalle.data!.saldo))}
                    className="h-9 rounded-full border border-borde px-3 text-sm text-tinta-suave"
                  >
                    Todo ({pesos(detalle.data.saldo)})
                  </button>
                  <button
                    onClick={() => cobrar.mutate()}
                    disabled={cobrar.isPending || !monto || !cajaChica}
                    className="h-9 flex-1 rounded-full bg-marca text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {cobrar.isPending ? "Cobrando..." : "Cobrar"}
                  </button>
                </div>
              </>
            )}
            {cobrar.isError && (
              <p className="mt-2 text-sm text-peligro">
                {cobrar.error instanceof ApiError ? cobrar.error.detalle : "No se pudo cobrar."}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
