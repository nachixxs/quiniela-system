import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/cliente";
import { useUsuario } from "../contexto/usuario";
import { pesos, type Tema } from "../util";
import { BotonTema } from "../App";

interface Props {
  onCargaRapida: () => void;
  onArqueo: () => void;
  onCuentaCorriente: () => void;
  tema: Tema;
  onTema: () => void;
}

export function Inicio({ onCargaRapida, onArqueo, onCuentaCorriente, tema, onTema }: Props) {
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
    <div className="mx-auto min-h-screen max-w-2xl bg-fondo px-4 pb-10 pt-6 lg:max-w-4xl">
      <header className="mb-6 flex items-center justify-between gap-3 rounded-[20px] bg-barra p-4">
        <div>
          <h1 className="text-lg font-semibold text-en-barra">{usuario?.negocio.nombre}</h1>
          <p className="text-sm text-en-barra/72">Hola, {usuario?.nombre}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <BotonTema tema={tema} onClick={onTema} enBarra />
          <button
            onClick={cerrarSesion}
            className="h-9 rounded-full border border-en-barra/30 px-3 text-sm text-en-barra active:bg-en-barra/10"
          >
            Salir
          </button>
        </div>
      </header>

      {dia.data && (
        <section className="mb-6 rounded-[20px] bg-tarjeta p-4">
          <p className="text-sm text-tinta-suave">
            Día {dia.data.dia.fecha} · <span className="font-semibold">{dia.data.dia.estado}</span>
          </p>
          {dia.data.rendicion_pendiente && (
            <p className="mt-1 text-sm text-aviso">Rendición pendiente</p>
          )}
          <ul className="mt-2 flex gap-4 text-sm text-tinta-suave">
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
          <div key={c.id} className="rounded-[20px] bg-tarjeta p-4">
            <p className="text-sm text-tinta-suave">{c.nombre}</p>
            <p className="mt-1 text-2xl font-semibold text-tinta">{pesos(c.efectivo)}</p>
            <p className="text-sm text-tinta-suave">Boletas: {pesos(c.boletas)}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <button
          onClick={onCargaRapida}
          className="rounded-[20px] bg-marca p-5 text-base font-semibold text-white active:bg-marca-fuerte"
        >
          Carga rápida
        </button>
        <button
          onClick={onArqueo}
          className="rounded-[20px] border border-borde bg-tarjeta p-5 text-base font-semibold text-tinta active:bg-fondo"
        >
          Arqueo
        </button>
        <button
          onClick={onCuentaCorriente}
          className="rounded-[20px] border border-borde bg-tarjeta p-5 text-base font-semibold text-tinta active:bg-fondo"
        >
          Cuenta corriente
        </button>
      </section>
    </div>
  );
}
