'use client'

import React from 'react'
import { useMounted } from '@/hooks/use-mounted'

interface ClientOnlyProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const hasMounted = useMounted()

  if (!hasMounted) {
    return <>{fallback}</>
  }

  return <>{children}</>
}