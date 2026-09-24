import { useEffect, useState } from "react";
import { flushSync } from "react-dom";
import { useQueryClient } from "@tanstack/react-query";
import { m } from "motion/react";
import { BookUser, Calculator, House, LogOut, Moon, Star, Sun, Zap, type LucideIcon } from "lucide-react";
import { api } from "./api/cliente";
import { useUsuario } from "./contexto/usuario";
import { Login } from "./pantallas/Login";
import { Inicio } from "./pantallas/Inicio";
import { CargaRapida } from "./pantallas/CargaRapida";
import { Arqueo } from "./pantallas/Arqueo";
import { CuentaCorriente } from "./pantallas/CuentaCorriente";
import { type Tema, aplicarTema, temaInicial } from "./util";
import { EASE_SALIDA } from "./ui";

type Pantalla = "inicio" | "carga-rapida" | "arqueo" | "cuenta-corriente";
const pantallaDeHash = (): Pantalla => {
  const h = location.hash.slice(1);
  return h === "carga-rapida" || h === "arqueo" || h === "cuenta-corriente" ? h : "inicio";
};

const NAV: { id: Pantalla; texto: string; corto: string; icono: LucideIcon }[] = [
  { id: "inicio", texto: "Inicio", corto: "Inicio", icono: House },
  { id: "carga-rapida", texto: "Carga rápida", corto: "Cargar", icono: Zap },
  { id: "arqueo", texto: "Arqueo", corto: "Arqueo", icono: Calculator },
  { id: "cuenta-corriente", texto: "Cuenta corriente", corto: "Fiados", icono: BookUser },
];
const PANTALLAS = { inicio: Inicio, "carga-rapida": CargaRapida, arqueo: Arqueo, "cuenta-corriente": CuentaCorriente };

// Botones sobre la noche (barra de arriba, barra lateral y login): tema y salir.
const BOTON_NOCHE = "presiona grid size-11 shrink-0 place-items-center rounded-full text-en-noche-suave hover:bg-white/10 hover:text-en-noche";
function BotonTema({ tema, onClick }: { tema: Tema; onClick: () => void }) {
  const Icono = tema === "oscuro" ? Sun : Moon;
  return (
    <button type="button" onClick={onClick} aria-label={tema === "oscuro" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"} className={BOTON_NOCHE}>
      <Icono className="size-5" aria-hidden />
    </button>
  );
}

function Marca({ nombre }: { nombre: string }) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-estrella text-en-estrella">
        <Star className="size-5 fill-current" aria-hidden />
      </span>
      <span className="truncate font-semibold tracking-tight">{nombre}</span>
    </div>
  );
}

export function App() {
  const { usuario, cargando, setUsuario } = useUsuario();
  const queryClient = useQueryClient();
  const [pantalla, setPantalla] = useState<Pantalla>(pantallaDeHash);
  const [tema, setTema] = useState<Tema>(temaInicial);

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

  const botonTema = <BotonTema tema={tema} onClick={alternarTema} />;
  const botonSalir = (
    <button type="button" onClick={cerrarSesion} aria-label="Salir" className={BOTON_NOCHE}>
      <LogOut className="size-5" aria-hidden />
    </button>
  );

  if (cargando) return <div className="min-h-dvh bg-noche" />;
  if (!usuario) return <Login acciones={botonTema} />;

  const Actual = PANTALLAS[pantalla];
  const titulo = NAV.find((n) => n.id === pantalla)!.texto;
  const enlace = (p: Pantalla) => `#${p === "inicio" ? "" : p}`;

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[256px_1fr]">
      <aside className="sobre-noche hidden bg-noche p-4 text-en-noche lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col">
        <div className="flex h-12 items-center px-1">
          <Marca nombre={usuario.negocio.nombre} />
        </div>
        <nav aria-label="Principal" className="mt-8 flex flex-col gap-1">
          {NAV.map((n) => (
            <a
              key={n.id}
              href={enlace(n.id)}
              aria-current={n.id === pantalla ? "page" : undefined}
              className={`presiona relative flex h-12 items-center gap-3 rounded-xl px-3 font-medium ${n.id === pantalla ? "text-en-noche" : "text-en-noche-suave hover:text-en-noche"}`}
            >
              {n.id === pantalla && <m.span layoutId="nav-lateral" className="absolute inset-0 rounded-xl bg-white/10" transition={{ type: "spring", duration: 0.3, bounce: 0 }} />}
              <n.icono className={`relative size-5 ${n.id === pantalla ? "text-estrella" : ""}`} aria-hidden />
              <span className="relative">{n.texto}</span>
            </a>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-1 border-t border-white/10 pt-4">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-noche-2 text-sm font-semibold" aria-hidden>
            {usuario.nombre.charAt(0)}
          </span>
          <span className="ml-1.5 flex-1 truncate text-sm font-medium">{usuario.nombre}</span>
          {botonTema}
          {botonSalir}
        </div>
      </aside>

      <div className="min-w-0 pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-12">
        <header className="sobre-noche flex min-h-14 items-center gap-1 bg-noche pl-4 pr-2 pt-[env(safe-area-inset-top)] text-en-noche lg:hidden">
          {pantalla === "inicio" ? <Marca nombre={usuario.negocio.nombre} /> : <h1 className="flex-1 text-lg font-semibold tracking-tight">{titulo}</h1>}
          {botonTema}
          {pantalla === "inicio" && botonSalir}
        </header>
        {/* Cambio de pantalla: solo un fundido corto, porque se navega decenas de veces por turno. */}
        <m.main key={pantalla} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.16, ease: EASE_SALIDA }} className="mx-auto w-full max-w-5xl lg:px-10 lg:pt-10">
          {pantalla !== "inicio" && <h1 className="mb-6 hidden text-3xl font-semibold tracking-tight lg:block">{titulo}</h1>}
          <Actual />
        </m.main>
      </div>

      <nav aria-label="Principal" className="fixed inset-x-0 bottom-0 z-30 border-t border-borde bg-superficie pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="mx-auto grid max-w-md grid-cols-4">
          {NAV.map((n) => (
            <a key={n.id} href={enlace(n.id)} aria-current={n.id === pantalla ? "page" : undefined} className="presiona flex h-16 flex-col items-center justify-center gap-1 text-xs font-semibold">
              <span className="relative grid h-8 w-14 place-items-center">
                {n.id === pantalla && <m.span layoutId="nav-inferior" className="absolute inset-0 rounded-full bg-estrella" transition={{ type: "spring", duration: 0.3, bounce: 0 }} />}
                <n.icono className={`relative size-5 ${n.id === pantalla ? "text-en-estrella" : "text-tinta-suave"}`} aria-hidden />
              </span>
              <span className={n.id === pantalla ? "text-tinta" : "text-tinta-suave"}>{n.corto}</span>
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}
