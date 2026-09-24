import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/cliente";
import { useUsuario } from "../contexto/usuario";
import { pesos } from "../util";

interface Props {
  onCargaRapida: () => void;
  onArqueo: () => void;
  onCuentaCorriente: () => void;
}

export function Inicio({ onCargaRapida, onArqueo, onCuentaCorriente }: Props) {
  const { usuario, setUsuario } = useUsuario();
  const queryClient = useQueryClient();
  const dia = useQuery({ queryKey: ["dia-actual"], queryFn: api.diaActual });
  const cajas = useQuery({ queryKey: ["cajas"], queryFn: api.cajas });

  async function cerrarSesion() {
    await api.logout();
    queryClient.clear();
    setUsuario(null);
  }

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-slate-100 px-4 pb-10 pt-6 lg:max-w-4xl">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800">{usuario?.negocio.nombre}</h1>
          <p className="text-sm text-slate-500">Hola, {usuario?.nombre}</p>
        </div>
        <button
          onClick={cerrarSesion}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 active:bg-slate-200"
        >
          Salir
        </button>
      </header>

      {dia.data && (
        <section className="mb-6 rounded-xl bg-white p-4 shadow">
          <p className="text-sm text-slate-500">
            Día {dia.data.dia.fecha} · <span className="font-medium">{dia.data.dia.estado}</span>
          </p>
          {dia.data.rendicion_pendiente && (
            <p className="mt-1 text-sm text-amber-600">Rendición pendiente</p>
          )}
          <ul className="mt-2 flex gap-4 text-sm text-slate-600">
            {dia.data.turnos.map((t) => (
              <li key={t.id}>
                {t.nombre}: {t.estado}{!t.tiene_ticket && t.estado === "abierto" ? " (sin ticket)" : ""}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {cajas.data?.map((c) => (
          <div key={c.id} className="rounded-xl bg-white p-4 shadow">
            <p className="text-sm font-medium text-slate-500">{c.nombre}</p>
            <p className="mt-1 text-2xl font-bold text-slate-800">{pesos(c.efectivo)}</p>
            <p className="text-sm text-slate-500">Boletas: {pesos(c.boletas)}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          onClick={onCargaRapida}
          className="rounded-xl bg-blue-600 p-5 text-base font-semibold text-white shadow active:bg-blue-700"
        >
          Carga rápida
        </button>
        <button
          onClick={onArqueo}
          className="rounded-xl bg-white p-5 text-base font-semibold text-slate-800 shadow active:bg-slate-200"
        >
          Arqueo
        </button>
        <button
          onClick={onCuentaCorriente}
          className="rounded-xl bg-white p-5 text-base font-semibold text-slate-800 shadow active:bg-slate-200"
        >
          Cuenta corriente
        </button>
      </section>
    </div>
  );
}
