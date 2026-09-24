import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api, ApiError } from "../api/cliente";
import type { ClienteBusqueda, MovimientoCrear } from "../api/tipos";
import { uuid, type Tema } from "../util";
import { BotonPrimario, Encabezado } from "../ui";

// D18: Pago no es un solo tipo, es todo lo que no entró o salió de la caja.
const OPCIONES_PAGO: { etiqueta: string; tipo: MovimientoCrear["tipo"] }[] = [
  { etiqueta: "MP / transferencia", tipo: "cobro_mercado_pago" },
  { etiqueta: "Retiro del dueño", tipo: "retiro_dueno" },
  { etiqueta: "Gasto", tipo: "gasto" },
];

const BOTONES: { etiqueta: string; tipo: MovimientoCrear["tipo"] | null; requiereCliente: boolean }[] = [
  { etiqueta: "Fiado", tipo: "fiado", requiereCliente: true },
  { etiqueta: "Cobro", tipo: "cobro_fiado", requiereCliente: true },
  { etiqueta: "Pago", tipo: null, requiereCliente: false },
  { etiqueta: "Premio", tipo: "pago_premio", requiereCliente: false },
];

export function CargaRapida({ onVolver, tema, onTema }: { onVolver: () => void; tema: Tema; onTema: () => void }) {
  const [seleccion, setSeleccion] = useState<(typeof BOTONES)[number] | null>(null);
  const [monto, setMonto] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [cliente, setCliente] = useState<ClienteBusqueda | null>(null);
  const [refCliente, setRefCliente] = useState(() => uuid());
  const [confirmacion, setConfirmacion] = useState("");
  const [tipoPago, setTipoPago] = useState(OPCIONES_PAGO[0].tipo);

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
        ref_cliente: refCliente, tipo: seleccion!.tipo ?? tipoPago, monto: Number(monto),
        caja_id: cajaChica.id, cliente_id: cliente?.id ?? null,
      };
      return api.crearMovimiento(m);
    },
    onSuccess: (mov) => {
      setConfirmacion(`Guardado: ${seleccion?.etiqueta} $${mov.monto.toLocaleString("es-AR")}`);
      setRefCliente(uuid());
      setSeleccion(null);
      setMonto("");
      setBusqueda("");
      setCliente(null);
    },
  });

  if (!seleccion) {
    return (
      <div className="entrada mx-auto min-h-screen max-w-md bg-fondo px-4 pb-10 pt-6 lg:max-w-lg">
        <Encabezado etiqueta="Inicio" onVolver={onVolver} tema={tema} onTema={onTema} />
        <h1 className="mb-1 text-lg font-semibold tracking-tight text-tinta">Carga rápida</h1>
        <p className="mb-4 text-sm text-tinta-suave">
          Las ventas en efectivo no se cargan acá: salen del ticket al cierre.
        </p>
        {confirmacion && (
          <p className="aparicion mb-4 rounded-xl bg-exito/10 p-3 text-sm text-exito">{confirmacion}</p>
        )}
        <div className="grid grid-cols-2 gap-4">
          {BOTONES.map((b) => (
            <button
              key={b.etiqueta}
              onClick={() => { setConfirmacion(""); setSeleccion(b); }}
              disabled={!cajaChica}
              className="presiona rounded-[20px] border border-borde bg-tarjeta p-8 text-lg font-semibold text-tinta transition-colors hover:bg-fondo active:bg-fondo disabled:opacity-50"
            >
              {b.etiqueta}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="entrada mx-auto min-h-screen max-w-md bg-fondo px-4 pb-10 pt-6 lg:max-w-lg">
      <Encabezado etiqueta="Volver" onVolver={() => setSeleccion(null)} tema={tema} onTema={onTema} />
      <h1 className="mb-4 text-lg font-semibold tracking-tight text-tinta">{seleccion.etiqueta}</h1>

      {seleccion.tipo === null && (
        <div className="mb-4 flex flex-col gap-2">
          {OPCIONES_PAGO.map((o) => (
            <button
              key={o.tipo}
              onClick={() => setTipoPago(o.tipo)}
              className={`rounded-xl border px-4 py-3 text-left text-base transition-colors ${
                tipoPago === o.tipo ? "border-marca bg-marca/10 font-semibold text-marca" : "border-borde text-tinta hover:bg-fondo"
              }`}
            >
              {o.etiqueta}
            </button>
          ))}
        </div>
      )}

      <label className="mb-4 block">
        <span className="mb-1 block text-sm text-tinta-suave">Monto</span>
        <input
          type="number" inputMode="numeric" autoFocus
          className="h-14 w-full rounded-xl border border-borde bg-tarjeta px-4 text-2xl text-tinta transition-colors"
          value={monto} onChange={(e) => setMonto(e.target.value)}
        />
      </label>

      {seleccion.requiereCliente && (
        <div className="relative mb-4">
          <span className="mb-1 block text-sm text-tinta-suave">Cliente</span>
          <input
            className="h-14 w-full rounded-xl border border-borde bg-tarjeta px-4 text-base text-tinta transition-colors"
            value={cliente ? cliente.nombre : busqueda}
            onChange={(e) => { setCliente(null); setBusqueda(e.target.value); }}
            placeholder="Buscar por nombre..."
          />
          {!cliente && !!clientes.data?.length && (
            <ul className="aparicion origin-top absolute z-10 mt-1 w-full rounded-xl border border-borde bg-tarjeta">
              {clientes.data.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => { setCliente(c); setBusqueda(""); }}
                    className="block w-full px-4 py-3 text-left text-tinta transition-colors hover:bg-fondo active:bg-fondo"
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
        <p className="aparicion mb-4 text-sm text-peligro">
          {guardar.error instanceof ApiError ? guardar.error.detalle : "No se pudo guardar."}
        </p>
      )}

      <BotonPrimario
        onClick={() => guardar.mutate()}
        disabled={guardar.isPending || !monto || (seleccion.requiereCliente && !cliente)}
        className="w-full text-lg"
      >
        {guardar.isPending ? "Guardando..." : "Guardar"}
      </BotonPrimario>
    </div>
  );
}
