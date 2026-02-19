import { redirect } from "next/navigation"

export default function LegacySupportLoginRedirectPage() {
  redirect("/panel/login")
}
