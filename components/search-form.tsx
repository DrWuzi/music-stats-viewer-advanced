'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export function SearchForm() {
  const [username, setUsername] = useState('')
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (username.trim()) router.push(`/user/${username.trim()}`)
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-sm">
      <Input
        placeholder="Last.fm username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
      />
      <Button type="submit">Search</Button>
    </form>
  )
}
