# ⚡ Nodus — Sistema de Produtividade, Foco & Execução

O **Nodus** é um aplicativo completo de produtividade pessoal e consistência diária, desenvolvido para ser rápido, modular e 100% focado no essencial.

Esta versão é a **base limpa** (sem nenhum dado prévio cadastrado), pronta para você utilizar ou compartilhar com outras pessoas.

---

## 🚀 Funcionalidades Integradas

- 🎯 **Dashboard Principal**: Saudação inteligente, visão rápida das prioridades do dia, plano diário (esperado do dia, foco principal e gratidão), widget financeiro e score de consistência.
- ✅ **Tarefas**: Gestão com níveis de prioridade (*Alta*, *Normal*, *Baixa*), filtros por status, busca em tempo real e ordenação.
- 🌱 **Hábitos**: Acompanhamento de hábitos diários com contagem automática de sequências (*streaks*).
- 📅 **Agenda**: Compromissos e reuniões organizados por data e horário.
- 💳 **Finanças**: Controle de receitas e despesas com categorização e saldo líquido em tempo real.
- 🔥 **Desafios**: Crie desafios de consistência personalizados (ex: 21 dias) com metas, pilares e check-ins diários.
- 🏋️ **Treinos**: Organização de divisões de treino com séries, repetições, cargas e histórico de execução.
- 📱 **Conteúdo**: Calendário e roteirização para redes sociais (Instagram, YouTube, etc.).
- 📚 **Leitura**: Acompanhamento de livros com progresso de páginas lidas, notas e status.
- 📔 **Diário**: Registro reflexivo matinal e noturno com humor e lições do dia.
- 🤖 **Krux IA**: Assistente de inteligência artificial de foco e execução. Possui um **Motor NLP Local 100% Offline** (interpreta comandos em linguagem natural e agenda compromissos, cria tarefas ou registra finanças de forma instantânea sem precisar de internet ou chaves) e **suporte opcional a modelos Gemini** na nuvem.

---

## 📋 Pré-requisitos

Para rodar o Nodus no seu computador, certifique-se de ter instalado:

1. **Node.js** (versão 18 ou superior) — [Download oficial](https://nodejs.org/)
2. Gerenciador de pacotes **npm** (já incluso no Node.js), **pnpm**, **yarn** ou **bun**.
3. *(Opcional para versão Desktop Nativa)*: Rust e Cargo para compilação com Tauri — [Guia oficial do Tauri](https://tauri.app/start/prerequisites/).

---

## 🛠️ Passo a Passo de Instalação (Mini Tutorial)

### 1. Baixar o projeto
Extraia os arquivos do projeto em uma pasta no seu computador ou clone o repositório via terminal:
```bash
git clone <url-do-repositorio>
cd nodus
```

### 2. Instalar as dependências
Abra o terminal na pasta do projeto e instale as dependências:
```bash
npm install
```

### 3. Configurar as variáveis de ambiente (Opcional)
Copie o arquivo de exemplo `.env.example` para `.env`:
```bash
cp .env.example .env
```
> **Nota sobre o Krux:** O aplicativo funciona perfeitamente sem nenhuma chave configurada graças ao seu **Motor Local Offline**. Caso queira habilitar o modo em nuvem com Gemini para conversas ampliadas, adicione sua chave em `GEMINI_API_KEY` dentro do arquivo `.env`.

---

## 💻 Como Executar a Aplicação

### Modo Web (Navegador)
Inicie o servidor de desenvolvimento:
```bash
npm run dev
```
Abra seu navegador e acesse:
👉 **`http://localhost:3000`**

### Gerar Build de Produção (Web)
Para compilar e iniciar a versão de produção otimizada:
```bash
npm run build
npm start
```

---

## 🖥️ Executando como Aplicativo Desktop Nativo (macOS, Windows, Linux)

O Nodus foi projetado para rodar nativamente via **Tauri**:

- **Iniciar em modo Desktop interativo:**
  ```bash
  npm run tauri:dev
  ```

- **Gerar o executável instalador final (.app / .dmg no Mac, .exe / .msi no Windows):**
  ```bash
  npm run tauri:build
  ```
  O binário compilado estará localizado na pasta `src-tauri/target/release/bundle/`.

---

## 🔒 Privacidade e Armazenamento dos Dados

- **100% Local e Privado**: Todos os seus dados são gravados localmente no arquivo `db.json` na raiz do projeto e espelhados de forma resiliente no `localStorage` do seu navegador.
- **Zero Rastreamento**: Nenhuma informação pessoal, tarefa, diário ou transação financeira é enviada para servidores externos sem o seu consentimento.
- **Backup Simples**: Para fazer backup ou migrar seus dados para outro computador, basta copiar o arquivo `db.json`.

---

## 📁 Estrutura do Projeto

```text
├── db.json                 # Banco de dados local (inicia limpo)
├── server.ts               # Servidor Express com API local (/api/db) e Krux
├── vite.config.ts          # Configuração do Vite e Tailwind CSS
├── index.html              # Ponto de entrada da interface
├── src/
│   ├── core/               # Inicialização, router e ciclo de vida da aplicação
│   ├── components/         # Header, Sidebar retrátil, Modais e Toasts
│   ├── modules/            # Módulos: Dashboard, Tarefas, Agenda, Hábitos, Finanças,
│   │                       # Desafios, Treinos, Conteúdo, Leitura, Diário, Perfil e Krux
│   ├── services/           # storageService (persistência) e kruxLocalEngine (NLP offline)
│   ├── styles/             # Estilos globais (main.css) e temas Dark/Light
│   └── utils/              # Manipulação de datas, ícones e prioridades
└── src-tauri/              # Configuração e código Rust para empacotamento Desktop
```

---

## 🎨 Personalização

Ao abrir o Nodus pela primeira vez:
1. Acesse o menu **Meu Perfil** no rodapé da barra lateral esquerda.
2. Digite seu **Nome Completo** para personalizar as saudações do Dashboard e do Krux.
3. Escolha seu tema favorito (**Modo Escuro** ou **Modo Claro**) e a cor de destaque desejada.
