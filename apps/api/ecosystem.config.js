module.exports = {
  apps: [
    {
      name: 'wolfim-api',
      script: 'dist/apps/api/src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        API_SECRET: 'wolfim-secret-2026-prod',
        AUTH_SESSION_PATH: '/data/auth-session',
        DB_PATH: '/data/wolfim.db',
        DAEMON_SCRIPT: '/home/hermes/workspace/wolfim-api/daemon.js',
        ALLOWED_ORIGIN: '*',
        SUPABASE_URL: 'https://mrrieeeilameejhvbccu.supabase.co',
        SUPABASE_SERVICE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ycmllZWVpbGFtZWVqaHZiY2N1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzE0MjE2NywiZXhwIjoyMDkyNzE4MTY3fQ.qvMcTYuwjJQY66SacBZJVGjDPDaPo9Z7QYie2bgZR-Y'
      }
    }
  ]
}