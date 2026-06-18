'use client'

import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface Props {
  name: string
  children: React.ReactNode
}

interface State {
  hasError: boolean
}

class SectionErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Section error:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card>
          <CardHeader>
            <CardTitle>{this.props.name} failed to load</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
              Reload
            </Button>
          </CardContent>
        </Card>
      )
    }
    return this.props.children
  }
}

export { SectionErrorBoundary }
