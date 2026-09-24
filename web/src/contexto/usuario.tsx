import { createContext, useContext, useState, type ReactNode } from "react";
import type { Usuario } from "../api/tipos";

interface UsuarioContextoValor {
  usuario: Usuario | null;
  setUsuario: (u: Usuario | null) => void;
}

const UsuarioContexto = createContext<UsuarioContextoValor | null>(null);

export function UsuarioProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  return (
    <UsuarioContexto.Provider value={{ usuario, setUsuario }}>
      {children}
    </UsuarioContexto.Provider>
  );
}

export function useUsuario() {
  const ctx = useContext(UsuarioContexto);
  if (!ctx) throw new Error("useUsuario se usa dentro de UsuarioProvider");
  return ctx;
}
