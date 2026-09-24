import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, ApiError } from "../api/cliente";
import type { ClienteBusqueda, MovimientoCrear } from "../api/tipos";

const TIPO_PAGO: MovimientoCrear["tipo"] = "gasto"; // pendiente: confirmar con Nacho

const BOTONES: { etiqueta: string; tipo: MovimientoCrear["tipo"]; requiereCliente: boolean }[] = [
  { etiqueta: "Fiado", tipo: "fiado", requiereCliente: true },
  { etiqueta: "Cobro", tipo: "cobro_fiado", requiereCliente: true },
  { etiqueta: "Pago", tipo: TIPO_PAGO, requiereCliente: false },
  { etiqueta: "Premio", tipo: "pago_premio", requiereCliente: false },
];

export function CargaRapida({ onVolver }: { onVolver: () => void }) {
  const [seleccion, setSeleccion] = useState<(typeof BOTONES)[number] | null>(null);
  const [monto, setMonto] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [cliente, setCliente] = useState<ClienteBusqueda | null>(null);
  const [refCliente, setRefCliente] = useState(() => crypto.randomUUID());
  const [confirmacion, setConfirmacion] = useState("");

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
      const m: MovimientoCrear = {
        ref_cliente: refCliente, tipo: seleccion!.tipo, monto: Number(monto),
        caja_id: cajaChica.id, cliente_id: cliente?.id ?? null,
      };
      return api.crearMovimiento(m);
    },
    onSuccess: (mov) => {
      setConfirmacion(`Guardado: ${seleccion?.etiqueta} $${mov.monto.toLocaleString("es-AR")}`);
      setRefCliente(crypto.randomUUID());
      setSeleccion(null);
      setMonto("");
      setBusqueda("");
      setCliente(null);
    },
  });

  if (!seleccion) {
    return (
      <div className="mx-auto min-h-screen max-w-md bg-slate-100 px-4 pb-10 pt-6 lg:max-w-lg">
        <button onClick={onVolver} className="mb-4 text-sm text-slate-500">← Inicio</button>
        <h1 className="mb-1 text-lg font-bold text-slate-800">Carga rápida</h1>
        <p className="mb-4 text-sm text-slate-500">
          Las ventas en efectivo no se cargan acá: salen del ticket al cierre.
        </p>
        {confirmacion && (
          <p className="mb-4 rounded-lg bg-green-100 p-3 text-sm text-green-700">{confirmacion}</p>
        )}
        <div className="grid grid-cols-2 gap-4">
          {BOTONES.map((b) => (
            <button
              key={b.etiqueta}
              onClick={() => { setConfirmacion(""); setSeleccion(b); }}
              disabled={!cajaChica}
              className="rounded-xl bg-white p-8 text-lg font-semibold text-slate-800 shadow active:bg-slate-200 disabled:opacity-50"
            >
              {b.etiqueta}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-100 px-4 pb-10 pt-6 lg:max-w-lg">
      <button onClick={() => setSeleccion(null)} className="mb-4 text-sm text-slate-500">← Volver</button>
      <h1 className="mb-4 text-lg font-bold text-slate-800">{seleccion.etiqueta}</h1>

      <label className="mb-4 block">
        <span className="mb-1 block text-sm font-medium text-slate-700">Monto</span>
        <input
          type="number" inputMode="numeric" autoFocus
          className="w-full rounded-lg border border-slate-300 px-4 py-3 text-2xl"
          value={monto} onChange={(e) => setMonto(e.target.value)}
        />
      </label>

      {seleccion.requiereCliente && (
        <div className="relative mb-4">
          <span className="mb-1 block text-sm font-medium text-slate-700">Cliente</span>
          <input
            className="w-full rounded-lg border border-slate-300 px-4 py-3 text-base"
            value={cliente ? cliente.nombre : busqueda}
            onChange={(e) => { setCliente(null); setBusqueda(e.target.value); }}
            placeholder="Buscar por nombre..."
          />
          {!cliente && !!clientes.data?.length && (
            <ul className="absolute z-10 mt-1 w-full rounded-lg bg-white shadow">
              {clientes.data.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => { setCliente(c); setBusqueda(""); }}
                    className="block w-full px-4 py-3 text-left active:bg-slate-100"
                  >
                    {c.nombre}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {guardar.isError && (
        <p className="mb-4 text-sm text-red-600">
          {guardar.error instanceof ApiError ? guardar.error.detalle : "No se pudo guardar."}
        </p>
      )}

      <button
        onClick={() => guardar.mutate()}
        disabled={guardar.isPending || !monto || (seleccion.requiereCliente && !cliente)}
        className="w-full rounded-lg bg-blue-600 py-4 text-lg font-semibold text-white active:bg-blue-700 disabled:opacity-60"
      >
        {guardar.isPending ? "Guardando..." : "Guardar"}
      </button>
    </div>
  );
}
