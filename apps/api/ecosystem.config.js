module.exports = {
  apps: [
    {
      name: 'wolfim-api',
      script: './dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    },
    {
      name: 'wolfim-daemon',
      script: '/home/hermes/workspace/autonomous-daemon/daemon.js',
      instances: 1,
      autorestart: false,
      watch: false,
      cron_restart: '0 8 * * 1-5'
    }
  ]
}