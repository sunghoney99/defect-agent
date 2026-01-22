"use client"

import { ConvexProvider, ConvexReactClient } from "convex/react"
import { ReactNode, useMemo } from "react"

export function ConvexClientProvider({ children }: { children: ReactNode }) {
  const convex = useMemo(() => {
    const url = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!url) {
      console.error("NEXT_PUBLIC_CONVEX_URL is not set:", url)
      throw new Error("NEXT_PUBLIC_CONVEX_URL environment variable is not set")
    }
    return new ConvexReactClient(url)
  }, [])

  return <ConvexProvider client={convex}>{children}</ConvexProvider>
}
