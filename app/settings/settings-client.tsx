'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  User,
  Monitor,
  LayoutDashboard,
  Database,
  Info,
  Download,
  Upload,
  Trash2,
  RefreshCw,
  LogOut,
  ExternalLink,
  Bug,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TimezoneSelector } from '@/components/timezone-selector'
import { ThemeToggle } from '@/components/theme-toggle'
import { ResyncButton } from '@/components/resync-button'
import { PageContainer } from '@/components/page-container'

// ── localStorage keys (must match dashboard-provider.tsx) ────────────────────
const ORDER_KEY = 'dashboardOrder_v1'
const HIDDEN_KEY = 'dashboardHidden_v1'

// ── Max-width preference ─────────────────────────────────────────────────────
const MAX_WIDTH_KEY = 'maxWidthPref'
type MaxWidthOption = 'comfortable' | 'wide' | 'full'

const MAX_WIDTH_LABELS: Record<MaxWidthOption, string> = {
  comfortable: 'Comfortable (max-w-6xl)',
  wide: 'Wide (max-w-7xl)',
  full: 'Full width',
}

// ── Confirmation dialog ──────────────────────────────────────────────────────
function ConfirmDialog({
  message,
  onConfirm,
  onCancel,
}: {
  message: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'color-mix(in oklch, var(--background) 80%, transparent)' }}
    >
      <div className="w-full max-w-sm rounded-2xl border border-foreground/10 bg-card/60 backdrop-blur-xl p-6 shadow-xl shadow-black/5 dark:shadow-black/30 space-y-4">
        <div className="flex items-start gap-3">
          <AlertTriangle
            className="h-5 w-5 mt-0.5 flex-shrink-0"
            style={{ color: 'var(--destructive)' }}
          />
          <p className="text-sm leading-relaxed">{message}</p>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Section wrapper ──────────────────────────────────────────────────────────
function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  )
}

// ── Setting row ──────────────────────────────────────────────────────────────
function Row({
  label,
  description,
  children,
}: {
  label: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium leading-none">{label}</p>
        {description && (
          <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
            {description}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

// ── Inline link button (matches outline sm button visually) ──────────────────
function LinkButton({
  href,
  download,
  target,
  rel,
  children,
}: {
  href: string
  download?: boolean
  target?: string
  rel?: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      download={download}
      target={target}
      rel={rel}
      className="inline-flex shrink-0 items-center justify-center gap-1 rounded-xl border border-foreground/15 bg-background/40 backdrop-blur-md px-2.5 text-[0.8rem] font-medium h-7 transition-all hover:bg-background/60 hover:text-foreground"
    >
      {children}
    </a>
  )
}

// ── Main component ───────────────────────────────────────────────────────────
interface SettingsClientProps {
  username: string
  lastSyncedAt: string | null
}

export function SettingsClient({
  username,
  lastSyncedAt,
}: SettingsClientProps) {
  const router = useRouter()

  // Display prefs
  const [maxWidth, setMaxWidth] = useState<MaxWidthOption>('comfortable')

  // Dashboard export/import feedback
  const [dashboardMsg, setDashboardMsg] = useState<string | null>(null)
  const importRef = useRef<HTMLInputElement>(null)

  // Delete account state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteStatus, setDeleteStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [deleteError, setDeleteError] = useState('')

  // ── Load stored preferences ────────────────────────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem(MAX_WIDTH_KEY) as MaxWidthOption | null
    if (stored && stored in MAX_WIDTH_LABELS) setMaxWidth(stored)
  }, [])

  function handleMaxWidthChange(opt: MaxWidthOption) {
    setMaxWidth(opt)
    localStorage.setItem(MAX_WIDTH_KEY, opt)
    // Apply immediately, same pattern as ThemeToggle — the <html> element
    // persists across client-side navigations, so the inline bootstrap
    // script (which only runs on a full page load) isn't enough on its own.
    document.documentElement.classList.remove('mw-wide', 'mw-full')
    if (opt === 'wide') document.documentElement.classList.add('mw-wide')
    else if (opt === 'full') document.documentElement.classList.add('mw-full')
  }

  // ── Dashboard config ───────────────────────────────────────────────────────
  function flash(msg: string, ms = 3500) {
    setDashboardMsg(msg)
    setTimeout(() => setDashboardMsg(null), ms)
  }

  function handleResetDashboard() {
    localStorage.removeItem(ORDER_KEY)
    localStorage.removeItem(HIDDEN_KEY)
    flash('Dashboard layout reset.')
  }

  function handleExportDashboard() {
    const order = localStorage.getItem(ORDER_KEY)
    const hidden = localStorage.getItem(HIDDEN_KEY)
    const config = {
      version: 1,
      exportedAt: new Date().toISOString(),
      dashboardOrder: order ? (JSON.parse(order) as unknown[]) : null,
      dashboardHidden: hidden ? (JSON.parse(hidden) as unknown[]) : [],
    }
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `lastfm-dashboard-config-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
    flash('Config exported.')
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const config = JSON.parse(ev.target?.result as string) as {
          dashboardOrder?: unknown[]
          dashboardHidden?: unknown[]
        }
        if (config.dashboardOrder) {
          localStorage.setItem(ORDER_KEY, JSON.stringify(config.dashboardOrder))
        }
        if (config.dashboardHidden) {
          localStorage.setItem(HIDDEN_KEY, JSON.stringify(config.dashboardHidden))
        }
        flash('Config imported. Refresh the dashboard to see changes.', 5000)
      } catch {
        flash('Failed to parse config file.', 4000)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  // ── Delete account ─────────────────────────────────────────────────────────
  async function handleDeleteData() {
    setShowDeleteConfirm(false)
    setDeleteStatus('loading')
    setDeleteError('')
    try {
      const res = await fetch('/api/auth/delete-account', { method: 'DELETE' })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data?.error ?? `Server error ${res.status}`)
      }
      setDeleteStatus('done')
      setTimeout(() => router.push('/'), 2000)
    } catch (err) {
      setDeleteStatus('error')
      setDeleteError(err instanceof Error ? err.message : 'An error occurred')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      {showDeleteConfirm && (
        <ConfirmDialog
          message="This will permanently delete your account and all scrobble data. This cannot be undone."
          onConfirm={handleDeleteData}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      <PageContainer maxWidth="2xl" className="py-8 space-y-8">
        {/* Back nav */}
        <div>
          <Link
            href="/dashboard"
            className="text-sm hover:underline"
            style={{ color: 'var(--muted-foreground)' }}
          >
            Back to Dashboard
          </Link>
        </div>

        <div>
          <h1 className="text-2xl font-semibold tracking-tight bg-gradient-to-r from-chart-1 to-chart-5 bg-clip-text text-transparent">Settings</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Manage your account, display, and data preferences.
          </p>
        </div>

        {/* ── Account ────────────────────────────────────────────────────── */}
        <Section icon={User} title="Account">
          <Row label="Username" description="Your Last.fm username — log in again to change it.">
            <span
              className="text-sm font-mono px-2 py-1 rounded-xl backdrop-blur-sm"
              style={{ backgroundColor: 'color-mix(in oklch, var(--muted) 70%, transparent)', color: 'var(--foreground)' }}
            >
              {username}
            </span>
          </Row>

          <Row
            label="Last synced"
            description="When your library was last synced from Last.fm."
          >
            <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              {lastSyncedAt ? new Date(lastSyncedAt).toLocaleString('en-US') : 'Never'}
            </span>
          </Row>

          <Row label="Re-sync library" description="Queue a full re-import from Last.fm.">
            <ResyncButton username={username} />
          </Row>

          <Row
            label="Profile appearance"
            description="Accent theme, avatar decoration, and tagline are edited on your profile page — click the pencil icon next to your avatar."
          >
            <Link href={`/user/${username}`}>
              <Button variant="outline" size="sm">
                Go to profile
              </Button>
            </Link>
          </Row>

          <Row label="Sign out" description="End your session on this device.">
            <form action="/api/auth/logout" method="POST">
              <Button variant="outline" size="sm" type="submit">
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </form>
          </Row>
        </Section>

        {/* ── Display ────────────────────────────────────────────────────── */}
        <Section icon={Monitor} title="Display" description="Appearance and layout preferences.">
          <Row label="Theme" description="Cycle between light, dark, Rosé Pine, Catppuccin, and Dracula.">
            <ThemeToggle />
          </Row>

          <div className="space-y-2">
            <p className="text-sm font-medium">Timezone</p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Used when displaying scrobble times and charts.
            </p>
            <TimezoneSelector />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Page width</p>
            <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              Controls the maximum content width of the dashboard.
            </p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(MAX_WIDTH_LABELS) as MaxWidthOption[]).map((opt) => (
                <button
                  key={opt}
                  onClick={() => handleMaxWidthChange(opt)}
                  className={`text-xs px-3 py-1.5 rounded-xl border backdrop-blur-md transition-all ${
                    maxWidth === opt
                      ? 'border-transparent bg-gradient-to-r from-chart-1 to-chart-5 text-white shadow-lg shadow-chart-1/25'
                      : 'border-foreground/10 bg-background/40 text-foreground hover:bg-background/60'
                  }`}
                >
                  {MAX_WIDTH_LABELS[opt]}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* ── Dashboard ──────────────────────────────────────────────────── */}
        <Section
          icon={LayoutDashboard}
          title="Dashboard"
          description="Manage widget order and visibility."
        >
          {dashboardMsg && (
            <div
              className="flex items-center gap-2 text-sm px-3 py-2 rounded-xl border border-foreground/10 backdrop-blur-sm"
              style={{
                backgroundColor: 'color-mix(in oklch, var(--primary) 12%, transparent)',
                color: 'var(--foreground)',
              }}
            >
              <CheckCircle2
                className="h-4 w-4 flex-shrink-0"
                style={{ color: 'var(--primary)' }}
              />
              {dashboardMsg}
            </div>
          )}

          <Row
            label="Reset dashboard layout"
            description="Restore the default widget order and visibility."
          >
            <Button variant="outline" size="sm" onClick={handleResetDashboard}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </Row>

          <Row
            label="Export dashboard config"
            description="Download your widget order and visibility as a JSON file."
          >
            <Button variant="outline" size="sm" onClick={handleExportDashboard}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </Row>

          <Row
            label="Import dashboard config"
            description="Restore a previously exported dashboard config file."
          >
            <div>
              <input
                ref={importRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleImportFile}
              />
              <Button variant="outline" size="sm" onClick={() => importRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
            </div>
          </Row>
        </Section>

        {/* ── Data & Privacy ─────────────────────────────────────────────── */}
        <Section
          icon={Database}
          title="Data & Privacy"
          description="Export or permanently delete your data."
        >
          <Row
            label="Export scrobbles as CSV"
            description="Download all your scrobbles in spreadsheet format."
          >
            <LinkButton href="/api/export" download>
              <Download className="h-3.5 w-3.5" />
              Download CSV
            </LinkButton>
          </Row>

          <Row
            label="Export scrobbles as JSON"
            description="Download all your scrobbles in JSON format."
          >
            <LinkButton href="/api/export/json" download>
              <Download className="h-3.5 w-3.5" />
              Download JSON
            </LinkButton>
          </Row>

          <div className="rounded-2xl border border-destructive/20 bg-destructive/10 backdrop-blur-sm p-4 space-y-3">
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--destructive)' }}>
                Danger zone
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>
                Permanently deletes your account and all associated data. This cannot be undone.
              </p>
            </div>

            {deleteStatus === 'done' && (
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Account deleted. Redirecting...
              </p>
            )}
            {deleteStatus === 'error' && (
              <p className="text-xs" style={{ color: 'var(--destructive)' }}>
                {deleteError}
              </p>
            )}

            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleteStatus === 'loading' || deleteStatus === 'done'}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {deleteStatus === 'loading' ? 'Deleting...' : 'Delete all my data'}
            </Button>
          </div>
        </Section>

        {/* ── About ──────────────────────────────────────────────────────── */}
        <Section icon={Info} title="About">
          <Row label="Version" description="Current app version.">
            <span
              className="text-xs font-mono px-2 py-1 rounded-xl backdrop-blur-sm"
              style={{ backgroundColor: 'color-mix(in oklch, var(--muted) 70%, transparent)', color: 'var(--muted-foreground)' }}
            >
              v0.1.0
            </span>
          </Row>

          <Row label="Source code" description="View the project on GitHub.">
            <LinkButton
              href="https://github.com/wuzi/lastfm-advanced"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              GitHub
            </LinkButton>
          </Row>

          <Row label="Report a bug" description="Open an issue on GitHub.">
            <LinkButton
              href="https://github.com/wuzi/lastfm-advanced/issues/new"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Bug className="h-3.5 w-3.5" />
              Report
            </LinkButton>
          </Row>
        </Section>
      </PageContainer>
    </>
  )
}
