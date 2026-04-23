'use client'

import { useEffect, useState } from 'react'
import type { Settings } from '@/lib/types'

const defaultSettings: Settings = {
  business_hours: { start: '08:00', end: '17:00', timezone: 'America/Argentina/Cordoba', days: [1, 2, 3, 4, 5] },
  cities: [],
  message_templates: { intro: '', followup_1: '', followup_2: '' },
  cooldown_minutes: 30,
  daily_limit: 100
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [cityInput, setCityInput] = useState('')

  useEffect(() => {
    fetch('/api/proxy/settings')
      .then(r => r.json())
      .then(data => { if (Object.keys(data).length) setSettings(data) })
      .catch(() => {})
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setSaved(false)
    try {
      await fetch('/api/proxy/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {}
    finally { setSaving(false) }
  }

  const addCity = () => {
    if (cityInput.trim() && !settings.cities.includes(cityInput.trim())) {
      setSettings(s => ({ ...s, cities: [...s.cities, cityInput.trim()] }))
      setCityInput('')
    }
  }

  const removeCity = (city: string) => {
    setSettings(s => ({ ...s, cities: s.cities.filter(c => c !== city) }))
  }

  const toggleDay = (day: number) => {
    setSettings(s => ({
      ...s,
      business_hours: {
        ...s.business_hours,
        days: s.business_hours.days.includes(day)
          ? s.business_hours.days.filter(d => d !== day)
          : [...s.business_hours.days, day]
      }
    }))
  }

  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Configuración</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-green-500 text-zinc-950 font-semibold rounded-lg hover:bg-green-400 transition-colors disabled:opacity-50"
        >
          {saving ? 'Guardando...' : saved ? '✓ Guardado' : 'Guardar'}
        </button>
      </div>

      <div className="space-y-6">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="font-medium mb-4">Horario de negocio</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Desde</label>
              <input
                type="time"
                value={settings.business_hours.start}
                onChange={e => setSettings(s => ({ ...s, business_hours: { ...s.business_hours, start: e.target.value } }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Hasta</label>
              <input
                type="time"
                value={settings.business_hours.end}
                onChange={e => setSettings(s => ({ ...s, business_hours: { ...s.business_hours, end: e.target.value } }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
              />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs text-zinc-500 block mb-1">Zona horaria</label>
              <input
                type="text"
                value={settings.business_hours.timezone}
                onChange={e => setSettings(s => ({ ...s, business_hours: { ...s.business_hours, timezone: e.target.value } }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            {days.map((day, i) => (
              <button
                key={day}
                onClick={() => toggleDay(i + 1)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  settings.business_hours.days.includes(i + 1)
                    ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="font-medium mb-4">Ciudades</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={cityInput}
              onChange={e => setCityInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCity()}
              placeholder="Agregar ciudad"
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
            />
            <button onClick={addCity} className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">+</button>
          </div>
          <div className="flex flex-wrap gap-2">
            {settings.cities.map(city => (
              <span key={city} className="inline-flex items-center gap-1 px-3 py-1 bg-zinc-800 rounded-full text-sm">
                {city}
                <button onClick={() => removeCity(city)} className="text-zinc-500 hover:text-zinc-300">×</button>
              </span>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="font-medium mb-4">Plantillas de mensajes</h2>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Mensaje introductorio</label>
              <textarea
                value={settings.message_templates.intro}
                onChange={e => setSettings(s => ({ ...s, message_templates: { ...s.message_templates, intro: e.target.value } }))}
                placeholder="Hola {name}, te contactamos desde..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 resize-none"
                rows={3}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Seguimiento 1</label>
              <textarea
                value={settings.message_templates.followup_1}
                onChange={e => setSettings(s => ({ ...s, message_templates: { ...s.message_templates, followup_1: e.target.value } }))}
                placeholder="Hola {name}, quería seguir hablando sobre..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 resize-none"
                rows={3}
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Seguimiento 2</label>
              <textarea
                value={settings.message_templates.followup_2}
                onChange={e => setSettings(s => ({ ...s, message_templates: { ...s.message_templates, followup_2: e.target.value } }))}
                placeholder="Hola {name}, último mensaje..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 resize-none"
                rows={3}
              />
            </div>
            <p className="text-xs text-zinc-600">Variables: {'{name}'}, {'{city}'}</p>
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h2 className="font-medium mb-4">Límites y tiempos</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Mensajes por día</label>
              <input
                type="number"
                value={settings.daily_limit}
                onChange={e => setSettings(s => ({ ...s, daily_limit: parseInt(e.target.value) || 0 }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Cooldown (minutos)</label>
              <input
                type="number"
                value={settings.cooldown_minutes}
                onChange={e => setSettings(s => ({ ...s, cooldown_minutes: parseInt(e.target.value) || 0 }))}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}