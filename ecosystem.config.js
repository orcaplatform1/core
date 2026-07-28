module.exports = {
  apps: [
    {
      name: "orca-backend",
      cwd: "./backend",
      script: "npm",
      args: "run start:prod",
      namespace: "default",
    },
    {
      name: "orca-frontend",
      cwd: "./frontend",
      script: "npm",
      args: "start -- -p 3001",
      namespace: "default",
    },
    {
      name: "orca-sentiment",
      cwd: "./sentiment-service",
      script: "./venv/bin/uvicorn",
      args: "main:app --host 127.0.0.1 --port 8001",
      interpreter: "none",
      namespace: "default",
    },
  ],
};
