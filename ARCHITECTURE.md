# 🌀 Sistema OBA — Arquitetura e Guia Mestre do Projeto

> **OBA** — _Organização de Beyblade do Amazonas_ | Liga oficial de Beyblade X do Amazonas  
> Documento mestre de referência técnica e de negócio. Leia antes de modificar ou estender qualquer módulo do sistema.

---

## 📋 Sumário

1. [Visão Geral & Status Atual](#visão-geral--status-atual)
2. [Stack Tecnológica Atual](#stack-tecnológica-atual)
3. [Design System & Identidade Visual](#design-system--identidade-visual)
4. [Roadmap & Status das Fases](#roadmap--status-das-fases)
5. [Regras de Negócio Estabelecidas](#regras-de-negócio-estabelecidas)
6. [Estrutura Real de Pastas](#estrutura-real-de-pastas)
7. [Modelagem do Banco de Dados (Supabase)](#modelagem-do-banco-de-dados-supabase)
8. [Autenticação e Proteção de Rotas (`proxy.ts`)](#autenticação-e-proteção-de-rotas-proxyts)
9. [PWA e Responsividade Mobile-First](#pwa-e-mobile-first)
10. [Variáveis de Ambiente & Deploy](#variáveis-de-ambiente--deploy)
11. [Diretrizes para a Próxima Sessão (Fase 2)](#diretrizes-para-a-próxima-sessão-fase-2)

---

## 🎯 Visão Geral & Status Atual

Sistema web progressivo (PWA) e responsivo (Mobile-First) voltado para a gestão completa da **Liga Oficial de Beyblade X do Amazonas (OBA)**, cobrindo:

- **Vitrine pública:** Ranking geral acumulado da liga, pódio dos Top 3, histórico de torneios e perfis dos competidores (Bladers).
- **Painel administrativo protegido:** Gestão de Bladers, criação de torneios (atuais e retroativos) e lançamento de resultados com motor de recálculo automático de ranking.
- **Ambiente de Produção Ativo:**
  - **Repositório GitHub:** `Kuntitled/sistema-oba` (Branch `main`)
  - **Produção Vercel:** [https://sistema-oba-alpha.vercel.app](https://sistema-oba-alpha.vercel.app)
  - **Banco Supabase:** PostgreSQL gerenciado com RLS ativo e autenticação JWT.

---

## 🛠️ Stack Tecnológica Atual

| Camada | Tecnologia | Detalhes & Justificativa |
|--------|-----------|--------------------------|
| **Framework** | Next.js 16 (App Router) + React 19 + TypeScript 5 | SSR dinâmico, Server Actions nativas, Turbopack |
| **Estilização** | Tailwind CSS v4 + `@base-ui/react` (shadcn/ui v4) | Utility-first moderno, variáveis CSS oklch, componentes acessíveis |
| **Tema** | `next-themes` | Suporte Dark/Light mode com persistência sem flicker |
| **Banco de Dados** | Supabase (PostgreSQL 15+) | Schema em `public`, RLS ativo, Grants explícitos |
| **Autenticação** | Supabase Auth (`@supabase/ssr`) | Cookies HttpOnly gerenciados pelo servidor e checados no `proxy.ts` |
| **Proteção de Rotas** | `src/proxy.ts` (Next.js 16) | Convenção moderna que substituiu o `middleware.ts` deprecado |
| **Hospedagem** | Vercel | CI/CD automático a cada push na branch `main` |
| **PWA** | Web App Manifest nativo (`src/app/manifest.ts`) | Ícones oficiais gerados do logo OBA (180x180, 192x192, 512x512) |

---

## 🎨 Design System & Identidade Visual

A identidade visual foi extraída com precisão do logotipo oficial da **Organização de Beyblade do Amazonas (OBA)**, que estampa o Curupira com cabelos de fogo, olhos em chamas, o arco roxo do BLADE X e a arena escura.

### Paleta Oficial

| Nome Semântico | Hex aproximado | Uso no Sistema |
|---|---|---|
| **Roxo OBA / Blade X** | `#bd08f5` | Cor primária (`--primary`), botões principais, glow roxo |
| **Laranja Fogo** | `#e96b00` | Cor de destaque (`--accent`), chamas, badges de torneio ativo |
| **Amarelo Chama** | `#edbd03` | Detalhes do pódio (1º lugar), olhos do Curupira, ícones de líder |
| **Maroon Escarlate** | `#860102` | Fundo interno de arena, badges secundários |
| **Preto Fundo** | `#0a0a0a` | Fundo dark padrão com glow temático de Beyblade X |

### Classes Utilitárias Criadas (`globals.css`)
- `.bg-fire-gradient`: Gradiente oficial do fogo (Maroon → Vermelho → Laranja → Amarelo).
- `.text-fire-gradient`: Texto gradiente fogo para títulos e destaques.
- `.border-glow-purple`: Sombra suave em tom roxo néon para cards selecionados.
- `.border-glow-fire`: Sombra suave em tom de fogo para partidas ao vivo e 1º colocado.

---

## 🗺️ Roadmap & Status das Fases

### ✅ Fase 1 — MVP (STATUS: CONCLUÍDO & EM PRODUÇÃO)
- [x] Setup inicial Next.js 16 + Tailwind CSS v4 + TypeScript + shadcn/ui.
- [x] Configuração Supabase (`client.ts`, `server.ts`, `proxy.ts`) com tipos estritos em `src/types/database.ts`.
- [x] Schemas SQL aplicados: `001_phase1_schema.sql` (tabelas e RLS) e `002_grant_permissions.sql` (GRANTs de API).
- [x] Suporte completo a PWA (Manifest e ícones derivados do logo).
- [x] **Vitrine Pública:**
  - Home (`/`) com Hero oficial, Pódio Top 3, busca instantânea e tabela de pontuação acumulada.
  - Regras oficiais ilustradas (Spin, Over, Burst, Xtreme).
  - Listagem de Torneios (`/torneios`) com badges de status e detalhe (`/torneios/[slug]`).
  - Galeria de Bladers (`/bladers`) com cards dos competidores.
- [x] **Painel Administrativo:**
  - Login protegido (`/auth/login`) com validação de role `admin`.
  - Dashboard de métricas (`/admin`).
  - CRUD de Bladers (`/admin/bladers`) com exclusão segura.
  - Gestão de Torneios (`/admin/torneios`) com exclusão e alteração de status.
  - **Suporte a Torneios Retroativos:** criação de eventos passados com lançamento de posições e recálculo automático do ranking histórico (`recalculateAllRanking`).
- [x] Deploy na Vercel ativo e funcional.

---

### 🔄 Fase 2 — Motor de Torneios ao Vivo & Gestor de Arenas (PRÓXIMO FOCO)
**Objetivo:** Permitir que organizadores gerenciem múltiplos Beystadiums simultâneos durante o evento e juízes lancem placares lance a lance pelo celular.

**Funcionalidades Definidas:**
1. **Formato Híbrido (Suíço + Top Cut Mata-Mata):**
   - **Fase 1 (Suíço):** Rodadas em que todos jogam (ex: 3 a 5 rodadas para 16-32 jogadores).
   - **Critérios de desempate automáticos:** 1º Vitórias, 2º Buchholz (força dos adversários), 3º Saldo de pontos das arenas.
   - **Corte de Classificados (Top Cut):** Botão para avançar os Top 4, Top 8 ou Top 16 para o Mata-mata.
   - **Fase 2 (Mata-Mata):** Geração automática da chave (Quartas, Semifinal, 3º Lugar e Grande Final).
2. **Gestor de Arenas Físicas (Multi-Stadium):**
   - Criação e acompanhamento de arenas simultâneas (ex: *Arena 1 - Xtreme Stadium*, *Arena 2 - Standard*).
   - Fila de partidas da rodada com atribuição: o organizador designa qual partida vai para qual arena.
3. **Placar Touch do Juiz (Mobile Referee Board):**
   - Interface touch com botões grandes adaptada para uso com uma mão na beira da arena.
   - Botões específicos de Finish oficial BX:
     - `+1 Spin Finish`
     - `+2 Over Finish`
     - `+2 Burst Finish`
     - `+3 Xtreme Finish`
     - `Desfazer (Undo)` para correção imediata de toques acidentais.
   - Detecção automática de *Match Point* e *Vitória* (padrão de 4 pontos).
   - Sincronização em tempo real via Supabase Realtime para telão e público.

---

### 👥 Fase 3 — Inscrições, Check-in & Níveis de Acesso
- Pré-inscrição pública de jogadores em eventos futuros.
- Confirmação de presença presencial (Check-in / QR Code).
- Nível de acesso restrito para Juízes (role `judge`), limitados a lançar placares das arenas designadas sem acesso à administração geral.

---

### 📊 Fase 4 — Meta & Estatísticas Regionais
- Registro de Decks/Combos (Blade, Ratchet, Bit).
- Estatísticas de peças mais utilizadas e taxas de vitória (Win Rates) do meta amazonense.
- Histórico de confrontos diretos (Head-to-Head) entre Bladers.

---

## ⚖️ Regras de Negócio Estabelecidas

Todas as regras estão centralizadas em [`src/lib/constants.ts`](file:///home/kuntitled/Projects/Sistema%20OBA/src/lib/constants.ts) para facilitar alterações decididas pela diretoria:

### Pontuação de Ranking por Etapa (Acumulado da Liga)
```ts
export const RANKING_POINTS_BY_POSITION: Record<number, number> = {
  1: 100, // Campeão
  2: 75,  // Vice-campeão
  3: 60,  // 3º Lugar
  4: 50,  // 4º Lugar
  5: 40,  // 5º Lugar
  6: 32,  // 6º Lugar
  7: 25,  // 7º Lugar
  8: 20,  // 8º Lugar
};
export const DEFAULT_RANKING_POINTS = 10; // Para colocações da 9ª em diante
```

### Pontuação de Partida (Regras Oficiais Beyblade X)
```ts
export const MATCH_POINTS = {
  SPIN_FINISH: 1,    // Girar por mais tempo
  OVER_FINISH: 2,    // Lançar no bolsão lateral
  BURST_FINISH: 2,   // Desmontar o Beyblade rival
  XTREME_FINISH: 3,  // Lançar na Xtreme Zone / Xtreme Pocket
  DRAW: 0,
};
export const POINTS_TO_WIN_MATCH = 4; // Primeiro Blader a atingir 4 pontos vence a partida
```

---

## 📁 Estrutura Real de Pastas

```
Sistema OBA/
├── ARCHITECTURE.md              ← Guia mestre (este arquivo)
├── .env.example                 ← Template de variáveis (versionado)
├── .env.local                   ← Credenciais locais (ignorado no git)
├── next.config.ts               ← Configuração Next.js 16 (Turbopack)
├── components.json              ← Configuração do shadcn/ui
├── supabase/
│   ├── migrations/
│   │   ├── 001_phase1_schema.sql       ← Tabelas, RLS e triggers da Fase 1
│   │   └── 002_grant_permissions.sql   ← Permissões GRANT para anon/authenticated
│   └── seed.sql                        ← Dados de exemplo para desenvolvimento
├── public/
│   ├── images/logo.jpg                 ← Logo oficial OBA (Curupira)
│   └── icons/                          ← Ícones PWA (180x180, 192x192, 512x512)
└── src/
    ├── proxy.ts                        ← Proxy de autenticação (Next.js 16)
    ├── app/
    │   ├── layout.tsx                  ← Root layout com ThemeProvider e metadata OG
    │   ├── manifest.ts                 ← Web App Manifest PWA
    │   ├── globals.css                 ← Design system OBA e variáveis oklch
    │   ├── (public)/                   ← Rotas públicas (usam Navbar e Footer)
    │   │   ├── layout.tsx
    │   │   ├── page.tsx                ← Home: Hero, Pódio Top 3, Ranking Geral
    │   │   ├── torneios/
    │   │   │   ├── page.tsx            ← Lista pública de torneios
    │   │   │   └── [slug]/page.tsx     ← Detalhes do torneio e colocações finais
    │   │   └── bladers/page.tsx        ← Lista pública de competidores
    │   ├── admin/                      ← Rotas administrativas protegidas
    │   │   ├── layout.tsx              ← Sidebar admin + botão de logout
    │   │   ├── page.tsx                ← Dashboard de métricas e resumo
    │   │   ├── actions.ts              ← Server Actions do admin (CRUD e recálculo)
    │   │   ├── bladers/page.tsx        ← Gestão de Bladers
    │   │   └── torneios/
    │   │       ├── page.tsx            ← Gestão de Torneios
    │   │       └── [id]/resultados/    ← Lançamento de colocações e pontos
    │   └── auth/
    │       ├── actions.ts              ← Server Actions de login e logout
    │       └── login/page.tsx          ← Formulário de login administrativo
    ├── components/
    │   ├── admin/                      ← Modais e botões de ação do painel
    │   │   ├── BladerForm.tsx
    │   │   ├── TournamentForm.tsx
    │   │   ├── TournamentResultsEditor.tsx
    │   │   ├── TournamentStatusSelect.tsx
    │   │   ├── DeleteBladerButton.tsx
    │   │   └── DeleteTournamentButton.tsx
    │   ├── layout/                     ← Navbar, Footer e ThemeToggle
    │   ├── ranking/                    ← RankingTable com busca instantânea
    │   └── ui/                         ← Componentes base shadcn/ui
    ├── lib/
    │   ├── constants.ts                ← Regras de pontuação e constantes da liga
    │   ├── utils.ts                    ← Helper cn()
    │   ├── services/league.ts          ← Consultas de leitura (ranking, torneios, bladers)
    │   └── supabase/
    │       ├── client.ts               ← Browser client Supabase
    │       ├── server.ts               ← Server client Supabase (SSR cookies)
    │       └── proxy.ts                ← Helper de atualização de sessão para o proxy
    └── types/
        ├── database.ts                 ← Tipos estritos do banco Supabase
        └── domain.ts                   ← Tipos semânticos de negócio
```

---

## 🗄️ Modelagem do Banco de Dados (Supabase)

### Tabelas em Produção (Fase 1)
- `bladers`: Id, user_id (opcional), name, nickname (único), city, avatar_url, bio, is_active, timestamps.
- `tournaments`: Id, name, slug (único), description, location, event_date, format, status (`draft`, `open`, `ongoing`, `finished`), max_players, created_by, timestamps.
- `tournament_results`: Id, tournament_id, blader_id, final_position, points_earned (unique por tournament + blader e tournament + final_position).
- `ranking`: Id, blader_id (único), total_points, tournaments_played, best_position, updated_at.

### Tabelas Planejadas para a Fase 2
- `arenas`: Id, tournament_id, name (ex: "Arena 1 - Beystadium Xtreme"), status (`available`, `in_match`, `maintenance`), current_match_id.
- `matches`: Id, tournament_id, arena_id, round, stage (`swiss`, `top_cut`), player1_id, player2_id, player1_score, player2_score, winner_id, status (`pending`, `in_progress`, `finished`), timestamps.
- `match_games` (lance a lance): Id, match_id, round_number, scoring_player_id, finish_type (`spin`, `over`, `burst`, `xtreme`), points_awarded, timestamp.

---

## 🔐 Autenticação e Proteção de Rotas (`proxy.ts`)

- O Next.js 16 descontinuou o `middleware.ts` e padronizou o `src/proxy.ts`.
- O `src/proxy.ts` intercepta todas as requisições para `/admin/*`.
- Caso o usuário não esteja logado, redireciona para `/auth/login`.
- Caso o usuário esteja logado mas `user.user_metadata.role !== 'admin'`, redireciona para a home pública `/`.
- O login realiza uma navegação via `window.location.href = "/admin"` para assegurar a transmissão imediata dos cookies HttpOnly via cabeçalhos HTTP sem condições de corrida.

---

## 📱 PWA e Responsividade Mobile-First

- **Manifest:** Configurado em `src/app/manifest.ts` com `display: "standalone"`, `orientation: "portrait"`, e cores temáticas (#0f0814 e #bd08f5).
- **Ícones:** Resoluções `180x180` (iOS), `192x192` (Android) e `512x512` (Splash HD) gerados a partir do logotipo oficial.
- **Mobile-First:** Todos os botões, drawers de navegação e tabelas foram pensados para uso com polegar em dispositivos celulares.

---

## 🔑 Variáveis de Ambiente & Deploy

Configuradas localmente em `.env.local` e cadastradas na Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://lckoxpagfsmhuzlcjjks.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_UCoey5WifmfjWQ2GfX9S4g_PzrtXVK9
NEXT_PUBLIC_APP_URL=https://sistema-oba-alpha.vercel.app
```

---

## 🎯 Diretrizes para a Próxima Sessão (Fase 2)

Na próxima conversa, o foco imediato será o **Motor de Torneios ao Vivo & Gestão de Arenas**:

1. **Modelagem SQL da Fase 2:**
   - Criar a migration `003_phase2_live_tournaments.sql` para adicionar as tabelas `arenas`, `matches` e `match_games`.
   - Adicionar as políticas de RLS e subscriptions Realtime do Supabase.
2. **Tela do Gestor de Arenas (Mesa Diretora):**
   - Visualizar os Beystadiums ativos do evento.
   - Painel para despachar partidas da fila do torneio para as arenas livres.
3. **Tela Touch do Juiz de Arena (Mobile Referee):**
   - Placar gigante em tempo real com botões de finish (+1 Spin, +2 Over, +2 Burst, +3 Xtreme, Desfazer).
   - Encerramento automático ao atingir 4 pontos e sincronização instantânea.
4. **Gerador de Chaveamento Híbrido:**
   - Implementar algoritmo do Sistema Suíço com cálculo de Buchholz e saldo de pontos.
   - Botão para gerar o corte para o Mata-mata (Top 4 / Top 8 / Top 16).

---

*Documento atualizado em: Novembro 2026 | Sistema OBA — Liga de Beyblade X do Amazonas*
