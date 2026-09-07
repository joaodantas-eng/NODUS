# 🏛️ Arquitetura do Nodus

Este documento descreve a visão geral da arquitetura, fluxo de dados e organização dos módulos do **Nodus**.

---

## 📌 Visão Geral

O Nodus foi projetado com uma arquitetura híbrida:
1. **Frontend SPA Modular (Vanilla JS + Vite + Tailwind CSS)**: Interface reativa e rápida, sem o overhead de frameworks pesados para o estado local, garantindo inicialização quase instantânea.
2. **Camada de Persistência Híbrida**: Sincronização resiliente entre `localStorage` (cache de cliente para carregamento offline imediato) e `db.json` (banco de dados local em arquivo servido via Express API).
3. **Backend Express (`server/`)**: Gerencia o endpoint `/api/db` e provê a inteligência do Krux.
4. **Motor Krux IA Duplo**:
   - **Local Engine (Offline)**: Processador NLP em regex e regras contextuais para agendamentos, criação de tarefas, check-ins e lançamentos financeiros em milissegundos sem conexão de rede.
   - **Gemini Cloud (Opcional)**: Conexão com modelos Gemini (`gemini-3.8-flash`, `gemini-2.5-flash`) para raciocínio contextual ampliado quando a chave `GEMINI_API_KEY` estiver presente.
5. **Invólucro Desktop Nativo (Tauri + Rust)**: Empacota a aplicação como um executável de baixo consumo de memória para macOS, Windows e Linux.

---

## 🗂️ Estrutura de Diretórios

```text
Nodus/
├── server/                     # Backend Express modular
│   ├── routes/
│   │   └── apiRoutes.ts        # Rotas /api/db, /api/krux/chat, /api/health
│   └── services/
│       ├── geminiService.ts    # Conexão segura com SDK do Google Gemini
│       └── kruxEngine.ts       # Interpretador local NLP do Krux e executor de ações
│
├── src/                        # Frontend da aplicação
│   ├── main.js                 # Ponto de entrada do cliente
│   ├── core/                   # Orquestrador do ciclo de vida da aplicação
│   │   ├── app.js              # Controlador principal, ciclo de vida e renderização de views
│   │   └── router.js           # Roteador de navegação baseado em hash/rotas
│   ├── components/             # Componentes de interface compartilhados
│   │   ├── header.js           # Barra superior com título, score e atalho Krux
│   │   ├── sidebar.js          # Barra lateral colapsável com navegação e perfil
│   │   ├── modal.js            # Sistema centralizado de modais
│   │   └── toast.js            # Notificações contextuais
│   ├── modules/                # Módulos de negócio independentes
│   │   ├── dashboard.js        # Visão integrada com foco diário, hábitos e score
│   │   ├── tasks.js            # Gestão de tarefas com prioridades e filtros
│   │   ├── habits.js           # Rastreamento de hábitos e cálculo de sequências (streaks)
│   │   ├── agenda.js           # Calendário diário, semanal e mensal de eventos
│   │   ├── finances.js         # Controle financeiro de receitas, despesas e categorias
│   │   ├── challenges.js       # Desafios de consistência (ex: 21 dias) e check-ins
│   │   ├── workouts.js         # Fichas de treino, divisões, séries e cargas
│   │   ├── reading.js          # Gerenciamento de livros e progresso de páginas
│   │   ├── content.js          # Planejamento e roteiros para produção de conteúdo
│   │   ├── diary.js            # Diário matinal e noturno com humor e reflexões
│   │   ├── profile.js          # Configurações do usuário, tema (Dark/Light) e layout
│   │   └── krux.js             # Interface do chat interativo da IA Krux
│   ├── services/               # Serviços de frontend
│   │   ├── storageService.js   # Abstração de persistência (API <-> LocalStorage)
│   │   └── kruxLocalEngine.js  # Motor NLP para execução do Krux no cliente
│   ├── utils/                  # Utilitários de apoio
│   │   ├── dateUtils.js        # Formatação e operações de datas
│   │   ├── icons.js            # SVGs inline padronizados
│   │   ├── idGenerator.js      # Geração de IDs únicos para entidades
│   │   └── priority.js         # Constantes e classes de prioridade
│   └── styles/
│       └── main.css            # Folha de estilos global com variáveis CSS para Dark/Light
│
├── src-tauri/                  # Código Rust e manifesto de empacotamento desktop
│   ├── src/main.rs             # Ponto de entrada nativo do Tauri
│   ├── icons/                  # Ícones em resoluções para todas as plataformas
│   └── tauri.conf.json         # Configuração de janelas, permissões e build
│
├── docs/                       # Documentação técnica do projeto
│   └── ARCHITECTURE.md         # Este guia de arquitetura
│
├── public/                     # Arquivos estáticos servidos diretamente (favicons, ícones)
├── db.json                     # Banco de dados local em formato JSON (ignorado pelo git)
├── server.ts                   # Ponto de entrada do servidor (desenvolvimento e bundle)
├── vite.config.ts              # Configurações do Vite e plugins
├── tsconfig.json               # Configurações do compilador TypeScript
├── package.json                # Manifesto do projeto e dependências npm
├── .env.example                # Exemplo de configuração de variáveis de ambiente
├── .gitignore                  # Regras de exclusão de arquivos para o Git
└── README.md                   # Apresentação do projeto e instruções de uso
```

---

## 🔄 Fluxo de Dados e Persistência

1. **Leitura Inicial**:
   - Ao iniciar, o `StorageService` verifica se há dados no `localStorage`.
   - Paralelamente, uma requisição `GET /api/db` é disparada para puxar o estado mais recente do `db.json`.
   - Se o servidor responder, o `localStorage` é sincronizado com os dados oficiais do arquivo.

2. **Operações de Escrita (Mutação)**:
   - Qualquer criação, edição ou exclusão de tarefa, hábito ou finança invoca `StorageService.saveData()`.
   - Os dados são atualizados imediatamente no `localStorage` (garantindo resposta instantânea de UI).
   - O `StorageService` faz um `POST /api/db` para persistir no `db.json`.

3. **Interação com a IA Krux**:
   - Mensagem enviada -> `POST /api/krux/chat`.
   - O servidor avalia a mensagem:
     - Se contiver um comando direto de ação (*"marca reunião amanhã 15h"*): o **Krux Local Engine** detecta a intenção com alta confiança, atualiza o banco e responde em ~5ms.
     - Se for uma pergunta aberta de reflexão ou mentoria e houver `GEMINI_API_KEY`: envia para o modelo Gemini com o contexto resumido do usuário.
     - Se o modelo Gemini sugerir uma ação, o bloco ```action``` é validado, aplicado no `db.json` e a resposta é enviada ao frontend.
