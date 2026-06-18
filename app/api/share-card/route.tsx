import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const username = searchParams.get('username') ?? 'Unknown'
  const scrobbles = searchParams.get('scrobbles') ?? '0'
  const artist = searchParams.get('artist') ?? 'Unknown'

  const formattedScrobbles = Number(scrobbles).toLocaleString()

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0f0f1a 0%, #1a0f2e 50%, #0f1a2e 100%)',
          padding: '40px 48px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        {/* Top row: branding */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#e4484a',
            }}
          />
          <span
            style={{
              fontSize: '18px',
              color: '#94a3b8',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}
          >
            Last.fm Advanced
          </span>
        </div>

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: '#f8fafc',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            {username}
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '8px',
              marginTop: '4px',
            }}
          >
            <span
              style={{
                fontSize: '38px',
                fontWeight: 'bold',
                color: '#e4484a',
              }}
            >
              {formattedScrobbles}
            </span>
            <span
              style={{
                fontSize: '28px',
                color: '#94a3b8',
              }}
            >
              scrobbles
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '8px',
            }}
          >
            <span
              style={{
                fontSize: '20px',
                color: '#64748b',
              }}
            >
              Top artist:
            </span>
            <span
              style={{
                fontSize: '20px',
                color: '#cbd5e1',
                fontWeight: '600',
              }}
            >
              {artist}
            </span>
          </div>
        </div>

        {/* Bottom row: decorative bar + domain */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '4px',
            }}
          >
            {[60, 100, 40, 80, 55, 70, 45].map((h, i) => (
              <div
                key={i}
                style={{
                  width: '8px',
                  height: `${h * 0.5}px`,
                  borderRadius: '2px',
                  background: i === 1 ? '#e4484a' : 'rgba(148, 163, 184, 0.25)',
                  alignSelf: 'flex-end',
                }}
              />
            ))}
          </div>

          <span
            style={{
              fontSize: '16px',
              color: '#334155',
              letterSpacing: '0.04em',
            }}
          >
            lastfm-advanced.vercel.app
          </span>
        </div>
      </div>
    ),
    {
      width: 600,
      height: 315,
    }
  )
}
