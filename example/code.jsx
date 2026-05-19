import { useMemo, useState } from 'react'

const formatGroups = [
  { title: 'Documents', items: ['docx', 'pdf', 'ofd'] },
  { title: 'Drawings', items: ['dxf', 'dwg'] },
  { title: 'Code', items: ['js', 'ts', 'vue', 'json'] }
]

export function PreviewPicker({ onSelect }) {
  const [activeGroup, setActiveGroup] = useState('Documents')

  const visibleItems = useMemo(() => {
    return formatGroups.find(group => group.title === activeGroup)?.items || []
  }, [activeGroup])

  return (
    <section className="preview-picker">
      <nav aria-label="Preview groups">
        {formatGroups.map(group => (
          <button
            key={group.title}
            className={group.title === activeGroup ? 'active' : ''}
            type="button"
            onClick={() => setActiveGroup(group.title)}
          >
            {group.title}
          </button>
        ))}
      </nav>

      <ul>
        {visibleItems.map(type => (
          <li key={type}>
            <button type="button" onClick={() => onSelect(type)}>
              <strong>{type.toUpperCase()}</strong>
              <span>Open sample.{type}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
