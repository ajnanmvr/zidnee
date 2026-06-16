module.exports = {
  apps: [
    {
      name: "zidnee-api",
      script: "./apps/server/dist/src/index.js",
      cwd: "/home/ubuntu/zidnee",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};