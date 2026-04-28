'use client'

import { useEffect, useState, useRef } from 'react'

export function LogTerminal({ maxLines = 50 }: { maxLines?: number }) {
  const [logs, setLogs] = useState<string[]>([])
  const [paused, setPaused] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const [autoScroll, setAutoScroll] = useState(true)

  useEffect(() => {
    const fetchLogs = async () => {
      if (paused) return
      try {
        const res = await fetch('/api/proxy/daemon/logs?lines=' + maxLines)
        const data = await res.json()
        if (data.logs) {
          setLogs(data.logs.slice(-maxLines))
        }
      } catch (_) {
        // ignore
      }
    }

    fetchLogs()
    const interval = setInterval(fetchLogs, 5000)
    return () => clearInterval(interval)
  }, [maxLines, paused])

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50
    setAutoScroll(atBottom)
  }

  const buttonClass = paused
    ? 'px-2 py-1 rounded text-xs bg-yellow-500/20 text-yellow-400'
    : 'px-2 py-1 rounded text-xs bg-zinc-800 text-zinc-400'

  return (
    <div className="bg-black rounded-lg border border-zinc-800 font-mono text-xs overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900">
        <span className="text-zinc-400">Daemon Logs</span>
        <button onClick={() => setPaused(p => !p)} className={buttonClass}>
          {paused ? 'Resume' : 'Pause'}
        </button>
      </div>

      <div className="h-64 overflow-y-auto p-3 space-y-0.5" onScroll={handleScroll}>
        {logs.length === 0 && (
          <span className="text-zinc-600">Esperando logs...</span>
        )}
        {logs.map((line, i) => {
          const isError = /error|fail|warn/i.test(line)
          const isOk = /connected|started|ok|online/i.test(line)
          const colorClass = isError ? 'text-red-400' : isOk ? 'text-green-400' : 'text-zinc-300'
          return (
            <div key={i} className={'leading-relaxed ' + colorClass}>
              {line}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
