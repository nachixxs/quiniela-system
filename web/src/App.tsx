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
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider } from "@/components/ui/sidebar";

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
const NEGOCIO = "Quiniela La Estrella";
const pendientesTexto = (n: number) => `${n} ${n === 1 ? "pendiente" : "pendientes"}`;

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
  useEffect(() => {
    const n = NAV.find((x) => x.id === pantalla)!;
    document.title = !usuario ? `Iniciar sesión · ${NEGOCIO}` : n.id === "inicio" ? NEGOCIO : `${n.texto} · ${NEGOCIO}`;
  }, [pantalla, usuario]);
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
  if (!usuario) return <Login acciones={botonTema} marca={<Marca nombre={NEGOCIO} />} />;

  const Actual = PANTALLAS[pantalla];
  const actual = NAV.find((n) => n.id === pantalla)!;
  const enlace = (p: Pantalla) => `#${p === "inicio" ? "" : p}`;
  // D100: arqueos pendientes + la rendición. El número va en un title (descripción), no en el nombre del enlace: sigue siendo "Inicio".
  const pendientes = dia.data ? dia.data.arqueos_pendientes.length + (dia.data.rendicion_pendiente ? 1 : 0) : 0;
  const pendientesDe = (id: Pantalla) => (id === "inicio" ? pendientes : 0);
  const titulo = (id: Pantalla) => (pendientesDe(id) ? pendientesTexto(pendientes) : undefined);

  return (
    <>
      <a href="#contenido" onClick={(e) => { e.preventDefault(); document.getElementById("contenido")?.focus(); }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground">
        Saltar al contenido
      </a>
      <SidebarProvider className="min-h-dvh">
        <Sidebar collapsible="none" className="sticky top-0 hidden h-dvh border-r lg:flex">
          <SidebarHeader className="h-14 justify-center px-4"><Marca nombre={usuario.negocio.nombre} /></SidebarHeader>
          <SidebarContent>
            <nav aria-label="Principal" className="p-2">
              <SidebarMenu className="gap-0.5">
                {NAV.map((n) => {
                  const activo = n.id === pantalla;
                  return (
                    <SidebarMenuItem key={n.id}>
                      <SidebarMenuButton asChild isActive={activo} className={`presiona relative data-active:bg-transparent ${activo ? "" : "text-muted-foreground"}`}>
                        <a href={enlace(n.id)} aria-current={activo ? "page" : undefined} title={titulo(n.id)}>
                          {activo && <m.span layoutId="nav-lateral" className="absolute inset-0 rounded-md bg-muted" transition={{ type: "spring", duration: 0.25, bounce: 0 }} />}
                          <n.icono className="relative" aria-hidden />
                          <span className="relative">{n.texto}</span>
                          {pendientesDe(n.id) > 0 && <span aria-hidden className={`${INSIGNIA} ${TONOS.aviso} relative ml-auto`}>{pendientes}</span>}
                        </a>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </nav>
          </SidebarContent>
          <SidebarFooter className="gap-0.5 border-t">
            <p className="flex h-8 items-center gap-2 px-2 text-sm font-medium">
              <CircleUser className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="truncate">{usuario.nombre}</span>
            </p>
            <SidebarMenuButton onClick={cerrarSesion} className="presiona text-muted-foreground">
              <LogOut aria-hidden />
              Cerrar sesión
            </SidebarMenuButton>
          </SidebarFooter>
        </Sidebar>

        <div className="min-w-0 flex-1 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">
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
          <m.main id="contenido" tabIndex={-1} key={pantalla} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15, ease: EASE_SALIDA }}
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
          <div className="grid grid-cols-6">
            {NAV.map((n) => (
              <a key={n.id} href={enlace(n.id)} aria-current={n.id === pantalla ? "page" : undefined} title={titulo(n.id)}
                className={`presiona relative flex h-16 flex-col items-center justify-center gap-1 text-xs font-medium ${n.id === pantalla ? "text-foreground" : "text-muted-foreground"}`}>
                {n.id === pantalla && <m.span layoutId="nav-inferior" className="absolute inset-x-5 top-0 h-0.5 rounded-b-full bg-foreground" transition={{ type: "spring", duration: 0.3, bounce: 0 }} />}
                <n.icono className="size-5" strokeWidth={n.id === pantalla ? 2.25 : 1.75} aria-hidden />
                {n.corto}
                {pendientesDe(n.id) > 0 && <span aria-hidden className={`${TONOS.aviso} absolute left-1/2 top-1.5 ml-3 grid h-5 min-w-5 place-items-center rounded-md px-1 text-xs font-medium`}>{pendientes}</span>}
              </a>
            ))}
          </div>
        </nav>
      </SidebarProvider>
    </>
  );
}
