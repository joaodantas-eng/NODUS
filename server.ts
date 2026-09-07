/**
 * Nodus — Server Entry Point
 * 
 * Servidor Express integrado com Vite (dev) e arquivos estáticos (prod),
 * servindo as rotas de API em /api.
 */
import "dotenv/config";
import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { apiRouter } from "./server/routes/apiRoutes.js";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// Rotas de API
app.use("/api", apiRouter);

// Inicialização do Servidor e montagem do Vite ou Arquivos Estáticos
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Nodus server rodando na porta ${PORT}`);
  });
}

startServer();
