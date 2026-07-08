import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { DEFAULT_ORDER, type WidgetId } from '@/lib/dashboard-widgets'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const { order, hidden } = body as { order?: WidgetId[]; hidden?: WidgetId[] }

  const validOrder = Array.isArray(order)
    ? order.filter((id) => (DEFAULT_ORDER as readonly string[]).includes(id))
    : undefined

  const validHidden = Array.isArray(hidden)
    ? hidden.filter((id) => (DEFAULT_ORDER as readonly string[]).includes(id))
    : undefined

  await prisma.user.update({
    where: { lastfmUsername: session.lastfmUsername },
    data: {
      ...(validOrder !== undefined ? { dashboardOrder: JSON.stringify(validOrder) } : {}),
      ...(validHidden !== undefined ? { dashboardHidden: JSON.stringify(validHidden) } : {}),
    },
  })

  return NextResponse.json({ ok: true })
}
