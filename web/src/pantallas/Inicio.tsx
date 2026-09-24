import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Archive, Calculator, ChevronRight, Clock, Landmark, Moon, Store, Sunrise, Ticket } from "lucide-react";
import { api } from "../api/cliente";
import { useUsuario } from "../contexto/usuario";
import { fechaLarga, pesos } from "../util";
import { AVATAR, Aviso } from "../ui";
import { BOTONES, Carga, type BotonCarga } from "./CargaRapida";

const TARJETA = "rounded-3xl bg-superficie p-2 shadow-tarjeta";
const Reintentar = ({ onClick }: { onClick: () => void }) => (
  <button type="button" onClick={onClick} className="presiona -my-2 h-11 rounded-full px-3 font-semibold underline underline-offset-4">
    Reintentar
  </button>
);

// Una fila de estado: ícono, qué es, detalle y a la derecha la etiqueta del estado.
function Fila({ icono, titulo, detalle, estado, href }: { icono: ReactNode; titulo: string; detalle?: string; estado?: ReactNode; href?: string }) {
  const Etiqueta = href ? "a" : "div";
  return (
    <Etiqueta href={href} className={`flex min-h-16 items-center gap-3 rounded-2xl px-3 py-2 ${href ? "presiona hover:bg-superficie-2" : ""}`}>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-superficie-2 text-tinta-suave">{icono}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{titulo}</span>
        {detalle && <span className="block text-sm text-tinta-suave">{detalle}</span>}
      </span>
      {estado}
      {href && <ChevronRight className="size-5 text-tinta-suave" aria-hidden />}
    </Etiqueta>
  );
}

const Chip = ({ tono, vivo, children }: { tono: string; vivo?: boolean; children: ReactNode }) => (
  <span className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-xs font-semibold ${tono}`}>
    {vivo && <span className="vivo size-1.5 rounded-full bg-current" aria-hidden />}
    {children}
  </span>
);

export function Inicio() {
  const { usuario } = useUsuario();
  const [seleccion, setSeleccion] = useState<BotonCarga | null>(null);
  const dia = useQuery({ queryKey: ["dia-actual"], queryFn: api.diaActual });
  const cajas = useQuery({ queryKey: ["cajas"], queryFn: api.cajas });
  const deudores = useQuery({ queryKey: ["deudores", "monto"], queryFn: () => api.deudores("monto") });
  const conDeuda = deudores.data?.filter((d) => d.saldo > 0).slice(0, 3);

  return (
    <div>
      {/* El tablero: la noche con las cajas del día y los accesos de carga. */}
      <section className="sobre-noche bg-noche px-4 pb-12 pt-3 text-en-noche lg:rounded-3xl lg:p-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">Hola, {usuario?.nombre}</h1>
          <div className="mt-1.5 flex min-h-6 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-en-noche-suave">
            {dia.isLoading && <span className="esqueleto h-5 w-48 bg-white/10!" />}
            {dia.data && (
              <>
                <span className="first-letter:uppercase">{fechaLarga(dia.data.dia.fecha)}</span>
                <Chip tono="bg-white/10 text-en-noche" vivo={dia.data.dia.estado === "abierto"}>
                  Día {dia.data.dia.estado}
                </Chip>
              </>
            )}
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-2 lg:gap-4">
            {cajas.isLoading && [0, 1].map((i) => <div key={i} className="esqueleto h-[104px] rounded-2xl bg-white/10!" />)}
            {cajas.data?.map((c) => {
              const Icono = c.tipo === "operativa" ? Store : Landmark;
              return (
                <div key={c.id} className="rounded-2xl bg-noche-2 p-4 lg:p-5">
                  <div className="flex items-center gap-2 text-sm font-medium text-en-noche-suave">
                    <Icono className="size-4" aria-hidden />
                    {c.nombre}
                  </div>
                  <div className="mt-2 flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[32px] font-semibold leading-none tracking-tight lg:text-4xl">{pesos(c.efectivo)}</p>
                      <p className="mt-1.5 text-xs text-en-noche-suave">Efectivo</p>
                    </div>
                    <div className="text-right">
                      <p className="flex items-center justify-end gap-1.5 font-semibold">
                        <Ticket className="size-4 text-estrella" aria-hidden />
                        {pesos(c.boletas)}
                      </p>
                      <p className="mt-1.5 text-xs text-en-noche-suave">Boletas</p>
                    </div>
                  </div>
                  {c.esperado && (
                    <p className="mt-3 border-t border-white/10 pt-2.5 text-xs text-en-noche-suave">
                      Esperado: {pesos(c.esperado.efectivo)} en efectivo y {pesos(c.esperado.boletas)} en boletas
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {cajas.isError && (
            <div className="mt-3">
              <Aviso tono="error" accion={<Reintentar onClick={() => cajas.refetch()} />}>No se pudieron traer las cajas.</Aviso>
            </div>
          )}

          <div className="mt-6 grid grid-cols-4 gap-2 lg:max-w-md">
            {BOTONES.map((b) => (
              <button key={b.etiqueta} type="button" onClick={() => setSeleccion(b)} className="presiona group flex flex-col items-center gap-2 text-sm font-medium">
                <span className="grid size-14 place-items-center rounded-full bg-estrella text-en-estrella transition-colors group-hover:bg-estrella-fuerte">
                  <b.icono className="size-6" aria-hidden />
                </span>
                {b.etiqueta}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="relative -mt-6 grid gap-4 rounded-t-3xl bg-lienzo px-4 pt-5 lg:mt-6 lg:grid-cols-2 lg:rounded-none lg:px-0 lg:pt-0">
        <section className={TARJETA} aria-labelledby="estado-dia">
          <h2 id="estado-dia" className="px-3 pb-1 pt-3 font-semibold">Estado del día</h2>
          {dia.isLoading && <div className="esqueleto m-2 h-40" />}
          {dia.isError && (
            <div className="p-2">
              <Aviso tono="error" accion={<Reintentar onClick={() => dia.refetch()} />}>No se pudo traer el día.</Aviso>
            </div>
          )}
          {dia.data?.turnos.map((t) => (
            <Fila
              key={t.id}
              icono={t.nombre === "mañana" ? <Sunrise className="size-5" /> : t.nombre === "noche" ? <Moon className="size-5" /> : <Clock className="size-5" />}
              titulo={`Turno ${t.nombre}`}
              detalle={t.tiene_ticket ? "Ticket cargado" : "Sin ticket"}
              estado={t.estado === "abierto" ? <Chip tono="bg-exito-suave text-exito" vivo>Abierto</Chip> : <Chip tono="bg-superficie-2 text-tinta-suave">Cerrado</Chip>}
            />
          ))}
          {dia.data?.rendicion_pendiente && (
            <Fila icono={<Archive className="size-5" />} titulo="Rendición" detalle="Boletas de ayer para contar y archivar" estado={<Chip tono="bg-aviso-suave text-aviso">Pendiente</Chip>} />
          )}
          {dia.data?.arqueos_pendientes.map((a) => (
            <Fila
              key={a}
              href="#arqueo"
              icono={<Calculator className="size-5" />}
              titulo={`Arqueo ${a.replace(/_/g, " ")}`}
              estado={<Chip tono="bg-aviso-suave text-aviso">Pendiente</Chip>}
            />
          ))}
        </section>

        <section className={TARJETA} aria-labelledby="fiados">
          <h2 id="fiados" className="px-3 pb-1 pt-3 font-semibold">Fiados</h2>
          {deudores.isLoading && <div className="esqueleto m-2 h-40" />}
          {deudores.isError && (
            <div className="p-2">
              <Aviso tono="error" accion={<Reintentar onClick={() => deudores.refetch()} />}>No se pudieron traer los fiados.</Aviso>
            </div>
          )}
          {conDeuda?.length === 0 && <p className="px-3 py-4 text-sm text-tinta-suave">Nadie debe nada. Los fiados que cargues aparecen acá.</p>}
          {conDeuda?.map((d) => (
            <div key={d.id} className="flex min-h-16 items-center gap-3 px-3 py-2">
              <span className={AVATAR} aria-hidden>{d.nombre.charAt(0)}</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{d.nombre}</span>
                <span className="block text-sm text-tinta-suave">{d.dias_deuda_mas_vieja === 0 ? "Desde hoy" : `Hace ${d.dias_deuda_mas_vieja} ${d.dias_deuda_mas_vieja === 1 ? "día" : "días"}`}</span>
              </span>
              <span className="font-semibold">{pesos(d.saldo)}</span>
            </div>
          ))}
          <a href="#cuenta-corriente" className="presiona mt-1 flex h-12 items-center justify-center gap-1 rounded-2xl text-sm font-semibold hover:bg-superficie-2">
            Ver cuenta corriente
            <ChevronRight className="size-4" aria-hidden />
          </a>
        </section>
      </div>

      <Carga seleccion={seleccion} onSeleccion={setSeleccion} />
    </div>
  );
}
