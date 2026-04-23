import pm2 from 'pm2'
import { config } from '../config.js'
import type { DaemonStatus } from '../../../../packages/shared/types'

class DaemonService {
  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      pm2.connect((err: Error | null) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  async getStatus(): Promise<DaemonStatus> {
    try {
      await this.connect()
      const proc = await this.getProcess()

      if (!proc) {
        return { running: false, leads_processed_today: 0 }
      }

      const meta = proc.pm2_env as Record<string, any>
      const now = Date.now()
      const startedAt = meta.pm_uptime ? meta.pm_uptime : now

      return {
        running: proc.pm2_env?.status === 'online',
        pid: meta.pid as number,
        uptime: Math.floor((now - startedAt) / 1000),
        leads_processed_today: (meta.leads_processed_today as number) || 0,
        next_run: meta.cron_restart as string || undefined,
        last_run: meta.last_restart as string || undefined
      }
    } catch (err) {
      console.error('[Daemon] getStatus error:', err)
      return { running: false, leads_processed_today: 0 }
    } finally {
      pm2.disconnect()
    }
  }

  private async getProcess(): Promise<any> {
    return new Promise((resolve) => {
      pm2.list((err: Error | null, list: any[]) => {
        if (err || !list) return resolve(null)
        const daemon = list.find((p: any) => p.name === 'wolfim-daemon')
        resolve(daemon || null)
      })
    })
  }

  async start(): Promise<{ ok: boolean; pid?: number }> {
    try {
      await this.connect()
      await this.launchDaemon()
      return { ok: true, pid: 0 }
    } catch (err) {
      console.error('[Daemon] start error:', err)
      return { ok: false }
    } finally {
      pm2.disconnect()
    }
  }

  async stop(): Promise<{ ok: boolean }> {
    try {
      await this.connect()
      await this.stopProcess()
      return { ok: true }
    } catch (err) {
      console.error('[Daemon] stop error:', err)
      return { ok: false }
    } finally {
      pm2.disconnect()
    }
  }

  async restart(): Promise<{ ok: boolean }> {
    try {
      await this.connect()
      await this.restartProcess()
      return { ok: true }
    } catch (err) {
      console.error('[Daemon] restart error:', err)
      return { ok: false }
    } finally {
      pm2.disconnect()
    }
  }

  private launchDaemon(): Promise<void> {
    return new Promise((resolve, reject) => {
      pm2.start(
        {
          script: config.daemonScript,
          name: 'wolfim-daemon',
          instances: 1,
          autorestart: false
        },
        (err: Error | null) => {
          if (err) reject(err)
          else resolve()
        }
      )
    })
  }

  private stopProcess(): Promise<void> {
    return new Promise((resolve, reject) => {
      pm2.stop('wolfim-daemon', (err: Error | null) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  private restartProcess(): Promise<void> {
    return new Promise((resolve, reject) => {
      pm2.restart('wolfim-daemon', (err: Error | null) => {
        if (err) reject(err)
        else resolve()
      })
    })
  }

  async getLogs(lines: number = 50): Promise<{ logs: string[]; timestamp: string }> {
    try {
      await this.connect()
      return new Promise((resolve) => {
        pm2.list((err: Error | null, list: any[]) => {
          if (err || !list) return resolve({ logs: [], timestamp: new Date().toISOString() })
          const daemon = list.find((p: any) => p.name === 'wolfim-daemon')
          if (!daemon) return resolve({ logs: [], timestamp: new Date().toISOString() })

          const out = (daemon.pm2_env as any)?.pm_out_logs?.toString() || ''
          const errLog = (daemon.pm2_env as any)?.pm_err_logs?.toString() || ''
          const combined = (out + '\n' + errLog).split('\n').filter(Boolean).slice(-lines)
          resolve({ logs: combined, timestamp: new Date().toISOString() })
        })
      })
    } catch {
      return { logs: [], timestamp: new Date().toISOString() }
    } finally {
      pm2.disconnect()
    }
  }
}

const daemonService = new DaemonService()

export { daemonService }