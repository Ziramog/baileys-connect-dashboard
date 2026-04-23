export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  apiSecret: process.env.API_SECRET || '',
  authSessionPath: process.env.AUTH_SESSION_PATH || '/data/auth-session',
  dbPath: process.env.DB_PATH || '/data/wolfim.db',
  daemonScript: process.env.DAEMON_SCRIPT || '/home/hermes/workspace/autonomous-daemon/daemon.js',
  allowedOrigin: process.env.ALLOWED_ORIGIN || '*',
  nodeEnv: process.env.NODE_ENV || 'development'
}