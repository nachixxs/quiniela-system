import { useState } from "react";
import { useUsuario } from "./contexto/usuario";
import { Login } from "./pantallas/Login";
import { Inicio } from "./pantallas/Inicio";
import { CargaRapida } from "./pantallas/CargaRapida";

type Pantalla = "inicio" | "carga-rapida";

export function App() {
  const { usuario } = useUsuario();
  const [pantalla, setPantalla] = useState<Pantalla>("inicio");

  if (!usuario) return <Login />;
  if (pantalla === "carga-rapida") return <CargaRapida onVolver={() => setPantalla("inicio")} />;
  return <Inicio onCargaRapida={() => setPantalla("carga-rapida")} />;
}
