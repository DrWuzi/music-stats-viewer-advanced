import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 512,
        height: 512,
        background: 'linear-gradient(135deg, #09090b 0%, #1c1c27 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 96,
      }}
    >
      <div
        style={{
          color: '#f4f4f5',
          fontSize: 320,
          fontWeight: 900,
          fontFamily: 'serif',
          lineHeight: 1,
          marginTop: -16,
        }}
      >
        ♫
      </div>
    </div>,
    { width: 512, height: 512 },
  )
}
