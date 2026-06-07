// CIC Phase 7.15–7.20 Stability Soak — PM2 Supervision Config
// Auto-restarts on crash, enforces memory limits, captures logs

module.exports = {
  apps: [
    {
      name: 'cic-stability-orchestrate',
      cwd: './ingestion',
      script: 'npm',
      args: 'run orchestrate:stability',
      interpreter: 'none',

      // Auto-restart
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '2G',
      watch: false,

      // Stability
      merge_logs: true,
      autorestart: true,
      max_restarts: 5,
      min_uptime: '10m',

      // Logging
      output: '../logs/stability-soak.out.log',
      error: '../logs/stability-soak.err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Environment
      env: {
        NODE_ENV: 'test',
        STABILITY_DURATION: '12h',
        STABILITY_PHASE: '7.15-7.20',
      },

      // Graceful shutdown
      kill_timeout: 30000,
    },

    {
      name: 'cic-stability-test',
      cwd: './ingestion',
      script: 'npm',
      args: 'run test:stability',
      interpreter: 'none',

      // Only start this if explicitly enabled
      autostart: false,

      // Auto-restart
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '2G',
      autorestart: true,
      max_restarts: 3,
      min_uptime: '10m',

      // Logging
      output: '../logs/stability-test.out.log',
      error: '../logs/stability-test.err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // Environment
      env: {
        NODE_ENV: 'test',
        STABILITY_DURATION: '12h',
        STABILITY_PHASE: '7.15-7.20',
      },

      // Graceful shutdown
      kill_timeout: 30000,
    },
  ],

  // Monitoring & Health
  monitor_interval: 5000,
  autorestart_delay: 4000,
};
