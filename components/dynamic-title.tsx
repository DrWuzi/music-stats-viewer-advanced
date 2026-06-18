'use client'

import { useEffect } from 'react'

interface DynamicTitleProps {
  username: string
  todayCount: number
}

export function DynamicTitle({ username, todayCount }: DynamicTitleProps) {
  useEffect(() => {
    document.title = `(${todayCount} today) Last.fm Advanced — ${username}`
  }, [username, todayCount])

  return null
}
