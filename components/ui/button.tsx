import { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type Variant = "default" | "outline" | "ghost"
type Size = "sm" | "md" | "lg"

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant
  size?: Size
}

const baseClasses =
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:opacity-50 disabled:pointer-events-none"

const variantClasses: Record<Variant, string> = {
  default: "bg-accent text-accent-foreground hover:bg-accent/90",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-slate-900",
  ghost: "bg-transparent hover:bg-slate-900 text-foreground"
}

const sizeClasses: Record<Size, string> = {
  sm: "h-8 px-3",
  md: "h-9 px-4",
  lg: "h-10 px-6"
}

export function Button(props: ButtonProps) {
  const { className, variant = "default", size = "md", ...rest } = props
  return (
    <button
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...rest}
    />
  )
}

