import { useState } from "react";
import { useUsuario } from "./contexto/usuario";
import { Login } from "./pantallas/Login";
import { Inicio } from "./pantallas/Inicio";
import { CargaRapida } from "./pantallas/CargaRapida";
import { Arqueo } from "./pantallas/Arqueo";
import { CuentaCorriente } from "./pantallas/CuentaCorriente";

type Pantalla = "inicio" | "carga-rapida" | "arqueo" | "cuenta-corriente";

export function App() {
  const { usuario } = useUsuario();
  const [pantalla, setPantalla] = useState<Pantalla>("inicio");
  const irAInicio = () => setPantalla("inicio");

  if (!usuario) return <Login />;
  if (pantalla === "carga-rapida") return <CargaRapida onVolver={irAInicio} />;
  if (pantalla === "arqueo") return <Arqueo onVolver={irAInicio} />;
  if (pantalla === "cuenta-corriente") return <CuentaCorriente onVolver={irAInicio} />;
  return (
    <Inicio
      onCargaRapida={() => setPantalla("carga-rapida")}
      onArqueo={() => setPantalla("arqueo")}
      onCuentaCorriente={() => setPantalla("cuenta-corriente")}
    />
  );
}
