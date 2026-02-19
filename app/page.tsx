import Image from "next/image"
import Link from "next/link"
import { Inter } from "next/font/google"

import { Button } from "@/components/ui/button"
import { ProblemSearch } from "@/components/flow/problem-search"
import { getTicketSearchCatalog } from "@/lib/flow/service"

const inter = Inter({
  subsets: ["latin"],
  weight: ["800"],
})

export default async function HomePage() {
  const tickets = await getTicketSearchCatalog()

  return (
    <main className="min-h-screen bg-white text-black">
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10">
        <Image
          src="/branding/pattern.png"
          alt=""
          fill
          priority
          unoptimized
          className="object-cover object-center"
        />

        <div className="absolute inset-0 bg-white/72" />

        <div className="absolute right-4 top-4 z-20 flex gap-2 sm:right-6 sm:top-6">
          <Button asChild variant="outline" className="border-black/20 text-black hover:bg-black/5">
            <Link href="/app">Ir a incidencias</Link>
          </Button>
          <Button asChild variant="outline" className="border-black/20 text-black hover:bg-black/5">
            <Link href="/panel/login">Soporte</Link>
          </Button>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-4xl text-center">
          <h1 className={`${inter.className} text-balance text-4xl font-extrabold text-black sm:text-5xl`}>
            Encuentra una solución
            <br />
            a tu problema
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-black/85 sm:text-lg">
            Crea un ticket o encuentra información sobre problemas similares
          </p>

          <ProblemSearch tickets={tickets} />
        </div>
      </section>
    </main>
  )
}
