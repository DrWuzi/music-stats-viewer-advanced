'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function SearchForm({ defaultA = '', defaultB = '' }: { defaultA?: string; defaultB?: string }) {
  return (
    <form method="GET" action="/compare" className="space-y-4 w-full max-w-md">
      <div className="space-y-2">
        <label htmlFor="a" className="text-sm font-medium">
          First username
        </label>
        <Input
          id="a"
          name="a"
          type="text"
          defaultValue={defaultA}
          placeholder="e.g. radiohead_fan"
          required
          className="h-9"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="b" className="text-sm font-medium">
          Second username
        </label>
        <Input
          id="b"
          name="b"
          type="text"
          defaultValue={defaultB}
          placeholder="e.g. pinkfloyd_lover"
          required
          className="h-9"
        />
      </div>
      <Button type="submit" className="w-full">
        Compare
      </Button>
    </form>
  )
}
