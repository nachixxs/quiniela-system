import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { Slot } from "radix-ui"

// Mostrador: 44 px en el celular (48 el "lg", que es guardar y arquear) y la escala de escritorio desde lg.
// `presiona` es el hundido del toque; el foco es el contorno global de index.css.
const buttonVariants = cva(
  "presiona group/button inline-flex shrink-0 items-center justify-center gap-2 rounded-lg border border-transparent text-sm font-medium whitespace-nowrap select-none disabled:pointer-events-none disabled:bg-muted disabled:text-muted-foreground disabled:shadow-none aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        outline:
          "border-border bg-card shadow-xs hover:bg-muted hover:text-foreground aria-expanded:bg-muted",
        ghost: "hover:bg-muted hover:text-foreground aria-expanded:bg-muted",
        link: "text-foreground underline hover:text-muted-foreground disabled:bg-transparent",
      },
      size: {
        default: "h-11 px-4 lg:h-9",
        sm: "h-11 px-3 lg:h-8",
        lg: "h-12 px-4 text-base lg:h-10 lg:text-sm",
        icon: "size-11 lg:size-9",
        "icon-sm": "size-11 lg:size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
