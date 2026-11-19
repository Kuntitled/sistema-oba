# 🌀 Sistema OBA — Arquitetura e Guia Mestre do Projeto

> **OBA** — _Open Beyblade Amazonas_ | Liga oficial de Beyblade X do Amazonas  
> Documento de referência para todas as sessões de desenvolvimento. Leia antes de modificar qualquer parte do sistema.

---

## 📋 Sumário

1. [Visão Geral](#visão-geral)
2. [Stack Tecnológica](#stack-tecnológica)
3. [Roadmap de Fases](#roadmap-de-fases)
4. [Estrutura de Pastas](#estrutura-de-pastas)
5. [Padrões de Código](#padrões-de-código)
6. [Modelagem do Banco de Dados](#modelagem-do-banco-de-dados)
7. [Autenticação e Autorização](#autenticação-e-autorização)
8. [PWA e Mobile-First](#pwa-e-mobile-first)
9. [Variáveis de Ambiente](#variáveis-de-ambiente)
10. [Fluxo de Deploy](#fluxo-de-deploy)

---

## 🎯 Visão Geral

Sistema web de gestão completa da liga de **Beyblade X do Amazonas**, cobrindo:

- **Vitrine pública** com ranking geral, perfis de Bladers e histórico de torneios
- **Painel administrativo** protegido para criação e gestão de torneios
- **Motor de torneios ao vivo** com geração automática de chaves e placar em tempo real
- **Inscrições e check-in** de jogadores com controle de Staff/Juízes
- **Estatísticas de meta regional** com registro de Decks/Combos

**Requisitos não-funcionais principais:**
- 100% responsivo, estratégia **Mobile-First** (jogadores e juízes usarão celular durante eventos)
- **PWA** — instalável na tela inicial de dispositivos móveis, com offline fallback básico
- Custo zero de infraestrutura (Free Tiers de Supabase e Vercel)
- Tempo real via Supabase Realtime para placares ao vivo (Fase 2+)

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia | Justificativa |
|--------|-----------|---------------|
| **Framework** | [Next.js 15](https://nextjs.org) (App Router) + React + TypeScript | SSR/SSG, rotas de API, Image Optimization nativas |
| **Estilização** | [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) | Utility-first, componentes acessíveis, tema escuro/claro |
| **Banco de Dados** | [Supabase](https://supabase.com) (PostgreSQL gerenciado) | Free tier generoso, Row Level Security (RLS) nativo |
| **Autenticação** | Supabase Auth | SSO, magic link, JWT integrado ao RLS |
| **Tempo Real** | Supabase Realtime | WebSockets gerenciados, sem infra adicional |
| **Hospedagem** | [Vercel](https://vercel.com) | Deploy automático por PR, CDN global, free tier |
| **PWA** | `next-pwa` / Web App Manifest nativo | Instalação mobile, offline cache básico |

---

## 🗺️ Roadmap de Fases

### ✅ Fase 1 — MVP (Foco Atual)

**Objetivo:** Ter algo útil e público o mais rápido possível.

**Vitrine Pública (`/`):**
- Página inicial com identidade visual da liga
- Ranking Geral (tabela de classificação com pontos acumulados)
- Listagem de torneios passados e resultados
- Perfil público de cada Blader

**Painel Administrativo (`/admin`):**
- Login protegido (somente admins cadastrados no Supabase)
- CRUD de Bladers (nome, apelido, cidade, foto)
- Criação de Torneios (nome, data, local, formato, status)
- Lançamento manual de resultados e pontuação final por torneio

**Entregáveis técnicos:**
- Schema do banco (Fase 1) no Supabase
- RLS básico (admin vs. público)
- Deploy funcional na Vercel

---

### 🔄 Fase 2 — Motor de Torneios ao Vivo

**Objetivo:** Automatizar a geração de chaves e transmitir placares em tempo real.

**Funcionalidades:**
- Gerador automático de chaveamentos:
  - **Swiss System** (recomendado para ligas regulares)
  - **Single Elimination** (mata-mata)
  - **Double Elimination** (com repescagem)
- Regras oficiais de pontuação de Beyblade X:
  - Spin Finish → **1 ponto**
  - Over Finish / Burst Finish → **2 pontos**
  - Xtreme Finish → **3 pontos**
- Critérios de desempate:
  - **Buchholz** (soma dos pontos dos adversários)
  - **Saldo de pontos** (pontos feitos − pontos sofridos)
  - **Confronto direto**
- Atualização em **tempo real** via Supabase Realtime
- Visualização de brackets interativa

**Entregáveis técnicos:**
- Tabelas: `matches`, `match_results`, `brackets`
- Funções de banco (Stored Procedures) para cálculo Swiss
- Hooks React com subscriptions Realtime

---

### 👥 Fase 3 — Inscrições & Staff

**Objetivo:** Permitir que jogadores se inscrevam online e que juízes operem o sistema.

**Funcionalidades:**
- **Pré-inscrição pública** de Bladers em torneios futuros
- **Check-in no dia** (confirmação de presença, controle de vagas)
- **Nível de acesso para Juízes** — podem lançar placares de arenas específicas, mas não gerenciam o torneio
- Notificações (push via PWA) para chamadas de rodada

**Roles do sistema:**
| Role | Permissões |
|------|-----------|
| `public` | Visualizar tudo |
| `blader` | Se inscrever, ver próprio perfil |
| `judge` | Lançar placares das arenas designadas |
| `admin` | Acesso total |

---

### 📊 Fase 4 — Meta & Estatísticas

**Objetivo:** Enriquecer o sistema com dados de meta-game regional.

**Funcionalidades:**
- Registro opcional de **Deck/Combo** por Blader por torneio:
  - **Blade** (ex: Dran Sword, Knight Shield...)
  - **Ratchet** (ex: 3-60, 5-60...)
  - **Bit** (ex: Flat, Needle, Point...)
- Estatísticas do **meta regional** (combos mais usados, win rates)
- **Head-to-Head** — histórico de confrontos entre dois Bladers específicos
- Dashboard com gráficos (Recharts / Victory Native)

---

## 📁 Estrutura de Pastas

```
sistema-oba/
├── public/                     # Assets estáticos
│   ├── icons/                  # Ícones PWA (192x192, 512x512, etc.)
│   └── images/                 # Imagens gerais
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (public)/           # Grupo de rotas públicas
│   │   │   ├── page.tsx        # Home — Vitrine / Ranking
│   │   │   ├── torneios/       # Listagem e detalhe de torneios
│   │   │   └── bladers/        # Perfis públicos de Bladers
│   │   ├── (admin)/            # Grupo de rotas admin (protegidas)
│   │   │   ├── layout.tsx      # Layout com sidebar admin + auth guard
│   │   │   ├── dashboard/      # Visão geral do admin
│   │   │   ├── bladers/        # CRUD de Bladers
│   │   │   └── torneios/       # Criação e gestão de torneios
│   │   ├── auth/               # Fluxos de autenticação
│   │   │   ├── login/
│   │   │   └── callback/       # OAuth callback do Supabase
│   │   ├── api/                # Route Handlers (Next.js)
│   │   │   └── [...]/
│   │   ├── layout.tsx          # Root layout (providers, fonts, metadata)
│   │   ├── manifest.ts         # Web App Manifest (PWA)
│   │   └── globals.css         # Estilos globais + variáveis CSS
│   ├── components/
│   │   ├── ui/                 # Componentes shadcn/ui (auto-gerados)
│   │   ├── layout/             # Header, Footer, Sidebar, Nav
│   │   ├── ranking/            # Tabela de ranking, card de Blader
│   │   ├── tournament/         # Cards de torneio, brackets, placares
│   │   └── shared/             # Componentes reutilizáveis genéricos
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts       # Supabase browser client
│   │   │   ├── server.ts       # Supabase server client (RSC / Server Actions)
│   │   │   └── middleware.ts   # Auth middleware helper
│   │   ├── utils.ts            # cn() e utilitários gerais
│   │   └── constants.ts        # Constantes do domínio (pontos, formatos)
│   ├── hooks/                  # Custom React hooks
│   │   ├── use-ranking.ts
│   │   └── use-realtime.ts     # Supabase Realtime subscription hook
│   ├── types/                  # TypeScript types e interfaces do domínio
│   │   ├── database.ts         # Tipos gerados do schema Supabase
│   │   └── domain.ts           # Tipos de negócio (Blader, Tournament, etc.)
│   └── middleware.ts           # Next.js middleware (proteção de rotas admin)
├── supabase/
│   ├── migrations/             # Arquivos SQL de migração
│   └── seed.sql                # Dados iniciais de teste
├── .env.local                  # Variáveis de ambiente (não versionado)
├── .env.example                # Template de variáveis (versionado)
├── ARCHITECTURE.md             # Este arquivo — guia mestre
├── next.config.ts              # Configuração do Next.js
├── tailwind.config.ts          # Configuração do Tailwind
├── components.json             # Configuração do shadcn/ui
└── tsconfig.json               # Configuração do TypeScript
```

---

## 📐 Padrões de Código

### Nomenclatura
- **Componentes React:** PascalCase (`BladerCard.tsx`)
- **Hooks:** camelCase com prefixo `use` (`useRanking.ts`)
- **Utilitários/Helpers:** camelCase (`formatPoints.ts`)
- **Constantes:** SCREAMING_SNAKE_CASE (`MAX_PLAYERS_SWISS`)
- **Tabelas do banco:** snake_case plural (`tournament_results`)

### Componentes
- Preferir **Server Components** (RSC) por padrão — apenas adicionar `"use client"` quando necessário (interatividade, hooks, browser APIs)
- **Server Actions** para mutações de dados (evitar Route Handlers desnecessários)
- Componentes de UI atômicos em `components/ui/` (shadcn), compostos em subpastas por domínio

### Estilização
- **Mobile-First** sempre: `sm:` modifica para telas maiores, não o contrário
- Variáveis CSS para cores do tema (definidas em `globals.css`) para suporte a dark/light mode
- Evitar estilos inline; preferir classes Tailwind ou variáveis CSS

### TypeScript
- **Sem `any`** — sempre tipar explicitamente
- Tipos do banco gerados automaticamente via Supabase CLI (`supabase gen types`)
- Interfaces de domínio separadas dos tipos de banco em `types/domain.ts`

### Git
- Branch principal: `main` (produção)
- Branches de feature: `feat/nome-da-feature`
- Commits: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)
- PRs obrigatórios para merge na `main` (mesmo sendo time solo — disciplina)

---

## 🗄️ Modelagem do Banco de Dados

> Schema completo definido e incrementado por fase. Migrações em `supabase/migrations/`.

### Fase 1 — Tabelas Base

```sql
-- Perfis de jogadores (vinculado ao Supabase Auth)
CREATE TABLE bladers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name        TEXT NOT NULL,
  nickname    TEXT UNIQUE NOT NULL,
  city        TEXT,
  avatar_url  TEXT,
  bio         TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Torneios
CREATE TABLE tournaments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT UNIQUE NOT NULL,
  description TEXT,
  location    TEXT,
  event_date  DATE NOT NULL,
  format      TEXT NOT NULL CHECK (format IN ('swiss','single_elim','double_elim')),
  status      TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','ongoing','finished')),
  max_players INTEGER,
  created_by  UUID REFERENCES auth.users(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Resultados finais por torneio (Fase 1: lançamento manual)
CREATE TABLE tournament_results (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id   UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  blader_id       UUID NOT NULL REFERENCES bladers(id) ON DELETE CASCADE,
  final_position  INTEGER NOT NULL,
  points_earned   INTEGER NOT NULL DEFAULT 0,  -- Pontos de ranking ganhos
  UNIQUE(tournament_id, blader_id),
  UNIQUE(tournament_id, final_position)
);

-- Tabela de ranking geral (calculada/materializada)
CREATE TABLE ranking (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  blader_id       UUID NOT NULL UNIQUE REFERENCES bladers(id) ON DELETE CASCADE,
  total_points    INTEGER NOT NULL DEFAULT 0,
  tournaments_played INTEGER NOT NULL DEFAULT 0,
  best_position   INTEGER,
  updated_at      TIMESTAMPTZ DEFAULT now()
);
```

### RLS (Row Level Security) — Fase 1

```sql
-- Leitura pública para dados de vitrine
ALTER TABLE bladers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public read bladers" ON bladers FOR SELECT USING (true);
CREATE POLICY "admin write bladers" ON bladers FOR ALL USING (
  EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid() AND raw_user_meta_data->>'role' = 'admin')
);
```

---

## 🔐 Autenticação e Autorização

### Fluxo de Auth (Fase 1)
1. Admin acessa `/auth/login` → email + senha (Supabase Auth)
2. Supabase retorna JWT → armazenado em cookie HttpOnly via `@supabase/ssr`
3. `middleware.ts` do Next.js intercepta rotas `/admin/*` → verifica sessão válida e role `admin`
4. Server Components leem o usuário via `createServerClient()` do `@supabase/ssr`

### Roles via `user_metadata`
```json
{ "role": "admin" }   // Acesso total
{ "role": "judge" }   // Fase 3
{ "role": "blader" }  // Fase 3
```

---

## 📱 PWA e Mobile-First

### Manifest (`src/app/manifest.ts`)
- `display: "standalone"` — sem barra de browser
- `orientation: "portrait"` — otimizado para celular
- `theme_color` e `background_color` alinhados ao design system

### Ícones necessários
- `192x192` — ícone padrão Android
- `512x512` — splash screen / ícone HD
- `180x180` — Apple Touch Icon

### Service Worker (Fase 1 — básico)
- Cache do shell da aplicação (HTML, CSS, JS)
- Offline fallback simples (página "sem conexão")
- Estratégia: **Cache First** para assets, **Network First** para dados

---

## 🔑 Variáveis de Ambiente

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL do projeto Supabase | ✅ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública anon do Supabase | ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | Chave service_role (somente servidor) | Fase 2+ |
| `NEXT_PUBLIC_APP_URL` | URL pública da aplicação | Recomendada |

---

## 🚀 Fluxo de Deploy

```
Commit → Push → PR → Vercel Preview Deploy → Review → Merge main → Vercel Production Deploy
```

### Configurações Vercel
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Node.js Version:** 20.x
- **Env Vars:** Configuradas no painel Vercel (nunca no repositório)

### Supabase
- Usar **Supabase CLI** para gerenciar migrações localmente
- `supabase db push` para aplicar migrações em produção
- `supabase gen types typescript --local > src/types/database.ts` para atualizar tipos

---

## 🧩 Decisões Arquiteturais Importantes

1. **App Router (não Pages Router):** Layouts aninhados, Server Components e Server Actions são essenciais para a experiência que queremos.
2. **`@supabase/ssr` (não `@supabase/auth-helpers-nextjs`):** Pacote atual recomendado pela Supabase para App Router — gerencia cookies corretamente em RSC, Server Actions e Middleware.
3. **Route Groups `(public)` e `(admin)`:** Separam layouts sem afetar a URL — `/` serve a vitrine, `/admin` serve o painel sem `/public/` na URL.
4. **Server Actions para mutações:** Evita criar Route Handlers boilerplate — ações de formulário chamam Server Actions diretamente, com revalidação de cache via `revalidatePath`.
5. **Realtime via hook centralizado (`use-realtime.ts`):** Um único ponto de gestão de subscriptions para evitar memory leaks e conexões duplicadas.

---

*Última atualização: Novembro 2026 | Mantido pela equipe de desenvolvimento OBA*
