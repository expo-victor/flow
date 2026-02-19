"use client"

import Image from "next/image"
import { usePathname } from "next/navigation"
import { ReactNode, useEffect, useState } from "react"

const PRELOADER_TOTAL_MS = 2000
const PRELOADER_FADE_MS = 400

export function GlobalPreloader({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  return (
    <>
      {children}
      <PreloaderMask key={pathname ?? "root"} />
    </>
  )
}

function PreloaderMask() {
  const [phase, setPhase] = useState<"visible" | "fading" | "hidden">("visible")

  useEffect(() => {
    const fadeDelay = Math.max(PRELOADER_TOTAL_MS - PRELOADER_FADE_MS, 0)

    const fadeTimer = window.setTimeout(() => {
      setPhase("fading")
    }, fadeDelay)

    const hideTimer = window.setTimeout(() => {
      setPhase("hidden")
    }, PRELOADER_TOTAL_MS)

    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(hideTimer)
    }
  }, [])

  if (phase === "hidden") {
    return null
  }

  return (
    <div
      className={`flow-preloader fixed inset-0 z-[9999] flex items-center justify-center bg-white transition-opacity duration-[400ms] ${
        phase === "fading" ? "opacity-0" : "opacity-100"
      }`}
    >
      <Image
        src="/branding/preloader_icon.svg"
        alt="Cargando"
        width={240}
        height={240}
        priority
        className="flow-preloader-icon"
      />
    </div>
  )
}
