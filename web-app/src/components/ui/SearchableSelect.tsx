import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Search } from 'lucide-react'

interface Option {
  value: string
  label: string
}

interface SearchableSelectProps {
  value: string
  onChange: (value: string) => void
  options: Option[]
  placeholder?: string
}

export function SearchableSelect({ value, onChange, options, placeholder = 'Select...' }: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  const selected = options.find(o => o.value === value)

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => { setOpen(!open); setQuery('') }}
        className="w-full flex items-center justify-between px-3 py-2 rounded-md text-sm border border-white/30 bg-white/10 backdrop-blur-md text-white"
      >
        <span className={selected ? 'text-white' : 'text-gray-400'}>{selected?.label || placeholder}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-white/20 bg-slate-800 shadow-xl max-h-60 overflow-y-auto">
          <div className="sticky top-0 bg-slate-800 p-1 border-b border-white/10">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full pl-8 pr-2 py-1.5 rounded text-xs bg-white/10 border border-white/20 text-white placeholder-gray-400"
                placeholder="Search..."
              />
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-gray-400">No results</div>
          ) : (
            filtered.map(o => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false) }}
                className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                  value === o.value ? 'bg-cyan-500/20 text-cyan-300' : 'text-white hover:bg-white/10'
                }`}
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
