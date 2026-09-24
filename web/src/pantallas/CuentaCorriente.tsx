import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "../api/cliente";
import { pesos } from "../util";

export function CuentaCorriente({ onVolver }: { onVolver: () => void }) {
  const [orden, setOrden] = useState<"monto" | "antiguedad">("monto");
  const [clienteId, setClienteId] = useState<number | null>(null);
  const [monto, setMonto] = useState("");
  const [refCliente, setRefCliente] = useState(() => crypto.randomUUID());
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
      setRefCliente(crypto.randomUUID());
      setMonto("");
      queryClient.invalidateQueries({ queryKey: ["deudores"] });
      queryClient.invalidateQueries({ queryKey: ["cliente", clienteId] });
    },
  });

  return (
    <div className="mx-auto min-h-screen max-w-4xl bg-slate-100 px-4 pb-10 pt-6">
      <button onClick={onVolver} className="mb-4 text-sm text-slate-500">← Inicio</button>
      <h1 className="mb-4 text-lg font-bold text-slate-800">Cuenta corriente</h1>

      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setOrden("monto")}
          className={`rounded-lg px-3 py-2 text-sm ${orden === "monto" ? "bg-blue-600 text-white" : "bg-white text-slate-600"}`}
        >
          Por monto
        </button>
        <button
          onClick={() => setOrden("antiguedad")}
          className={`rounded-lg px-3 py-2 text-sm ${orden === "antiguedad" ? "bg-blue-600 text-white" : "bg-white text-slate-600"}`}
        >
          Por antigüedad
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <table className="w-full rounded-xl bg-white text-sm shadow">
          <thead>
            <tr className="border-b text-left text-slate-500">
              <th className="p-3">Cliente</th>
              <th className="p-3">Saldo</th>
              <th className="hidden p-3 md:table-cell">Días</th>
            </tr>
          </thead>
          <tbody>
            {deudores.data?.map((d) => (
              <tr
                key={d.id}
                onClick={() => setClienteId(d.id)}
                className={`cursor-pointer border-b active:bg-slate-100 ${clienteId === d.id ? "bg-blue-50" : ""}`}
              >
                <td className="p-3">{d.nombre}</td>
                <td className={`p-3 ${d.saldo < 0 ? "text-green-600" : "text-slate-800"}`}>{pesos(d.saldo)}</td>
                <td className="hidden p-3 md:table-cell">{d.dias_deuda_mas_vieja}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {detalle.data && (
          <div className="rounded-xl bg-white p-4 shadow">
            <h2 className="text-base font-bold text-slate-800">{detalle.data.nombre}</h2>
            <p className={`mb-3 text-2xl font-bold ${detalle.data.saldo < 0 ? "text-green-600" : "text-slate-800"}`}>
              {pesos(detalle.data.saldo)}{detalle.data.saldo < 0 ? " (a favor)" : ""}
            </p>
            <ul className="mb-4 max-h-40 overflow-auto text-sm text-slate-600">
              {detalle.data.movimientos.map((m) => (
                <li key={m.id} className="border-b py-1">{m.tipo}: {pesos(m.monto)}</li>
              ))}
            </ul>

            {detalle.data.saldo > 0 && (
              <>
                <label className="mb-2 block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">Cobrar</span>
                  <input
                    type="number" inputMode="numeric"
                    className="w-full rounded-lg border border-slate-300 px-4 py-3 text-xl"
                    value={monto} onChange={(e) => setMonto(e.target.value)}
                  />
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMonto(String(detalle.data!.saldo))}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600"
                  >
                    Todo ({pesos(detalle.data.saldo)})
                  </button>
                  <button
                    onClick={() => cobrar.mutate()}
                    disabled={cobrar.isPending || !monto || !cajaChica}
                    className="flex-1 rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {cobrar.isPending ? "Cobrando..." : "Cobrar"}
                  </button>
                </div>
              </>
            )}
            {cobrar.isError && (
              <p className="mt-2 text-sm text-red-600">
                {cobrar.error instanceof ApiError ? cobrar.error.detalle : "No se pudo cobrar."}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
