import { useUsuario } from "./contexto/usuario";
import { Login } from "./pantallas/Login";
import { Inicio } from "./pantallas/Inicio";

export function App() {
  const { usuario } = useUsuario();
  return usuario ? <Inicio /> : <Login />;
}
