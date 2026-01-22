import { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

export function Card(props: HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card text-card-foreground shadow",
        className
      )}
      {...rest}
    />
  )
}

export function CardHeader(props: HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props
  return (
    <div className={cn("flex flex-col gap-1 p-4 border-b border-border", className)} {...rest} />
  )
}

export function CardTitle(props: HTMLAttributes<HTMLHeadingElement>) {
  const { className, ...rest } = props
  return (
    <h2
      className={cn("text-sm font-semibold text-foreground", className)}
      {...rest}
    />
  )
}

export function CardDescription(props: HTMLAttributes<HTMLParagraphElement>) {
  const { className, ...rest } = props
  return (
    <p
      className={cn("text-xs text-muted-foreground", className)}
      {...rest}
    />
  )
}

export function CardContent(props: HTMLAttributes<HTMLDivElement>) {
  const { className, ...rest } = props
  return (
    <div className={cn("p-4", className)} {...rest} />
  )
}

