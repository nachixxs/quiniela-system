import { cn } from "cn"

// Quieto: nada late en bucle (DESIGN §8). Se le da la forma de lo que reemplaza.
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="skeleton" className={cn("esqueleto", className)} {...props} />
}

export { Skeleton }
