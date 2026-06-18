import { getSession } from "@/lib/session"
import { NavClient } from "@/components/nav"

export async function Nav() {
  const session = await getSession()
  return <NavClient session={session} />
}
