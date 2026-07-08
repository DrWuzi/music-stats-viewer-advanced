import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'
import { DEFAULT_ORDER, createDefaultSizes, type WidgetId, type WidgetSize } from '@/lib/dashboard-widgets'

export async function POST(req: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Bad request' }, { status: 400 })

  const { order, hidden, sizes } = body as {
    order?: WidgetId[]
    hidden?: WidgetId[]
    sizes?: Partial<Record<WidgetId, WidgetSize>>
  }

  const validOrder = Array.isArray(order)
    ? order.filter((id) => (DEFAULT_ORDER as readonly string[]).includes(id))
    : undefined

  const validHidden = Array.isArray(hidden)
    ? hidden.filter((id) => (DEFAULT_ORDER as readonly string[]).includes(id))
    : undefined

  const validSizes = sizes && typeof sizes === 'object'
    ? Object.fromEntries(
        Object.entries(sizes)
          .filter(([id, value]) => (DEFAULT_ORDER as readonly string[]).includes(id) && (value === 1 || value === 2)),
      ) as Partial<Record<WidgetId, WidgetSize>>
    : undefined

  const layout = {
    order: validOrder ?? DEFAULT_ORDER,
    sizes: createDefaultSizes(validSizes),
  }

  await prisma.user.update({
    where: { lastfmUsername: session.lastfmUsername },
    data: {
      ...(order !== undefined || sizes !== undefined ? { dashboardOrder: JSON.stringify(layout) } : {}),
      ...(validHidden !== undefined ? { dashboardHidden: JSON.stringify(validHidden) } : {}),
    },
  })

  return NextResponse.json({ ok: true })
}
