import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const username = searchParams.get('username') ?? 'Unknown'
  const scrobbles = searchParams.get('scrobbles') ?? '0'
  const artist = searchParams.get('artist') ?? ''
  const period = searchParams.get('period') ?? ''
  const tracks = searchParams.get('tracks') ?? ''
  const artists = searchParams.get('artists') ?? ''

  const formattedScrobbles = Number(scrobbles).toLocaleString('en-US')

  const periodLabel: Record<string, string> = {
    '7day': 'Last 7 Days',
    '1month': 'Last Month',
    '3month': 'Last 3 Months',
    '6month': 'Last 6 Months',
    '12month': 'Last Year',
    'overall': 'All Time',
  }
  const periodDisplay = period ? (periodLabel[period] ?? period) : 'All Time'

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0f0f0f 0%, #1a0a2e 60%, #0d1520 100%)',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background decorative circles */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            right: '-80px',
            width: '300px',
            height: '300px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(228,72,74,0.15) 0%, transparent 70%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-60px',
            left: '-60px',
            width: '240px',
            height: '240px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)',
          }}
        />

        {/* Music note top-left corner */}
        <div
          style={{
            position: 'absolute',
            top: '14px',
            left: '14px',
            fontSize: '48px',
            color: 'rgba(228,72,74,0.12)',
            lineHeight: 1,
          }}
        >
          ♪
        </div>

        {/* Music note bottom-right corner */}
        <div
          style={{
            position: 'absolute',
            bottom: '14px',
            right: '14px',
            fontSize: '56px',
            color: 'rgba(99,102,241,0.12)',
            lineHeight: 1,
          }}
        >
          ♫
        </div>

        {/* Inner content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: '100%',
            padding: '32px 48px',
          }}
        >
          {/* Top row: branding + period badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Logo */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #e4484a, #c0392b)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '14px',
                  color: '#fff',
                }}
              >
                ♪
              </div>
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: '#f8fafc',
                  letterSpacing: '-0.01em',
                }}
              >
                Last.fm{' '}
                <span
                  style={{
                    color: '#e4484a',
                  }}
                >
                  Advanced
                </span>
              </span>
            </div>

            {/* Period badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(228,72,74,0.15)',
                border: '1px solid rgba(228,72,74,0.3)',
                borderRadius: '20px',
                padding: '4px 14px',
              }}
            >
              <span
                style={{
                  fontSize: '13px',
                  color: '#e4484a',
                  fontWeight: '600',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {periodDisplay}
              </span>
            </div>
          </div>

          {/* Main: username */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div
              style={{
                fontSize: '11px',
                color: '#64748b',
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                fontWeight: '600',
              }}
            >
              Listening Stats
            </div>
            <div
              style={{
                fontSize: '64px',
                fontWeight: '800',
                color: '#f8fafc',
                lineHeight: 1.0,
                letterSpacing: '-0.03em',
              }}
            >
              {username}
            </div>
          </div>

          {/* Stats grid */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
            }}
          >
            {/* Scrobbles */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '14px 18px',
                gap: '4px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  color: '#64748b',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontWeight: '600',
                }}
              >
                Scrobbles
              </span>
              <span
                style={{
                  fontSize: '30px',
                  fontWeight: '800',
                  color: '#e4484a',
                  lineHeight: 1.1,
                  letterSpacing: '-0.02em',
                }}
              >
                {formattedScrobbles}
              </span>
            </div>

            {/* Top Artist */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '14px 18px',
                gap: '4px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  color: '#64748b',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontWeight: '600',
                }}
              >
                Top Artist
              </span>
              <span
                style={{
                  fontSize: artist ? '20px' : '20px',
                  fontWeight: '700',
                  color: artist ? '#f8fafc' : '#334155',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                }}
              >
                {artist || '—'}
              </span>
            </div>

            {/* Top Track */}
            <div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                padding: '14px 18px',
                gap: '4px',
              }}
            >
              <span
                style={{
                  fontSize: '11px',
                  color: '#64748b',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontWeight: '600',
                }}
              >
                Top Track
              </span>
              <span
                style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  color: tracks ? '#f8fafc' : '#334155',
                  lineHeight: 1.2,
                  overflow: 'hidden',
                }}
              >
                {tracks || '—'}
              </span>
            </div>
          </div>

          {/* Bottom row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            {/* Mini bar chart decoration */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: '3px',
                height: '24px',
              }}
            >
              {[35, 60, 45, 90, 55, 75, 40, 85, 50, 65].map((h, i) => (
                <div
                  key={i}
                  style={{
                    width: '5px',
                    height: `${h * 0.24}px`,
                    borderRadius: '2px',
                    background:
                      i === 3 || i === 7
                        ? 'rgba(228,72,74,0.7)'
                        : 'rgba(148, 163, 184, 0.18)',
                  }}
                />
              ))}
            </div>

            {/* Branding */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {artists && (
                <span
                  style={{
                    fontSize: '12px',
                    color: '#475569',
                    marginRight: '8px',
                  }}
                >
                  {artists} artists
                </span>
              )}
              <span
                style={{
                  fontSize: '14px',
                  color: '#475569',
                  letterSpacing: '0.04em',
                }}
              >
                lastfm-advanced.app
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 600,
      height: 315,
    }
  )
}
