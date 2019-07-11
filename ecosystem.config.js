// Settings for [PM2 Runtime](https://github.com/Unitech/pm2)
// Options reference: https://pm2.io/doc/en/runtime/reference/ecosystem-file/

require('dotenv').config();

module.exports = {
  apps : [{
    name: 'Edu365TextSearch',
    script: './server.js',    
    autorestart: true,
    watch: process.env.NODE_ENV === 'development',
    env: {
      NODE_ENV: 'development',
    },
    env_production: {
      NODE_ENV: 'production',
    },
  }],
};
