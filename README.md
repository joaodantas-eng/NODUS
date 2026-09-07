# ⚡ Nodus — Sistema Integrado de Produtividade, Foco & Execução

O **Nodus** é um sistema completo de gestão de rotina, produtividade pessoal e consistência diária. Desenvolvido para ser leve, rápido, privativo e sem fricção, ele integra planejamento diário, controle de hábitos, tarefas com prioridades, agenda, finanças, fichas de treino, controle de leituras, diário reflexivo e um assistente inteligente ativo com inteligência artificial (**Krux**).

---

## ✨ Funcionalidades Principais

- 🎯 **Dashboard Integrado**: Visão geral do dia, saudação inteligente, bloco de foco matinal (*O que você espera do dia*, *Principal tarefa* e *Gratidão*), resumo financeiro e score de consistência.
- ✅ **Gestão de Tarefas**: Criação e controle de tarefas com níveis de prioridade (*Alta*, *Normal*, *Baixa*), datas de entrega, horários e filtros por status.
- 🌱 **Rastreador de Hábitos**: Acompanhamento diário com cálculo automático de sequências ativas (*streaks*).
- 📅 **Agenda de Compromissos**: Visualização diária, semanal e mensal de reuniões e eventos.
- 💳 **Finanças Pessoais**: Lançamento de receitas e despesas com categorização e cálculo automático do saldo líquido.
- 🔥 **Desafios de Consistência**: Desafios personalizáveis (ex: 21 dias) com metas, pilares e sistema de check-in diário.
- 🏋️ **Divisões de Treino**: Organização de treinos com exercícios, séries, repetições, cargas e anotações.
- 📱 **Planejamento de Conteúdo**: Criação e roteirização de posts para redes sociais (Instagram, YouTube, etc.).
- 📚 **Controle de Leitura**: Acompanhamento de livros com barra de progresso por páginas lidas e notas.
- 📔 **Diário Pessoal**: Registros matinais e noturnos para reflexão, lições e acompanhamento de humor.
- 🤖 **IA Krux (Assistente de Foco e Execução)**:
  - **Motor Local Offline (Zero Configuração)**: Interpreta comandos em linguagem natural em português (*"marca reunião amanhã às 15h"*, *"tenho uma tarefa urgente: enviar proposta"*, *"gastei 45 no almoço"*) e executa ações reais no banco de dados em milissegundos sem precisar de internet ou chave de API.
  - **Suporte a IA em Nuvem (Google Gemini)**: Quando configurado com uma chave de API, permite diálogos abertos, análise de produtividade e mentoria personalizada.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend**: JavaScript (ESNext modular), HTML5, CSS3 com variáveis dinâmicas para temas Dark/Light.
- **Estilização**: Tailwind CSS v4.
- **Backend**: Node.js, Express, TypeScript (`tsx`).
- **Persistência**: Arquivo local `db.json` com sincronização resiliente em `localStorage`.
- **Inteligência Artificial**: Motor NLP Local próprio + SDK `@google/genai` (Gemini 3.8 / 2.5).
- **Desktop Nativo**: [Tauri v2](https://tauri.app/) (Rust) para empacotamento em instaladores nativos leves.
- **Build System**: Vite 6, esbuild.

---

## 📂 Estrutura do Projeto

```text
Nodus/
├── server/                     # Backend Express modular
│   ├── routes/
│   │   └── apiRoutes.ts        # Rotas da API (/api/db, /api/krux/chat)
│   └── services/
│       ├── geminiService.ts    # Conexão com a API do Google Gemini
│       └── kruxEngine.ts       # Motor NLP local e executor de ações do Krux
│
├── src/                        # Código-fonte da interface do usuário
│   ├── main.js                 # Ponto de entrada da aplicação
│   ├── core/                   # Inicialização (app.js) e roteador (router.js)
│   ├── components/             # Componentes de UI (Header, Sidebar, Modais, Toasts)
│   ├── modules/                # Módulos funcionais (Dashboard, Tarefas, Agenda, etc.)
│   ├── services/               # Camada de armazenamento e NLP client-side
│   ├── utils/                  # Utilitários de data, ícones e prioridade
│   └── styles/                 # Folha de estilos e variáveis CSS
│
├── src-tauri/                  # Código Rust e manifesto de configuração do Tauri
├── docs/                       # Documentação técnica e guia de arquitetura
├── public/                     # Ícones, favicons e manifestos estáticos
├── server.ts                   # Servidor Express integrado com Vite
├── vite.config.ts              # Configurações do Vite
├── tsconfig.json               # Configurações do TypeScript
├── package.json                # Dependências e scripts do projeto
├── .env.example                # Modelo de variáveis de ambiente
└── .gitignore                  # Arquivos ignorados pelo Git
```

---

## 🚀 Como Instalar e Executar

### 1. Pré-requisitos
- **Node.js** (versão 18 ou superior) — [Baixar Node.js](https://nodejs.org/)
- **npm** (incluso com o Node.js), **pnpm** ou **yarn**.
- *(Opcional para versão Desktop)*: Rust e Cargo instalados para compilar via Tauri.

### 2. Clonar e Instalar Dependências
```bash
# Clone o repositório
git clone https://github.com/seu-usuario/nodus.git
cd nodus

# Instale as dependências
npm install
```

### 3. Configurar Variáveis de Ambiente (Opcional)
Copie o modelo de ambiente:
```bash
cp .env.example .env
```

> ⚠️ **AVISO DE SEGURANÇA:**
> **Nunca publique seu arquivo `.env` ou sua chave de API no GitHub!** O arquivo `.env` já está listado no `.gitignore` para evitar vazamentos acidentais.

#### Como obter e configurar a chave da API Gemini (Opcional):
1. Acesse o [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Faça login com sua conta Google e clique em **"Create API key"**.
3. Copie a chave gerada e cole no seu arquivo `.env`:
   ```env
   GEMINI_API_KEY="sua_chave_aqui"
   ```
*(Caso não adicione a chave, o Nodus continuará funcionando 100% com o seu **Motor Krux Local Offline**).*

---

## 💻 Executando em Desenvolvimento (Modo Web)

Inicie o servidor de desenvolvimento:
```bash
npm run dev
```

Abra seu navegador no endereço:
👉 **`http://localhost:3000`**

Para verificar a integridade do código e tipos:
```bash
npm run lint
```

Para compilar o pacote de produção para web:
```bash
npm run build
npm start
```

---

## 🖥️ Gerando o Aplicativo Desktop Nativo (Tauri)

O Nodus pode ser executado e empacotado como um aplicativo nativo para **macOS**, **Windows** ou **Linux**:

### Executar em modo Desktop (Desenvolvimento):
```bash
npm run tauri:dev
```

### Gerar os instaladores finais para produção:
```bash
npm run tauri:build
```

Os executáveis instaladores serão gerados na pasta `src-tauri/target/release/bundle/`:
- **macOS**: `.dmg` e `.app`
- **Windows**: `.msi` e `.exe`
- **Linux**: `.deb` e `.AppImage`

---

## 🔒 Privacidade de Dados

- Todos os seus dados são salvos no arquivo `db.json` no próprio computador e espelhados no `localStorage` do navegador.
- O aplicativo não possui telemetria oculta nem envia seus registros para bancos de dados na nuvem.
- Para fazer backup dos seus dados, basta copiar o arquivo `db.json`.

---

## 📄 Licença

Distribuído sob a licença MIT. Veja `LICENSE` para mais informações.
