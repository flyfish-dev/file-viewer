import { useMemo } from 'react'

type PreviewState = 'idle' | 'loading' | 'ready' | 'error'

type PreviewBadgeProps = {
  type: string
  state: PreviewState
  filename: string
  onOpen?: (filename: string) => void
}

const toneByState: Record<PreviewState, string> = {
  idle: '#64748b',
  loading: '#2563eb',
  ready: '#16a34a',
  error: '#dc2626'
}

export function PreviewBadge({ type, state, filename, onOpen }: PreviewBadgeProps) {
  const label = useMemo(() => {
    return `${type.toUpperCase()} / ${state}`
  }, [type, state])

  return (
    <button
      className='preview-badge'
      style={{ borderColor: toneByState[state], color: toneByState[state] }}
      type='button'
      aria-label={`Open ${filename}`}
      onClick={() => onOpen?.(filename)}
    >
      <strong>{label}</strong>
      <span>{filename}</span>
    </button>
  )
}
