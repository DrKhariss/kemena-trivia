import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';

const app = express();
const DEFAULT_PORT = 3000;
const requestedPort = Number(process.env.PORT);
const initialPort = Number.isNaN(requestedPort) ? DEFAULT_PORT : requestedPort;

app.use(express.json());

// API health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

function startListening(port: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = app.listen(port, '0.0.0.0', () => {
      console.log(`Server running on http://localhost:${port}`);
      resolve(port);
    });

    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code === 'EADDRINUSE') {
        const nextPort = port + 1;
        console.warn(`Port ${port} is already in use. Trying ${nextPort}...`);
        startListening(nextPort).then(resolve).catch(reject);
      } else {
        reject(error);
      }
    });
  });
}

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  await startListening(initialPort);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
