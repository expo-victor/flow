import { redirect } from "next/navigation"

import { loginSupportAction } from "@/app/actions/support-actions"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getSupportUserFromSession } from "@/lib/flow/auth"
import { ensureSupportUsersFromConfig } from "@/lib/flow/service"

type SearchParams = Record<string, string | string[] | undefined>

function getSingleQueryValue(value: string | string[] | undefined): string | null {
  if (Array.isArray(value)) {
    return value[0] ?? null
  }

  return value ?? null
}

export default async function SupportLoginPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  await ensureSupportUsersFromConfig()

  const currentSupportUser = await getSupportUserFromSession()

  if (currentSupportUser) {
    redirect("/panel")
  }

  const resolvedSearchParams = searchParams ? await searchParams : {}
  const error = getSingleQueryValue(resolvedSearchParams.error)

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md items-center px-4 py-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Acceso para el Equipo de Soporte</CardTitle>
          <CardDescription>
            Accede con tu cuenta de soporte.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? (
            <div className="text-destructive rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm">
              {error}
            </div>
          ) : null}
          <form action={loginSupportAction} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </label>
              <Input id="password" name="password" type="password" required />
            </div>
            <Button type="submit" className="w-full">
              Entrar al panel
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
