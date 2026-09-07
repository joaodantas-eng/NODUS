import fs from 'fs';
import path from 'path';
import {defineConfig, Plugin} from 'vite';

function localDbPlugin(): Plugin {
  const dbPath = path.resolve(__dirname, 'db.json');
  return {
    name: 'local-db-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url && (req.url === '/api/db' || req.url.startsWith('/api/db?') || req.url.startsWith('/api/db/'))) {
          if (req.method === 'GET') {
            try {
              if (!fs.existsSync(dbPath)) {
                const initial = {
                  tasks: [],
                  habits: [],
                  events: [],
                  notes: [],
                  finances: { transactions: [] },
                  challenges: [],
                  workouts: [],
                  content: [],
                  reading: [],
                  diary: [],
                  dailyPlan: { expectedOfDay: '', mainTask: '', gratitude: '' },
                  settings: {
                    theme: 'dark',
                    accentColor: 'orange',
                    user: { name: '', username: '', email: '' },
                    koreProactive: true,
                    morningBriefing: '07:00',
                    nightSummary: true,
                    timezone: 'America/Sao_Paulo',
                    menuItems: {
                      habits: true,
                      workouts: true,
                      content: true,
                      notes: true,
                      reading: true,
                      diary: true
                    }
                  }
                };
                fs.writeFileSync(dbPath, JSON.stringify(initial, null, 2), 'utf-8');
              }
              const data = fs.readFileSync(dbPath, 'utf-8');
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(data);
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json; charset=utf-8');
              res.end(JSON.stringify({ error: err.message }));
            }
            return;
          }
          if (req.method === 'POST') {
            let body = '';
            req.setEncoding('utf-8');
            req.on('data', (chunk: any) => { body += chunk; });
            req.on('end', () => {
              try {
                const parsed = JSON.parse(body);
                fs.writeFileSync(dbPath, JSON.stringify(parsed, null, 2), 'utf-8');
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ success: true }));
              } catch (err: any) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json; charset=utf-8');
                res.end(JSON.stringify({ error: err.message }));
              }
            });
            return;
          }
        }
        next();
      });
    }
  };
}

export default defineConfig(() => {
  return {
    plugins: [localDbPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
