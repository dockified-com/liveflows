'use client'

import dynamic from 'next/dynamic'
import { useState } from 'react'
import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'
import '@excalidraw/excalidraw/index.css'

const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  { ssr: false, loading: () => <p>Loading canvas…</p> },
)

export default function SpikeCanvas() {
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null)
  const [changeCount, setChangeCount] = useState(0)

  if (typeof window !== 'undefined' && api) {
    // deliberate escape hatch for manual spike poking from devtools
    ;(window as unknown as { __spikeApi?: ExcalidrawImperativeAPI }).__spikeApi = api
  }

  return (
    <div style={{ height: '100vh', width: '100vw' }}>
      <div data-testid="change-count" style={{ position: 'absolute', zIndex: 10, top: 4, left: 4 }}>
        onChange fired: {changeCount}
      </div>
      <Excalidraw
        excalidrawAPI={(instance) => setApi(instance)}
        onChange={() => setChangeCount((n) => n + 1)}
      />
    </div>
  )
}
