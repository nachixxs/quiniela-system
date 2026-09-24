import { useEffect, useState } from "react";
import { useUsuario } from "./contexto/usuario";
import { Login } from "./pantallas/Login";
import { Inicio } from "./pantallas/Inicio";
import { CargaRapida } from "./pantallas/CargaRapida";
import { Arqueo } from "./pantallas/Arqueo";
import { CuentaCorriente } from "./pantallas/CuentaCorriente";
import { type Tema, aplicarTema, temaInicial } from "./util";

type Pantalla = "inicio" | "carga-rapida" | "arqueo" | "cuenta-corriente";
const pantallaDeHash = (): Pantalla => {
  const h = location.hash.slice(1);
  return h === "carga-rapida" || h === "arqueo" || h === "cuenta-corriente" ? h : "inicio";
};

// Botón chico para alternar entre tema claro y oscuro; se usa en el encabezado de cada pantalla.
export function BotonTema({ tema, onClick }: { tema: Tema; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-label={tema === "oscuro" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
      className="h-9 shrink-0 rounded-full border border-borde px-3 text-sm text-tinta-suave"
    >
      {tema === "oscuro" ? "Claro" : "Oscuro"}
    </button>
  );
}

export function App() {
  const { usuario, cargando } = useUsuario();
  const [pantalla, setPantalla] = useState<Pantalla>(pantallaDeHash);
  const [tema, setTema] = useState<Tema>(temaInicial);

  useEffect(() => {
    const onHash = () => setPantalla(pantallaDeHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => aplicarTema(tema), [tema]);
  const alternarTema = () => setTema((t) => (t === "oscuro" ? "claro" : "oscuro"));

  const ir = (p: Pantalla) => { location.hash = p === "inicio" ? "" : p; };
  const volver = () => (location.hash ? history.back() : setPantalla("inicio"));

  if (cargando) return <div className="min-h-screen bg-fondo" />;
  if (!usuario) return <Login tema={tema} onTema={alternarTema} />;
  if (pantalla === "carga-rapida") return <CargaRapida onVolver={volver} tema={tema} onTema={alternarTema} />;
  if (pantalla === "arqueo") return <Arqueo onVolver={volver} tema={tema} onTema={alternarTema} />;
  if (pantalla === "cuenta-corriente") return <CuentaCorriente onVolver={volver} tema={tema} onTema={alternarTema} />;
  return (
    <Inicio
      onCargaRapida={() => ir("carga-rapida")}
      onArqueo={() => ir("arqueo")}
      onCuentaCorriente={() => ir("cuenta-corriente")}
      tema={tema}
      onTema={alternarTema}
    />
  );
}
