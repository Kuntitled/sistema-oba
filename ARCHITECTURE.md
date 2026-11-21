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
11. [Diretrizes para a Próxima Sessão (Fase 3)](#diretrizes-para-a-próxima-sessão-fase-3)

---

## 🎯 Visão Geral & Status Atual

Sistema web progressivo (PWA) e responsivo (Mobile-First) voltado para a gestão completa da **Liga Oficial de Beyblade X do Amazonas (OBA)**, cobrindo:

- **Vitrine pública:** Ranking oficial por temporada anual (Temporada 2026 ativa com o `Torneio Semanal 01` importado), Pódio Top 3, acompanhamento ao vivo de arenas, placares e chaveamento em tempo real (`/` e `/torneios/[slug]`), histórico de torneios e galeria de competidores (Bladers).
- **Painel administrativo protegido:** Gestão de Bladers, criação de torneios (atuais e retroativos), motor oficial de torneios ao vivo (Suíço + Top Cut / Exclusivamente Suíço), Gestor de Arenas físicas, Placar Touch mobile para juiz (`/admin/arena/[id]`) e recálculo automático do ranking anual.
- **Autenticação & Onboarding:** Login same-origin, proteção de rotas via `src/proxy.ts` (Next.js 16), fluxo de convite de novos administradores e recuperação de senha.
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

### ✅ Fase 2 — Motor de Torneios ao Vivo & Gestor de Arenas (CONCLUÍDA & PRONTA PARA PRODUÇÃO)
**Objetivo:** Permitir que organizadores gerenciem múltiplos Beystadiums simultâneos durante o evento, juízes lancem placares lance a lance pelo celular e o público acompanhe arenas e chaveamentos ao vivo.

**Status de Implementação:**
- [x] **Migrations SQL aplicadas em produção (`003` e `004`):** tabelas `arenas`, `matches`, `match_games`, `seasons`, `tournament_participants`, colunas oficiais OBA em `tournaments`, `tournament_results` e `ranking`, além de RLS e Supabase Realtime.
- [x] **Motor de Chaveamento Híbrido (`/admin/torneios/[id]/chaveamento` e `src/lib/engine/tournament-engine.ts`):** gestão de participantes e Drop, pareamento Suíço sem rematches com BYE automático, suporte a `swiss_top_cut` e `swiss_only`, desempate oficial por Finishes (`xtreme > burst > over > spin`, sem Buchholz), detecção de empate absoluto pela liderança + partida extra (`is_tiebreaker = true` sem `+10 pts`), geração de Top Cut (4 / 8 / 16 + disputa de 3º lugar + avanço automático) e publicação oficial com recálculo anual do ranking (`recalculateSeasonRanking`).
- [x] **Gestor de Arenas Físicas (`/admin/arenas`):** criação de múltiplos Beystadiums, status (`available`, `in_match`, `maintenance`), liberação e despacho de partidas da fila em tempo real.
- [x] **Placar Touch do Juiz (`/admin/arena/[id]`):** layout mobile full-screen fora da sidebar admin, botões oficiais BX (`+1 Spin`, `+2 Over`, `+2 Burst`, `+3 Xtreme`), inversão de lados, `Desfazer (Undo)`, `Zerar placar`, alerta de Match Point, encerramento automático aos 4 pontos, avanço automático no Top Cut e fila de próximas partidas.
- [x] **Vitrine Pública ao Vivo (`/` e `/torneios/[slug]`):** banner de arenas ao vivo na Home (`HomeLiveTournamentBanner`) e acompanhamento em tempo real de arenas, placares, classificação/rodadas do Suíço e chaveamento Top Cut (`PublicTournamentLive`, `LiveArenaCard`) via Supabase Realtime.
- [x] **Autenticação e Onboarding de Admins:** login same-origin (`POST /api/auth/login` + `route-cookies.ts`), suporte a acesso LAN em dev (`allowedDevOrigins` em `next.config.ts`), convite de usuários e recuperação de senha (`/auth/callback`, `/auth/definir-senha`, `AuthHashListener`, opção "Esqueceu a senha?" em `/auth/login`).
- [x] **Modo Telão / TV dedicado (`/torneios/[slug]/telao`):** rota pública full-screen (`BroadcastBoardClient.tsx`) sem Navbar/Footer, com tipografia ampliada, modos `Auto` (rotação 15s), `Arenas`, `Chaveamento` e `Classificação`, tela cheia e Realtime.
- [x] **Fallback da Mesa Diretora:** botão `Resultado / W.O.` na tela de chaveamento + action `recordManualMatchResultAction` para registrar placar manual ou W.O. sem passar por arena, mantendo avanço automático no Top Cut.
- [x] **Interface de Temporadas no Admin (`/admin/temporadas`):** componente `SeasonManagerClient.tsx` consumindo `createSeasonAction` e `activateSeasonAction` para gerenciar ciclos anuais e preservar histórico no ranking público.
- [x] **Polimentos de Cadastro:** seleção automática de `swiss_only` para categoria `semanal` e `swiss_top_cut` para `oficial` em `TournamentForm.tsx` e `EditTournamentButton.tsx`, além de modais de edição completa para Bladers (`EditBladerButton.tsx` + `updateBladerAction`) e Torneios (`EditTournamentButton.tsx` + `updateTournamentAction`).

---

### 🚀 Fase 3 — Ecossistema do Blader, Peças, Formatos, Inscrições & Níveis de Acesso (EM ANDAMENTO)
- **Etapa 3A (Concluída):**
  - [x] **Migrations `005` e `006` aplicadas em produção:** catálogo `parts_catalog` (288 peças únicas deduplicadas dos CSVs TT/Hasbro via `scripts/generate-parts-seed.ts`), `rulesets` (seed inicial `Livre`) e `ruleset_banned_parts`, `league_settings`, colunas de perfil/combo em `bladers`, `blader_inventory`, `blader_claim_requests`, além da base de `tournament_registrations` / `registration_combos` e ajustes em `tournaments`.
  - [x] **Gestão Admin de Peças & Formatos:** rotas `/admin/pecas` e `/admin/formatos` para CRUD do catálogo e ban-lists independentes por formato, integradas à criação/edição de torneios.
  - [x] **Auth Google OAuth & Vínculo de Perfis:** botão Entrar com Google em `/auth/login`, `/privacidade` pública para consentimento OAuth, redirecionamento adaptativo (`getRequestOrigin`), fluxo de primeiro acesso/vínculo em `/meu-painel` e aprovação/vínculo manual em `/admin/bladers`.
  - [x] **Painel Pessoal (`/meu-painel`) & Card Público (`BladerCardModal`):** edição de perfil, bio (160 chars), combo favorito pesquisável por nome TT/Hasbro, inventário de coleção pessoal e modal público interativo no Ranking, Bladers e Torneios.
- **Etapa 3B (Próxima):** configuração PIX global (`league_settings`), inscrição de Bladers com decklist validada pela ban-list do `ruleset`, PIX/comprovante e aprovação administrativa.
- **Etapa 3C:** check-in presencial (QR Code) e acesso restrito para Juízes (`role = 'judge'`).

---

### 📊 Fase 4 — Meta & Estatísticas Regionais
- Registro de Decks/Combos (Blade, Ratchet, Bit).
- Estatísticas de peças mais utilizadas e taxas de vitória (Win Rates) do meta amazonense.
- Histórico de confrontos diretos (Head-to-Head) entre Bladers.

---

## ⚖️ Regras de Negócio Estabelecidas (Regulamento Oficial OBA)

Todas as regras estão centralizadas em [`src/lib/constants.ts`](file:///home/kuntitled/Projects/Sistema%20OBA/src/lib/constants.ts) para facilitar alterações decididas pela diretoria:

### Temporadas Anuais (`seasons`)
- O ranking oficial é **anual** (ex: Temporada 2026 válida de `01/01/2026` a `31/12/2026`).
- Na virada do ano, a temporada anterior é encerrada e preservada como histórico consultável no ranking público, e a nova temporada inicia zerada.

### Categorias, Formatos e Pontuação Acumulativa no Ranking
- **Categorias (Peso do Pódio):**
  - `semanal`: **1º** = `+100 pts` | **2º** = `+75 pts` | **3º** = `+50 pts`
  - `oficial`: **1º** = `+200 pts` | **2º** = `+150 pts` | **3º** = `+100 pts`
- **Formatos:**
  - `swiss_top_cut` (Suíço + Eliminatórias/Top Cut): em média 4 rodadas suíças seguidas de mata-mata. O **1º colocado da fase suíça** ganha **+15 pontos de bônus de liderança** uma única vez, independente da posição final no mata-mata.
  - `swiss_only` (Exclusivamente Suíço): sem eliminatórias e **sem bônus de +15 pontos** para o líder do Suíço.
- **Vitórias no Suíço:** cada vitória na fase suíça vale **+10 pontos** (mesmo para quem não avança às eliminatórias).
- **Exemplos de validação:**
  - Campeão `swiss_only` semanal com 4 vitórias: `40 + 100 = 140 pts`.
  - Campeão `swiss_top_cut` semanal com 4 vitórias e líder do suíço: `40 + 15 + 100 = 155 pts`.

```ts
export const OBA_PODIUM_POINTS = {
  semanal: { 1: 100, 2: 75, 3: 50 },
  oficial: { 1: 200, 2: 150, 3: 100 },
} as const;
export const OBA_SWISS_WIN_POINTS = 10;
export const OBA_SWISS_LEADER_BONUS = 15; // Apenas em torneios swiss_top_cut
```

### Desempate na Fase Suíça (Não usa Buchholz)
Em caso de empate em número de vitórias no Suíço, a ordem de desempate é apurada diretamente nos registros `match_games` das partidas regulares (`stage = 'swiss'` e `is_tiebreaker = false`):
1. Maior quantidade de **Extreme Finishes** (`xtreme`)
2. Maior quantidade de **Burst Finishes** (`burst`)
3. Maior quantidade de **Over Finishes** (`over`)
4. Maior quantidade de **Spin Finishes** (`spin`)
- **Empate absoluto pela liderança do Suíço:** o sistema sinaliza o empate e permite gerar partida extra de desempate (`is_tiebreaker = true`), que define o líder sem somar `+10 pts` extras no ranking.

### Desempate do Ranking Geral da Temporada
Em caso de empate na pontuação total acumulada na temporada:
1. **Melhor colocação no pódio** (`1º > 2º > 3º > nenhum pódio`)
2. **Maior quantidade de pódios** conquistados na temporada (soma de 1º, 2º e 3º lugares)
3. **Maior número de vitórias no Suíço** acumuladas na temporada
4. **Desempate técnico:** ordem do primeiro registro do jogador na tabela (`created_at ASC`)

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
├── next.config.ts               ← Configuração Next.js 16 (Turbopack + allowedDevOrigins LAN)
├── components.json              ← Configuração do shadcn/ui
├── supabase/
│   ├── migrations/
│   │   ├── 001_phase1_schema.sql               ← Tabelas, RLS e triggers da Fase 1
│   │   ├── 002_grant_permissions.sql           ← Permissões GRANT para anon/authenticated
│   │   ├── 003_phase2_live_tournaments.sql     ← Arenas, partidas, lances, RLS e Realtime
│   │   └── 004_oba_official_rules_and_engine.sql ← Temporadas, formatos OBA, Top Cut e desempates
│   └── seed.sql                                ← Dados de exemplo para desenvolvimento
├── public/
│   ├── images/logo.jpg                 ← Logo oficial OBA (Curupira)
│   └── icons/                          ← Ícones PWA (180x180, 192x192, 512x512)
└── src/
    ├── proxy.ts                        ← Proxy de autenticação (Next.js 16)
    ├── app/
    │   ├── layout.tsx                  ← Root layout com ThemeProvider, AuthHashListener e metadata OG
    │   ├── manifest.ts                 ← Web App Manifest PWA
    │   ├── globals.css                 ← Design system OBA e variáveis oklch
    │   ├── (public)/                   ← Rotas públicas (usam Navbar e Footer)
    │   │   ├── layout.tsx
    │   │   ├── page.tsx                ← Home: Hero, Banner Ao Vivo, Pódio Top 3 e Ranking por Temporada
    │   │   ├── torneios/
    │   │   │   ├── page.tsx            ← Lista pública de torneios
    │   │   │   └── [slug]/page.tsx     ← Detalhes, arenas ao vivo, chaveamento e resultados
    │   │   └── bladers/page.tsx        ← Lista pública de competidores
    │   ├── torneios/
    │   │   └── [slug]/telao/page.tsx   ← Modo Telão / TV full-screen (fora de (public), sem Navbar/Footer)
    │   ├── admin/                      ← Rotas administrativas protegidas pelo proxy.ts
    │   │   ├── actions.ts              ← Server Actions CRUD (Bladers, Torneios, Resultados)
    │   │   ├── arena/
    │   │   │   ├── actions.ts          ← Server Actions do Gestor de Arenas e Placar do Juiz
    │   │   │   └── [id]/page.tsx       ← Placar Touch mobile do juiz (tela cheia sem sidebar)
    │   │   ├── torneios/
    │   │   │   └── engine-actions.ts   ← Server Actions do motor Suíço, Top Cut, fallback W.O. e temporadas
    │   │   └── (panel)/                ← Grupo de rotas que compartilham a sidebar administrativa
    │   │       ├── layout.tsx          ← Sidebar admin + menu mobile + botão de logout
    │   │       ├── page.tsx            ← Dashboard de métricas e resumo
    │   │       ├── arenas/page.tsx     ← Gestor de Arenas físicas (Multi-Stadium)
    │   │       ├── bladers/page.tsx    ← Gestão de Bladers (cadastro, edição e status ativo)
    │   │       ├── temporadas/page.tsx ← Gestão de Temporadas anuais e histórico
    │   │       └── torneios/
    │   │           ├── page.tsx        ← Gestão de Torneios (cadastro, edição e ações)
    │   │           └── [id]/
    │   │               ├── chaveamento/page.tsx ← Motor Suíço + Tiebreaker + Top Cut + Publicação
    │   │               └── resultados/page.tsx  ← Lançamento manual/retroativo de colocações e pontos
    │   ├── api/
    │   │   └── auth/login/route.ts     ← Endpoint same-origin de login com gravação segura de cookies
    │   └── auth/
    │       ├── actions.ts              ← Server Actions de logout
    │       ├── callback/route.ts       ← Callback SSR para PKCE (?code=) e OTP (?token_hash=)
    │       ├── definir-senha/page.tsx  ← Definição de senha via convite ou recuperação
    │       └── login/page.tsx          ← Formulário de login admin + "Esqueceu a senha?"
    ├── components/
    │   ├── admin/                      ← Componentes do painel e motor de chaveamento
    │   │   ├── ArenaManagerClient.tsx
    │   │   ├── BladerForm.tsx
    │   │   ├── DeleteBladerButton.tsx
    │   │   ├── DeleteTournamentButton.tsx
    │   │   ├── EditBladerButton.tsx
    │   │   ├── EditTournamentButton.tsx
    │   │   ├── SeasonManagerClient.tsx
    │   │   ├── TournamentEngineClient.tsx
    │   │   ├── TournamentForm.tsx
    │   │   ├── TournamentResultsEditor.tsx
    │   │   └── TournamentStatusSelect.tsx
    │   ├── arena/                      ← Placar touch mobile e suporte operacional
    │   │   ├── Phase2SchemaNotice.tsx
    │   │   ├── QuickStartMatchDialog.tsx
    │   │   └── RefereeScoreboard.tsx
    │   ├── auth/
    │   │   └── AuthHashListener.tsx    ← Captura tokens em hash (#access_token=) de convite/recovery
    │   ├── layout/                     ← Navbar, Footer e ThemeToggle
    │   ├── ranking/                    ← RankingTable com filtro por temporada e busca instantânea
    │   ├── tournament/                 ← Componentes públicos de torneio, telão e arenas ao vivo
    │   │   ├── BroadcastBoardClient.tsx
    │   │   ├── HomeLiveTournamentBanner.tsx
    │   │   ├── LiveArenaCard.tsx
    │   │   └── PublicTournamentLive.tsx
    │   └── ui/                         ← Componentes base shadcn/ui (@base-ui/react)
    ├── lib/
    │   ├── constants.ts                ← Regras de pontuação, finishes BX e constantes da liga
    │   ├── utils.ts                    ← Helper cn()
    │   ├── engine/
    │   │   └── tournament-engine.ts    ← Motor puro OBA (Suíço, Finishes, Tiebreaker, Top Cut)
    │   ├── services/                   ← Consultas e regras de aplicação no Supabase
    │   │   ├── arena-queries.ts
    │   │   ├── arenas.ts
    │   │   ├── bracket-advancement.ts
    │   │   ├── league.ts
    │   │   ├── ranking-recalc.ts
    │   │   ├── tournament-live.ts
    │   │   └── tournament-queries.ts
    │   └── supabase/
    │       ├── client.ts               ← Browser client Supabase
    │       ├── proxy.ts                ← Helper de atualização e proteção de sessão para o proxy
    │       ├── route-cookies.ts        ← Helper compartilhado de cookies (flag secure HTTP/HTTPS)
    │       └── server.ts               ← Server client Supabase (SSR cookies)
    └── types/
        ├── database.ts                 ← Tipos estritos do banco Supabase
        └── domain.ts                   ← Tipos semânticos de negócio e labels
```

---

## 🗄️ Modelagem do Banco de Dados (Supabase)

### Tabelas em Produção e Fase 2 (`001`–`004`)
- `seasons`: Id, year (único), name, starts_at, ends_at, is_active (índice parcial único para temporada ativa), timestamps.
- `bladers`: Id, user_id (opcional), name, nickname (único), city, avatar_url, bio, is_active, timestamps.
- `tournaments`: Id, season_id, name, slug (único), description, location, event_date, category (`semanal`, `oficial`), format (`swiss_top_cut`, `swiss_only`, legados `swiss`, `single_elim`, `double_elim`), swiss_rounds, top_cut_size (`4`, `8`, `16`), status (`draft`, `open`, `ongoing`, `finished`), max_players, created_by, timestamps.
- `tournament_participants`: Id, tournament_id, blader_id, seed, is_dropped, created_at (unique por tournament + blader).
- `tournament_results`: Id, tournament_id, blader_id, final_position, swiss_wins, swiss_points, is_swiss_leader, swiss_leader_bonus, podium_points, points_earned (unique por tournament + blader e tournament + final_position).
- `ranking`: Id, season_id, blader_id (unique por season + blader), total_points, tournaments_played, swiss_wins, podiums_count, first_places, second_places, third_places, best_podium, best_position, created_at, updated_at.
- `arenas`: Id, tournament_id, name, display_order, status (`available`, `in_match`, `maintenance`), current_match_id, timestamps.
- `matches`: Id, tournament_id, arena_id, round, match_number, stage (`swiss`, `top_cut`), bracket_label, player1_id, player2_id, player1_score, player2_score, target_score, winner_id, status (`pending`, `in_progress`, `finished`, `cancelled`), is_bye, is_tiebreaker, next_match_id, next_match_slot, loser_next_match_id, loser_next_match_slot, timestamps.
- `match_games` (lance a lance): Id, match_id, round_number, scoring_player_id, finish_type (`spin`, `over`, `burst`, `xtreme`, `draw`), points_awarded, timestamp.

### Tabelas da Fase 3 (`005`–`006`)
- `parts_catalog`: Id, name, aliases (`TEXT[]`), part_type (`blade`, `ratchet`, `bit`, `lock_chip`, `assist_blade`, `over_blade`), line (`BX`, `UX`, `CX`), is_active, timestamps (unique por `name + part_type`).
- `rulesets` & `ruleset_banned_parts`: formatos competitivos independentes (`Livre`, etc.) e peças banidas por formato.
- `league_settings`: singleton (`id = 1`) com chave PIX, recebedor e cidade da liga.
- `blader_inventory`, `blader_claim_requests`, `tournament_registrations`, `registration_combos`: coleção pessoal de peças, solicitações de vínculo de conta e base de inscrições/decklists para a Etapa 3B.

---

## 🔐 Autenticação e Proteção de Rotas (`proxy.ts`)

- O Next.js 16 descontinuou o `middleware.ts` e padronizou o `src/proxy.ts`.
- O `src/proxy.ts` (via `updateSession` em `src/lib/supabase/proxy.ts`) intercepta `/admin/*` (exige `role = 'admin'`, redirecionando não-admins para `/meu-painel`) e `/meu-painel/*` (exige usuário autenticado).
- O helper `getRequestOrigin` (`src/lib/supabase/route-cookies.ts`) resolve a origem real do request (`host` / `x-forwarded-host`, convertendo `0.0.0.0` em `localhost`) para callbacks OAuth e redirects.
- O login (`/auth/login`) oferece **Entrar com Google (OAuth)** além de E-mail/Senha (`POST /api/auth/login`) e recuperação de senha, com página pública de privacidade em `/privacidade`.
- O fluxo de **convite de novos admins e recuperação de senha** utiliza `/auth/callback` (PKCE `?code=` e OTP `?token_hash=`), o listener global `AuthHashListener` (tokens em `#access_token=` ou parâmetros na raiz), a tela `/auth/definir-senha` e a opção **"Esqueceu a senha?"** em `/auth/login`.

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

## 🎯 Diretrizes para a Próxima Sessão (Etapa 3B)

Com a **Etapa 3A** concluída (`005` e `006`, catálogo de peças, formatos/ban-lists, Google OAuth, vínculo de contas, `/meu-painel` e Card Público), o próximo passo é a **Etapa 3B — Inscrições, Decklists & PIX**:

1. **Configuração PIX & Inscrições em Torneios:**
   - Painel admin para editar `league_settings` (PIX global da OBA) e habilitar `registration_status`, `entry_fee` e `max_participants` nos torneios.
   - Fluxo de inscrição do Blader com montagem de até 4 combos validados contra a ban-list do `ruleset` e upload de comprovante PIX.
   - Fila administrativa `/admin/torneios/[id]/inscricoes` para conferência de pagamento/decklist e envio automático para `tournament_participants`.
2. **Na sequência (Etapa 3C):**
   - Check-in presencial (QR Code) e acesso restrito para Juízes (`role = 'judge'`) em `/admin/arenas` e `/admin/arena/[id]`.

---

*Documento atualizado em: Novembro 2026 | Sistema OBA — Liga de Beyblade X do Amazonas*
