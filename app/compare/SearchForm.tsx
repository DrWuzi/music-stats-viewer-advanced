'use client'

export function SearchForm({ defaultA = '', defaultB = '' }: { defaultA?: string; defaultB?: string }) {
  return (
    <form method="GET" action="/compare" className="space-y-4 w-full max-w-md">
      <div className="space-y-2">
        <label htmlFor="a" className="text-sm font-medium">
          First username
        </label>
        <input
          id="a"
          name="a"
          type="text"
          defaultValue={defaultA}
          placeholder="e.g. radiohead_fan"
          required
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="b" className="text-sm font-medium">
          Second username
        </label>
        <input
          id="b"
          name="b"
          type="text"
          defaultValue={defaultB}
          placeholder="e.g. pinkfloyd_lover"
          required
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        />
      </div>
      <button
        type="submit"
        className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Compare
      </button>
    </form>
  )
}
