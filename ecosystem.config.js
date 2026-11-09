module.exports = {
  apps: [
    {
      name: "alrio-private-resort",
      script: "node_modules/.bin/next",
      args: "start",
      interpreter: "pnpm",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 1505,
      },
    },
  ],
};