import { ImageResponse } from 'next/og'

export const size = { width: 1200, height: 600 }
export const contentType = 'image/png'

export default async function TwitterImage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params

  return new ImageResponse(
    <div
      style={{
        width: 1200,
        height: 600,
        background: 'linear-gradient(135deg, #09090b 0%, #1c1c27 60%, #0f0f1a 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'serif',
        position: 'relative',
      }}
    >
      {/* Subtle radial glow */}
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 800,
          height: 400,
          background: 'radial-gradient(ellipse, rgba(161,100,240,0.15) 0%, transparent 70%)',
          borderRadius: '50%',
        }}
      />

      {/* Music note */}
      <div
        style={{
          color: '#a164f0',
          fontSize: 96,
          lineHeight: 1,
          marginBottom: 24,
        }}
      >
        ♫
      </div>

      {/* Username */}
      <div
        style={{
          color: '#f4f4f5',
          fontSize: 80,
          fontWeight: 900,
          letterSpacing: '-2px',
          lineHeight: 1,
          marginBottom: 20,
          textAlign: 'center',
          maxWidth: 1000,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {username}
      </div>

      {/* Subtitle */}
      <div
        style={{
          color: '#a1a1aa',
          fontSize: 32,
          fontWeight: 400,
          letterSpacing: '4px',
          textTransform: 'uppercase',
          fontFamily: 'sans-serif',
        }}
      >
        Last.fm Advanced
      </div>
    </div>,
    { width: 1200, height: 600 },
  )
}
