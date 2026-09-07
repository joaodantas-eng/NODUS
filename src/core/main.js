/**
 * Ponto de entrada da aplicação
 */
import '../styles/main.css';
import { App } from './app.js';

document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.init().catch(err => {
    console.error('Erro ao inicializar aplicativo:', err);
  });
});
