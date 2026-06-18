import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TimezoneSelector } from '@/components/timezone-selector'

export default function SettingsPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl space-y-6">
      <div>
        <a
          href="/"
          className="text-sm hover:underline"
          style={{ color: 'var(--muted-foreground)' }}
        >
          ← Back to Dashboard
        </a>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Display Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Timezone</p>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Choose the timezone used when displaying scrobble times and charts.
            </p>
            <TimezoneSelector />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
