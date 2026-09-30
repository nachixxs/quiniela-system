import { Component, useEffect, useState, type ReactNode } from "react";
import { flushSync } from "react-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { m } from "motion/react";
import { BookUser, Calculator, ChartColumn, CircleUser, House, LogOut, Moon, Sparkles, Star, Sun, Zap, type LucideIcon } from "lucide-react";
import { api } from "./api/cliente";
import { useUsuario } from "./contexto/usuario";
import { Login } from "./pantallas/Login";
import { Inicio } from "./pantallas/Inicio";
import { CargaRapida } from "./pantallas/CargaRapida";
import { Arqueo } from "./pantallas/Arqueo";
import { CuentaCorriente } from "./pantallas/CuentaCorriente";
import { Reportes } from "./pantallas/Reportes";
import { Asistente } from "./pantallas/Asistente";
import { type Tema, aplicarTema, fechaLarga, temaInicial } from "./util";
import { Boton, EASE_SALIDA, INSIGNIA, TARJETA, TONOS } from "./ui";

// D46: un error de render no puede dejar la app en blanco (pasó en Reportes, 4.9).
export class LimiteDeError extends Component<{ children: ReactNode }, { error: boolean }> {
  state = { error: false };
  static getDerivedStateFromError(e: unknown) { console.error(e); return { error: true }; }
  render() {
    return this.state.error ? (
      <div className="grid min-h-dvh place-items-center p-4">
        <div className={`${TARJETA} max-w-sm p-6 text-center`}>
          <h1 className="text-lg font-semibold tracking-tight">Algo falló</h1>
          <p className="mt-2 text-sm text-muted-foreground">Recargá la página. Si vuelve a pasar, avisá qué estabas haciendo.</p>
          <Boton onClick={() => location.reload()} className="mt-4 w-full">Recargar</Boton>
        </div>
      </div>
    ) : this.props.children;
  }
}

type Pantalla = "inicio" | "carga-rapida" | "arqueo" | "cuenta-corriente" | "reportes" | "asistente";
// El "?" del hash lleva parámetros (#asistente?arqueo=12); la pantalla es lo de antes.
const pantallaDeHash = (): Pantalla => {
  const h = location.hash.slice(1).split("?")[0];
  return h === "carga-rapida" || h === "arqueo" || h === "cuenta-corriente" || h === "reportes" || h === "asistente" ? h : "inicio";
};

const NAV: { id: Pantalla; texto: string; corto: string; icono: LucideIcon; detalle?: string }[] = [
  { id: "inicio", texto: "Inicio", corto: "Inicio", icono: House },
  { id: "carga-rapida", texto: "Carga rápida", corto: "Cargar", icono: Zap, detalle: "Las ventas en efectivo no se cargan acá: salen del ticket al cierre." },
  { id: "arqueo", texto: "Arqueo", corto: "Arqueo", icono: Calculator, detalle: "Contá el efectivo y las boletas de la caja. El sistema compara con lo esperado." },
  { id: "cuenta-corriente", texto: "Cuenta corriente", corto: "Fiados", icono: BookUser, detalle: "Quién debe, desde cuándo y cuánto. Cobros totales o parciales." },
  { id: "reportes", texto: "Reportes", corto: "Reportes", icono: ChartColumn, detalle: "El cierre del mes: ventas, entradas, salidas, fiados y arqueos, con el mes anterior al lado." },
  { id: "asistente", texto: "Asistente", corto: "Asistente", icono: Sparkles, detalle: "Preguntale por un cliente, un saldo o un arqueo que no cuadra. Consulta y explica; no carga nada." },
];
const PANTALLAS = { inicio: Inicio, "carga-rapida": CargaRapida, arqueo: Arqueo, "cuenta-corriente": CuentaCorriente, reportes: Reportes, asistente: Asistente };
const ICONO_BOTON = "presiona grid size-11 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground lg:size-8";
const ITEM_LATERAL = "presiona relative flex h-8 w-full items-center gap-2 rounded-md px-2 text-sm";

function Marca({ nombre }: { nombre: string }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground" aria-hidden>
        <Star className="size-4" />
      </span>
      <span className="truncate text-[15px] font-semibold tracking-tight">{nombre}</span>
    </span>
  );
}

export function App() {
  const { usuario, cargando, setUsuario } = useUsuario();
  const queryClient = useQueryClient();
  const [pantalla, setPantalla] = useState<Pantalla>(pantallaDeHash);
  const [tema, setTema] = useState<Tema>(temaInicial);
  const dia = useQuery({ queryKey: ["dia-actual"], queryFn: api.diaActual, enabled: !!usuario });

  useEffect(() => {
    const onHash = () => {
      setPantalla(pantallaDeHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => aplicarTema(tema), [tema]);
  // El cambio de tema funde toda la página de una vez (View Transitions); sin soporte, cambia directo.
  const alternarTema = () => {
    const nuevo = tema === "oscuro" ? "claro" : "oscuro";
    if (!document.startViewTransition) return setTema(nuevo);
    document.startViewTransition(() => {
      flushSync(() => setTema(nuevo));
      aplicarTema(nuevo);
    });
  };

  async function cerrarSesion() {
    await api.logout();
    queryClient.clear();
    setUsuario(null);
  }

  const IconoTema = tema === "oscuro" ? Sun : Moon;
  const botonTema = (
    <button type="button" onClick={alternarTema} aria-label={tema === "oscuro" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"} className={ICONO_BOTON}>
      <IconoTema className="size-4" aria-hidden />
    </button>
  );

  if (cargando) return <div className="min-h-dvh bg-background" />;
  if (!usuario) return <Login acciones={botonTema} marca={<Marca nombre="Quiniela La Estrella" />} />;

  const Actual = PANTALLAS[pantalla];
  const actual = NAV.find((n) => n.id === pantalla)!;
  const enlace = (p: Pantalla) => `#${p === "inicio" ? "" : p}`;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="hidden border-r bg-sidebar lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div className="flex h-14 items-center px-4">
          <Marca nombre={usuario.negocio.nombre} />
        </div>
        <nav aria-label="Principal" className="flex flex-col gap-0.5 p-2">
          {NAV.map((n) => (
            <a key={n.id} href={enlace(n.id)} aria-current={n.id === pantalla ? "page" : undefined}
              className={`${ITEM_LATERAL} ${n.id === pantalla ? "font-medium" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}>
              {n.id === pantalla && <m.span layoutId="nav-lateral" className="absolute inset-0 rounded-md bg-muted" transition={{ type: "spring", duration: 0.25, bounce: 0 }} />}
              <n.icono className="relative size-4" aria-hidden />
              <span className="relative">{n.texto}</span>
            </a>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-0.5 border-t p-2">
          <p className={`${ITEM_LATERAL} font-medium`}>
            <CircleUser className="size-4 text-muted-foreground" aria-hidden />
            <span className="truncate">{usuario.nombre}</span>
          </p>
          <button type="button" onClick={cerrarSesion} className={`${ITEM_LATERAL} text-muted-foreground hover:bg-muted/60 hover:text-foreground`}>
            <LogOut className="size-4" aria-hidden />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="min-w-0 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
        <header className="sticky top-0 z-20 border-b bg-background pt-[env(safe-area-inset-top)]">
          <div className="flex h-14 items-center gap-1 pl-4 pr-2 lg:pl-8 lg:pr-6">
            <span className="min-w-0 flex-1 lg:hidden"><Marca nombre={usuario.negocio.nombre} /></span>
            <span className="hidden min-w-0 flex-1 items-center gap-3 text-sm lg:flex">
              {dia.data && (
                <>
                  <span className="font-medium first-letter:uppercase">{fechaLarga(dia.data.dia.fecha)}</span>
                  <span className={`${INSIGNIA} ${dia.data.dia.estado === "abierto" ? TONOS.exito : TONOS.neutro}`}>Día {dia.data.dia.estado}</span>
                </>
              )}
            </span>
            {botonTema}
            <button type="button" onClick={cerrarSesion} aria-label="Cerrar sesión" className={`${ICONO_BOTON} lg:hidden`}>
              <LogOut className="size-4" aria-hidden />
            </button>
          </div>
        </header>

        {/* Cambio de pantalla: solo un fundido corto, porque se navega decenas de veces por turno. */}
        <m.main key={pantalla} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15, ease: EASE_SALIDA }}
          className="mx-auto w-full max-w-6xl px-4 pb-8 pt-5 lg:mx-0 lg:max-w-[1600px] lg:px-8 lg:pb-12 lg:pt-8">
          {actual.detalle && (
            <div className="mb-6">
              <h1 className="text-[22px] font-semibold tracking-tight lg:text-2xl">{actual.texto}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{actual.detalle}</p>
            </div>
          )}
          <Actual />
        </m.main>
      </div>

      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-30 border-t bg-card pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-6">
          {NAV.map((n) => (
            <a key={n.id} href={enlace(n.id)} aria-current={n.id === pantalla ? "page" : undefined}
              className={`presiona relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium ${n.id === pantalla ? "text-foreground" : "text-muted-foreground"}`}>
              {n.id === pantalla && <m.span layoutId="nav-inferior" className="absolute inset-x-5 top-0 h-0.5 rounded-b-full bg-foreground" transition={{ type: "spring", duration: 0.3, bounce: 0 }} />}
              <n.icono className="size-5" strokeWidth={n.id === pantalla ? 2.25 : 1.75} aria-hidden />
              {n.corto}
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}
