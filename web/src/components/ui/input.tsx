import * as React from "react"
import { cn } from "cn"

// 16 px en el celular (el iPhone no hace zoom) y 14 desde lg (también evita el zoom del iPad entre 768 y 1023).
// El foco es el contorno global de index.css más el halo suave.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3 py-1 text-base shadow-xs transition-[border-color,box-shadow] file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/20 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 lg:h-9 lg:text-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
