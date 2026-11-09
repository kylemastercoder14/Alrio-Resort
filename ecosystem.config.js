module.exports = {
  apps: [
    {
      name: "alrio-private-resort",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      watch: false,
      env: {
        NODE_ENV: "production",
        PORT: 1505,
      },
    },
  ],
};