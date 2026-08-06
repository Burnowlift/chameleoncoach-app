# 🦎 Chameleon Coach

> Plataforma de consultoria online de treinamento que conecta treinadores e alunos com periodização inteligente, acompanhamento em tempo real e treinos que evoluem com você.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5-646cff?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-3fcf8e?logo=supabase&logoColor=white)](https://supabase.com/)
[![shadcn/ui](https://img.shields.io/badge/shadcn/ui-latest-000000)](https://ui.shadcn.com/)
[![Netlify](https://img.shields.io/badge/Deploy-Netlify-00c7b7?logo=netlify&logoColor=white)](https://netlify.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 Sumário

- [Visão geral](#-visão-geral)
- [Funcionalidades](#-funcionalidades)
- [Stack tecnológica](#-stack-tecnológica)
- [Estrutura do projeto](#-estrutura-do-projeto)
- [Começando](#-começando)
- [Scripts disponíveis](#-scripts-disponíveis)
- [Testes](#-testes)
- [Deploy](#-deploy)
- [Segurança](#-segurança)
- [Documentação](#-documentação)

---

## 👀 Visão geral

O **Chameleon Coach** é uma plataforma dupla de treinamento online:

| | 🧑‍🏫 Portal do Treinador | 🏋️ Portal do Aluno |
|---|---|---|
| **Acesso** | Login privado, por convite | Autocadastro ou criação pelo treinador |
| **Conteúdo** | Alunos, blocos, treinos, rankings, finanças | Dashboard, treinos, check-ins, mobilidade |
| **Experiência** | Painel completo de gestão | Tema escuro "Jaguar" focado no app mobile |

O aluno acompanha sua evolução (força 1RM, peso corporal, check-ins, XP e ranking), enquanto o treinador gerencia a periodização, templates, feedbacks, anamnese e até a **vida financeira** (pessoal e da empresa) com auxílio de IA.

---

## ✨ Funcionalidades

### Treinador
- 📊 **Gestão de alunos** — perfis, planos, valores, contatos e evolução.
- 🗓️ **Blocos e periodização** — semanas, sessões, RPE por série, sobrescrita de 1RM.
- 🧬 **Anamnese** — formulário completo com fotos e arquivos (LGPD sensível).
- ✅ **Check-ins semanais** — comentários do treinador e métricas dos alunos.
- 🏆 **Rankings e XP** — força (1RM), podium, campeonato com pedidas e exportação em PDF.
- 🧘 **Mobilidade** — banco de exercícios, templates e prescrição por aluno.
- 💰 **Finanças com IA** — extrato bancário (Inter/Nubank) parseado por IA, metas, recorrências e chat consultor financeiro.
- 🧰 **Templates de treino** — reutilizáveis por bloco/semana/sessão.
- 🗝️ **Controle de acesso** — permissões por menu e trilha de auditoria.

### Aluno
- 📱 **Dashboard** — treino do dia, progresso, XP e notificações.
- 🏋️ **Treinos** — log de exercícios, RPE, histórico de 1RM.
- 🩺 **Anamnese online** — preenchimento no app antes do primeiro treino.
- 📝 **Check-ins** — bem-estar semanal com histórico.
- 🧘 **Mobilidade prescrita** — rotinas do treinador com registros de conclusão.
- 📈 **Evolução** — peso corporal, força, rankings e medalhas de pódio.

---

## 🛠️ Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend | React 18, TypeScript 5, Vite 5 |
| Estilo | Tailwind CSS 3.4 + shadcn/ui + Radix UI |
| Estado | TanStack Query, React Hook Form + Zod |
| Rotas | React Router v6 |
| Backend | Supabase (Postgres, Auth, Storage, Realtime) |
| Edge Functions | Deno (Supabase Functions) |
| Gráficos | Recharts |
| Testes | Vitest + Testing Library, Playwright |
| Deploy | Netlify (CDN + headers) |

---

## 📁 Estrutura do projeto

```
chameleoncoach-app/
├── src/
│   ├── components/        # Componentes compartilhados e guards de rota
│   ├── hooks/             # Hooks de dados (auth, alunos, finanças, ranking...)
│   ├── pages/             # Páginas do portal do treinador e do aluno
│   ├── integrations/
│   │   └── supabase/      # Cliente Supabase + tipos gerados
│   ├── lib/               # Utilitários e lógica de domínio
│   └── test/              # Testes unitários e de integração
├── supabase/
│   ├── migrations/        # Migrações SQL (schema, RLS, triggers, funções)
│   ├── functions/         # Edge Functions Deno (auth, finanças, PDF)
│   └── config.toml        # Configuração local do Supabase
├── scripts/               # Scripts utilitários e de teste
├── public/                # Estáticos (favicon, sitemap, modelos)
├── netlify.toml           # Configuração de deploy e headers
└── vite.config.ts
```

---

## 🚀 Começando

### Pré-requisitos

- [Bun](https://bun.sh) ou [Node.js](https://nodejs.org) 20+
- Uma instância do [Supabase](https://supabase.com) (ou o CLI local)

### Instalação

```bash
# 1. Instale as dependências
bun install        # ou npm install

# 2. Configure as variáveis de ambiente
cp .env.example .env   # crie manualmente com os valores abaixo
```

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=SUA-ANON-KEY
```

### Rodando localmente

```bash
bun run dev        # ou npm run dev
# App disponível em http://localhost:8080
```

### Banco de dados

As migrações SQL estão em `supabase/migrations/`. Aplique-as com o CLI do Supabase:

```bash
supabase link --project-ref <project-id>
supabase db push
```

### Edge Functions

As functions usam as variáveis de ambiente do projeto (ex.: `SUPABASE_SERVICE_ROLE_KEY`, `LOVABLE_API_KEY`):

```bash
supabase functions deploy --project-ref <project-id>
```

---

## 📜 Scripts disponíveis

| Comando | Descrição |
|---|---|
| `bun run dev` | Servidor de desenvolvimento (porta 8080) |
| `bun run build` | Build de produção (Vite) |
| `bun run build:dev` | Build em modo development |
| `bun run lint` | ESLint em todo o código |
| `bun run test` | Testes unitários (Vitest) |
| `bun run test:watch` | Testes em modo watch |
| `bun run preview` | Preview do build de produção |

---

## 🧪 Testes

```bash
bun run test              # Vitest (unitários e de integração)
bun run playwright test   # E2E (Playwright)
```

Existe uma suíte de testes de RLS/policies em `scripts/` (`test_policies.js`, `test_live_policy.js`, etc.) para validar o acesso aos dados contra a instância real do Supabase.

---

## 🚢 Deploy

O projeto é implantado na **Netlify** a partir do `dist/`:

```bash
bun run build
netlify deploy --prod
```

O `netlify.toml` já configura cache de assets, fallback SPA (`/* → /index.html`) e headers de cache.

---

## 🔒 Segurança

O projeto adota **Row Level Security (RLS)** em todas as tabelas, autenticação via Supabase Auth e Edge Functions protegidas com verificação de JWT. Um relatório completo com achados e prioridades está em [docs/security-report.md](docs/security-report.md) — inclui pontos de atenção como o bucket público de anamnese e exposição via `get_strength_ranking()`.

> ⚠️ **Importante:** antes de colocar em produção com dados reais, revise as recomendações de segurança.

---

## 📚 Documentação

- [Relatório de segurança](docs/security-report.md)
- [Plano de melhorias de segurança](docs/security-improvements-plan.md)
- [Plano mobile + PWA](docs/mobile-pwa-plan.md)
- [Plano de melhorias de UI/UX, evolução e gamificação](docs/ui-ux-improvements-plan.md)

---

Feito com 💚 para treinadores e alunos que evoluem juntos.
