import { useSyncExternalStore } from "react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon } from "lucide-react"

// El tema sale de la clase `.dark` de <html>, que pone util.ts (aplicarTema): sin next-themes.
const alCambiarTema = (aviso: () => void) => {
  const observador = new MutationObserver(aviso)
  observador.observe(document.documentElement, { attributeFilter: ["class"] })
  return () => observador.disconnect()
}
const hayOscuro = () => document.documentElement.classList.contains("dark")

// Un solo Toaster en toda la app (main.tsx). Arriba y al centro, sin richColors: el color vive en el ícono.
// z 50 (DESIGN §4); el borde de arriba respeta la muesca del celular.
const Toaster = (props: ToasterProps) => {
  const oscuro = useSyncExternalStore(alCambiarTema, hayOscuro)

  return (
    <Sonner
      theme={oscuro ? "dark" : "light"}
      position="top-center"
      mobileOffset={{ top: "calc(env(safe-area-inset-top) + 12px)" }}
      icons={{ success: <CircleCheckIcon className="size-4 text-exito" /> }}
      style={
        {
          zIndex: 50,
          fontFamily: "var(--font-sans)",
          "--normal-bg": "var(--color-popover)",
          "--normal-text": "var(--color-popover-foreground)",
          "--normal-border": "var(--color-border)",
          "--border-radius": "var(--radius-xl)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast: "text-sm! shadow-lg! gap-3!",
          title: "font-semibold",
          description: "text-muted-foreground!",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
