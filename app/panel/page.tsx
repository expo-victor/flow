import Image from "next/image"
import { redirect } from "next/navigation"

import { SupportWorkspace } from "@/components/flow/support-workspace"
import { getSupportUserFromSession } from "@/lib/flow/auth"
import { getSupportDashboardData } from "@/lib/flow/service"

type SearchParams = Record<string, string | string[] | undefined>

function getSingleQueryValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

export default async function SupportPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const supportUser = await getSupportUserFromSession()

  if (!supportUser) {
    redirect("/panel/login")
  }

  const resolvedSearchParams = searchParams ? await searchParams : {}
  const error = getSingleQueryValue(resolvedSearchParams.error)
  const selectedTicketCode = getSingleQueryValue(resolvedSearchParams.ticket)

  const dashboard = await getSupportDashboardData()

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="rounded-2xl bg-background p-4">
        <div className="flex items-center justify-center">
          <Image
            src="/branding/preloader_icon.svg"
            alt="Expoflamenco"
            width={64}
            height={64}
            className="mx-auto scale-250"
          />
        </div>
      </header>

      <SupportWorkspace
        supportUser={{ id: supportUser.id, name: supportUser.name, email: supportUser.email }}
        selectedTicketCode={selectedTicketCode}
        error={error}
        dashboard={dashboard}
      />
    </main>
  )
}
