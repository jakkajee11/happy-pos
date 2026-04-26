module.exports = {
  apps: [
    {
      name: "happy-pos",
      cwd: "./",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 21300
      }
    }
  ]
};