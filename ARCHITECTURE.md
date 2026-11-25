# 🌀 Sistema OBA — Arquitetura e Guia Mestre do Projeto

> **OBA** — _Organização de Beyblade do Amazonas_  
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

Sistema web progressivo (PWA) e responsivo (Mobile-First) voltado para a gestão completa da **Organização de Beyblade do Amazonas (OBA)**, cobrindo:

- **Vitrine pública:** Ranking Top 10 por temporada anual (com combos favoritos e mais usados, Pódio Top 3 e links sociais oficiais da OBA), acompanhamento ao vivo de arenas, placares e chaveamento em tempo real (`/` e `/torneios/[slug]`), histórico de torneios e galeria completa de competidores (`/bladers`).
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
| **Gráficos** | Recharts v3 (`recharts`) | Gráficos responsivos e tooltips interativos para o painel de Meta & Estatísticas |
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
- **Etapa 3A.5 — Sistemas de Combo, Upload Leve de Avatar & Unificação de Vagas (Concluída):**
  - [x] **Migrations `007` e `008`:** unificação de `max_participants` → `max_players` em `tournaments`, expansão de `parts_catalog` para 8 tipos (`blade`, `main_blade`, `metal_blade`, `over_blade`, `lock_chip`, `assist_blade`, `ratchet`, `bit`), 6 sistemas (`BX`, `BXE`, `UX`, `UXE`, `CX`, `CXE`) + `NULL` universal (para Ratchets/Bits) e flags de compatibilidade (`is_simple_ratchet`, `requires_simple_ratchet`, `blocks_bit`), colunas de combo completo em `bladers` e `registration_combos`, e bucket público `avatars` com RLS por `{auth.uid()}/avatar.webp`.
  - [x] **Reclassificação das 288 peças:** atualização idempotente via `scripts/generate-parts-seed.ts` (preservando UUIDs, movendo `Operate`/`Turbo` para Ratchets com `blocks_bit = true`, marcando `ClockMirage` com `requires_simple_ratchet = true` e 6 Simple Ratchets terminadas em `5`) e suporte completo em `/admin/pecas` e `/admin/formatos`.
  - [x] **Upload Leve de Avatar (`/meu-painel`):** processamento client-side via `<canvas>` (`src/lib/avatar-upload.ts`: recorte quadrado central, máx. `400x400px`, WebP qualidade `0.75`), envio com `upsert: true` em `avatars/{user_id}/avatar.webp` e cache-busting `?v=`.
  - [x] **`ComboBuilder.tsx` Reutilizável & Card Público:** seleção obrigatória de sistema (`BX`/`BXE`/`UX`/`UXE`/`CX`/`CXE`), slots dinâmicos (sem tag de sistema em Ratchet/Bit, ocultamento de Ratchet em `UXE`, filtro de Simple Ratchet para `ClockMirage`, bloqueio de Bit para `Operate`/`Turbo`) e exibição completa no `BladerCardModal.tsx`.
- **Etapa 3B — Inscrições Online, Decklists & PIX (Concluída):**
  - [x] **Migration `009`:** bucket privado `receipts` (`5 MB`, imagens + PDF) com RLS restrita à pasta `{tournament_id}/{auth.uid()}/...` e acesso total de admins via Signed URL; revisão das policies RLS e trigger de proteção em `tournament_registrations` / `registration_combos` permitindo edição enquanto `pending` ou reenvio após `rejected`.
  - [x] **Configuração PIX Global & Gestão de Admins (`/admin/configuracoes`):** gerenciamento de `league_settings` (`pix_key`, `pix_receiver_name`, `pix_city`) com geração de payload EMVCo/BACEN BR Code (`src/lib/pix.ts`), pré-visualização ao vivo em `<PixPaymentBox />`, listagem de contas do Supabase Auth via `SUPABASE_SERVICE_ROLE_KEY`, promoção/remoção de papel `admin` e envio de convites admin.
  - [x] **Configuração de Inscrições por Torneio (`/admin/torneios`):** controles de `registration_status`, `entry_fee` e `max_players` em `TournamentForm.tsx` e `EditTournamentButton.tsx`.
  - [x] **Inscrição do Blader (`/torneios/[slug]#inscricao` e `/meu-painel`):** montagem de até **4 combos** via `<ComboBuilder />` com validação server-side de compatibilidade (`validateTournamentDeckCombo`) e ban-list do `ruleset`, QR Code + Copia e Cola PIX quando `entry_fee > 0`, upload leve de comprovante (`src/lib/receipt-upload.ts`) e aba **Minhas Inscrições** em `/meu-painel`.
  - [x] **Conferência Admin (`/admin/torneios/[id]/inscricoes`):** visualização de decklists (com alerta de peça banida), preview seguro de comprovante via Signed URL, flags `payment_verified`/`decks_verified`, rejeição com motivo e aprovação idempotente em `tournament_participants` respeitando `max_players`.
- **Etapa 3C — Papel de Juiz (`role = 'judge'`) (Concluída):**
  - [x] **Controle de Acesso por Papel (`src/lib/auth-roles.ts` & `src/lib/supabase/proxy.ts`):** `judge` tem acesso exclusivo a `/admin/arenas` e `/admin/arena/[id]` (Placar Touch), sendo redirecionado para `/admin/arenas` se tentar acessar qualquer outra rota `/admin/*`.
  - [x] **Arbitragem Segura:** `createAndAssignMatchAction` restrita a `admin`; sidebar adaptada para Juiz (`JUIZ OBA` / `Painel de Arbitragem`) e ocultação de criação/exclusão de arenas e partida rápida avulsa na UI do juiz.
  - [x] **Gestão de 3 Papéis (`/admin/configuracoes`):** seletor `Blader | Juiz | Admin` e envio de convites já definindo papel inicial (`judge` ou `admin`). *(Check-in presencial por QR Code removido do escopo por decisão operacional para agilizar o início dos torneios.)*

---

### ✅ Fase 4 — Meta, Estatísticas Regionais & Performance de Peças (CONCLUÍDA)
- [x] **Migration `012_match_games_combo_tracking.sql`:** colunas opcionais `player1_combo_id` e `player2_combo_id` em `match_games` com índices parciais e policies `SELECT` somente-leitura para `role = 'judge'` em inscrições aprovadas de torneios `ongoing`/`finished`.
- [x] **Rastreamento de Combos por Round no Placar Touch (`/admin/arena/[id]`):** seletores táteis 1-toque dos combos aprovados de cada competidor com sugestão automática por ordem de round (`1 → 2 → 3`) e exibição no histórico de lances.
- [x] **Página Pública `/estatisticas` (`src/lib/services/stats.ts` + Recharts v3):** agregações server-side via `createAdminClient()` com filtros globais (Temporada, Modalidade, Formato/Ruleset), Panorama Geral, Performance por Peça (Win Rate, Pts/Round e Finishes aplicados/sofridos por peça), Censo Anônimo da Coleção (`blader_inventory`) e Confrontos Diretos (Head-to-Head via `/api/stats/head-to-head`).
- [x] **Meta & Breakdown de Combos por Etapa (`/torneios/[slug]`):** nova aba `Meta & Estatísticas` exibida exclusivamente para torneios `ongoing` ou `finished`, com ranking de combos, decklists do Pódio/Top Cut, peças mais usadas, distribuição de finishes/sistemas e performance na etapa.

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
  - `amistoso`: **0 pts** (usa inscrições, arenas, chaveamento e histórico do evento sem somar pontos, vitórias no Suíço nem pódios no Ranking Oficial)
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
  amistoso: { 1: 0, 2: 0, 3: 0 },
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
├── next.config.ts               ← Configuração Next.js 16 (Turbopack, allowedDevOrigins LAN, images HTTPS)
├── components.json              ← Configuração do shadcn/ui
├── scripts/
│   ├── generate-parts-seed.ts   ← Parser/deduplicador dos CSVs e gerador da migration 008
│   └── seed-data/               ← Planilhas CSV (TT e Hasbro) do catálogo Beyblade X
├── supabase/
│   ├── migrations/
│   │   ├── 001_phase1_schema.sql                       ← Tabelas, RLS e triggers da Fase 1
│   │   ├── 002_grant_permissions.sql                   ← Permissões GRANT para anon/authenticated
│   │   ├── 003_phase2_live_tournaments.sql             ← Arenas, partidas, lances, RLS e Realtime
│   │   ├── 004_oba_official_rules_and_engine.sql       ← Temporadas, formatos OBA, Top Cut e desempates
│   │   ├── 005_phase3_ecosystem_schema.sql             ← Peças, formatos/ban-lists, perfil/inventário e base 3B
│   │   ├── 006_seed_parts_catalog.sql                  ← Seed idempotente das 288 peças únicas
│   │   ├── 007_phase3a_combo_systems_and_avatars.sql   ← Unificação max_players, 6 sistemas, combos e bucket avatars
│   │   ├── 008_update_parts_classification.sql         ← Reclassificação idempotente de tipos, linhas e flags de peças
│   │   ├── 009_phase3b_registrations_and_receipts.sql  ← Bucket privado receipts, RLS de reenvio e proteção de inscrições
│   │   ├── 010_tournament_promo_fields.sql             ← Campos event_time, location_url (Google Maps) e prize_info em torneios
│   │   ├── 011_tournament_friendly_category.sql        ← Modalidade amistoso em torneios (sem pontos/vitórias no ranking oficial)
│   │   ├── 012_match_games_combo_tracking.sql          ← Rastreamento opcional de combos por round em match_games e leitura de decklists para juiz
│   │   └── 013_decklist_reassembly.sql                 ← Pool imutável original_part_ids e versionamento is_active para remontagem entre rodadas
│   └── seed.sql                                        ← Dados de exemplo para desenvolvimento
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
    │   │   ├── page.tsx                ← Home: Hero, redes sociais OBA, Banner Ao Vivo, Pódio Top 3 e Top 10 Ranking por Temporada (com combos)
    │   │   ├── torneios/
    │   │   │   ├── page.tsx            ← Lista pública de torneios
    │   │   │   └── [slug]/page.tsx     ← Detalhes, cards de divulgação/ban-list (PNG), inscrição online, arenas e resultados
    │   │   ├── bladers/page.tsx        ← Lista pública de competidores (abre Card Público)
    │   │   ├── estatisticas/page.tsx   ← Meta regional, performance por peça, censo anônimo de coleções e H2H
    │   │   ├── meu-painel/page.tsx     ← Painel pessoal do Blader (perfil, coleção e minhas inscrições)
    │   │   └── privacidade/page.tsx    ← Política de Privacidade pública (OAuth / LGPD)
    │   ├── torneios/
    │   │   ├── [slug]/telao/page.tsx   ← Modo Telão / TV full-screen (fora de (public), sem Navbar/Footer)
    │   │   └── registration-actions.ts ← Server Actions de inscrição, decklist e cancelamento do Blader
    │   ├── meu-painel/
    │   │   └── actions.ts              ← Server Actions do perfil, claim e coleção do Blader
    │   ├── admin/                      ← Rotas administrativas protegidas pelo proxy.ts
    │   │   ├── actions.ts              ← Server Actions CRUD (Bladers, Claims, Torneios, Resultados)
    │   │   ├── parts-actions.ts        ← Server Actions CRUD de Peças, Formatos e Ban-lists
    │   │   ├── registrations-actions.ts ← Server Actions de PIX global e aprovação/rejeição de inscrições
    │   │   ├── users-actions.ts        ← Server Actions de promoção/remoção de admins e convites (Service Role)
    │   │   ├── arena/
    │   │   │   ├── actions.ts          ← Server Actions do Gestor de Arenas e Placar do Juiz
    │   │   │   └── [id]/page.tsx       ← Placar Touch mobile do juiz (tela cheia sem sidebar)
    │   │   ├── torneios/
    │   │   │   └── engine-actions.ts   ← Server Actions do motor Suíço, Top Cut, fallback W.O. e temporadas
    │   │   └── (panel)/                ← Grupo de rotas que compartilham a sidebar administrativa
    │   │       ├── layout.tsx          ← Sidebar admin + menu mobile + botão de logout
    │   │       ├── page.tsx            ← Dashboard de métricas e resumo
    │   │       ├── arenas/page.tsx     ← Gestor de Arenas físicas (Multi-Stadium)
    │   │       ├── bladers/page.tsx    ← Gestão de Bladers, aprovações de vínculo e UUID manual
    │   │       ├── configuracoes/page.tsx ← Configuração PIX global e gestão de administradores
    │   │       ├── formatos/page.tsx   ← CRUD de Formatos, Ban-lists independentes e Gerador de Card PNG
    │   │       ├── pecas/page.tsx      ← Gestão do Catálogo de Peças (TT + aliases Hasbro)
    │   │       ├── temporadas/page.tsx ← Gestão de Temporadas anuais e histórico
    │   │       └── torneios/
    │   │           ├── page.tsx        ← Gestão de Torneios (cadastro, edição, card PNG, taxas/vagas e ações)
    │   │           └── [id]/
    │   │               ├── chaveamento/page.tsx ← Motor Suíço + Tiebreaker + Top Cut + Publicação
    │   │               ├── inscricoes/page.tsx  ← Conferência de inscrições, decklists e comprovantes PIX
    │   │               └── resultados/page.tsx  ← Lançamento manual/retroativo de colocações e pontos
    │   ├── api/
    │   │   ├── auth/login/route.ts     ← Endpoint same-origin de login com gravação segura de cookies
    │   │   ├── bladers/[id]/card/route.ts ← Endpoint público do Card do Blader
    │   │   └── stats/head-to-head/route.ts ← Endpoint JSON de confrontos diretos (H2H) entre Bladers
    │   └── auth/
    │       ├── actions.ts              ← Server Actions de logout
    │       ├── callback/route.ts       ← Callback SSR para OAuth Google, PKCE (?code=) e OTP (?token_hash=)
    │       ├── definir-senha/page.tsx  ← Definição de senha via convite ou recuperação
    │       └── login/page.tsx          ← Login Google OAuth + E-mail/Senha + "Esqueceu a senha?"
    ├── components/
    │   ├── admin/                      ← Componentes do painel, catálogo, formatos, PIX, admins e inscrições
    │   │   ├── AdminUsersManagerClient.tsx
    │   │   ├── ArenaManagerClient.tsx
    │   │   ├── BladerClaimsBanner.tsx
    │   │   ├── BladerForm.tsx
    │   │   ├── DeleteBladerButton.tsx
    │   │   ├── DeleteTournamentButton.tsx
    │   │   ├── EditBladerButton.tsx
    │   │   ├── EditTournamentButton.tsx
    │   │   ├── LeagueSettingsClient.tsx
    │   │   ├── PartsCatalogClient.tsx
    │   │   ├── RulesetsManagerClient.tsx
    │   │   ├── SeasonManagerClient.tsx
    │   │   ├── TournamentEngineClient.tsx
    │   │   ├── TournamentForm.tsx
    │   │   ├── TournamentRegistrationsClient.tsx
    │   │   ├── TournamentResultsEditor.tsx
    │   │   └── TournamentStatusSelect.tsx
    │   ├── arena/                      ← Placar touch mobile e suporte operacional
    │   │   ├── Phase2SchemaNotice.tsx
    │   │   ├── QuickStartMatchDialog.tsx
    │   │   └── RefereeScoreboard.tsx
    │   ├── auth/
    │   │   ├── AuthHashListener.tsx    ← Captura tokens em hash (#access_token=) de convite/recovery
    │   │   └── LoginFormClient.tsx     ← Formulário cliente de login (Google OAuth + E-mail/Senha)
    │   ├── blader/                     ← Painel do Blader, Onboarding/Claim, ComboBuilder e Card Público
    │   │   ├── BladerCardModal.tsx
    │   │   ├── BladerOnboardingClient.tsx
    │   │   ├── BladerPanelClient.tsx
    │   │   ├── BladersGridClient.tsx
    │   │   ├── ComboBuilder.tsx
    │   │   └── PartSearchSelect.tsx
    │   ├── layout/                     ← Navbar (com estado da sessão), Footer e ThemeToggle
    │   ├── ranking/                    ← RankingTable com filtro por temporada, busca e Card do Blader
    │   ├── shared/
    │   │   ├── BanlistCardModal.tsx    ← Modal gerador de card PNG da ban-list (Feed 4:5, Quadrado 1:1, Story 9:16)
    │   │   ├── BladerAvatar.tsx        ← Avatar seguro com fallback para URLs externas/Google
    │   │   ├── SocialIcons.tsx         ← Ícones SVG das redes sociais oficiais (Instagram, WhatsApp, Discord)
    │   │   └── TournamentCardModal.tsx ← Modal gerador de card PNG de torneio com QR Code (inscrição/Maps) e legenda
    │   ├── stats/                      ← Dashboard público de estatísticas regionais (Recharts v3)
    │   │   ├── CollectionCensusSection.tsx
    │   │   ├── HeadToHeadSection.tsx
    │   │   ├── OverviewSection.tsx
    │   │   ├── PartPerformanceSection.tsx
    │   │   ├── StatsChartTooltip.tsx
    │   │   └── StatsDashboardClient.tsx
    │   ├── tournament/                 ← Componentes públicos de torneio, telão, arenas, PIX e inscrição
    │   │   ├── BroadcastBoardClient.tsx
    │   │   ├── ComboReassemblyClient.tsx
    │   │   ├── HomeLiveTournamentBanner.tsx
    │   │   ├── LiveArenaCard.tsx
    │   │   ├── PixPaymentBox.tsx
    │   │   ├── PublicTournamentLive.tsx
    │   │   ├── TournamentBanlistButton.tsx
    │   │   ├── TournamentMetaSection.tsx
    │   │   ├── TournamentPromoCardButton.tsx
    │   │   └── TournamentRegistrationClient.tsx
    │   └── ui/                         ← Componentes base shadcn/ui (@base-ui/react)
    ├── lib/
    │   ├── auth-roles.ts               ← Papéis (admin, judge, blader), regras de acesso e redirects pós-login
    │   ├── avatar-upload.ts            ← Crop quadrado, compressão WebP 400x400 e upload no bucket avatars
    │   ├── banlist-card-canvas.ts      ← Renderizador Canvas 2D de cards de ban-list OBA para divulgação PNG
    │   ├── combo-rules.ts              ← Regras dos 6 sistemas, compatibilidade e validação de decklist
    │   ├── constants.ts                ← Regras de pontuação, finishes BX e constantes da liga
    │   ├── deck-reassembly.ts          ← Validação de pool original (multiset) e elegibilidade entre rodadas
    │   ├── parts-search.ts             ← Normalização e busca de peças por nome TT + aliases Hasbro
    │   ├── pix.ts                      ← Gerador PIX estático EMVCo/BACEN (BR Code + CRC16) e formatador BRL
    │   ├── receipt-upload.ts           ← Compressão client-side e upload privado no bucket receipts
    │   ├── tournament-card-canvas.ts   ← Renderizador Canvas 2D e legenda de cards de torneio OBA (4:5, 1:1, 9:16) + QR Code
    │   ├── utils.ts                    ← Helper cn()
    │   ├── engine/
    │   │   └── tournament-engine.ts    ← Motor puro OBA (Suíço, Finishes, Tiebreaker, Top Cut)
    │   ├── services/                   ← Consultas e regras de aplicação no Supabase
    │   │   ├── admin-users.ts
    │   │   ├── arena-queries.ts
    │   │   ├── arenas.ts
    │   │   ├── blader-card.ts
    │   │   ├── blader-combos.ts
    │   │   ├── bracket-advancement.ts
    │   │   ├── league.ts
    │   │   ├── parts.ts
    │   │   ├── ranking-recalc.ts
    │   │   ├── registrations.ts
    │   │   ├── stats.ts
    │   │   ├── tournament-live.ts
    │   │   └── tournament-queries.ts
    │   └── supabase/
    │       ├── admin.ts                ← Admin client Supabase (Service Role, uso exclusivo server-side)
    │       ├── client.ts               ← Browser client Supabase
    │       ├── proxy.ts                ← Helper de atualização e proteção de sessão para o proxy
    │       ├── route-cookies.ts        ← Helper compartilhado de cookies e getRequestOrigin()
    │       └── server.ts               ← Server client Supabase (SSR cookies)
    └── types/
        ├── database.ts                 ← Tipos estritos do banco Supabase
        └── domain.ts                   ← Tipos semânticos de negócio e labels
```

---

## 🗄️ Modelagem do Banco de Dados (Supabase)

### Tabelas em Produção e Fase 2 (`001`–`004`)
- `seasons`: Id, year (único), name, starts_at, ends_at, is_active (índice parcial único para temporada ativa), timestamps.
- `bladers`: Id, user_id (único/opcional), name, nickname (único), city, avatar_url, bio (máx. 160 chars), favorite_anime, favorite_system (`BX | BXE | UX | UXE | CX | CXE`), favorite_blade_id, favorite_lock_chip_id, favorite_over_blade_id, favorite_assist_blade_id, favorite_ratchet_id, favorite_bit_id, is_active, timestamps.
- `tournaments`: Id, season_id, ruleset_id, name, slug (único), description, location, event_date, category (`semanal`, `oficial`), format (`swiss_top_cut`, `swiss_only`, legados `swiss`, `single_elim`, `double_elim`), swiss_rounds, top_cut_size (`4`, `8`, `16`), status (`draft`, `open`, `ongoing`, `finished`), registration_status (`closed`, `open`, `finished`), entry_fee, max_players, created_by, timestamps.
- `tournament_participants`: Id, tournament_id, blader_id, seed, is_dropped, created_at (unique por tournament + blader).
- `tournament_results`: Id, tournament_id, blader_id, final_position, swiss_wins, swiss_points, is_swiss_leader, swiss_leader_bonus, podium_points, points_earned (unique por tournament + blader e tournament + final_position).
- `ranking`: Id, season_id, blader_id (unique por season + blader), total_points, tournaments_played, swiss_wins, podiums_count, first_places, second_places, third_places, best_podium, best_position, created_at, updated_at.
- `arenas`: Id, tournament_id, name, display_order, status (`available`, `in_match`, `maintenance`), current_match_id, timestamps.
- `matches`: Id, tournament_id, arena_id, round, match_number, stage (`swiss`, `top_cut`), bracket_label, player1_id, player2_id, player1_score, player2_score, target_score, winner_id, status (`pending`, `in_progress`, `finished`, `cancelled`), is_bye, is_tiebreaker, next_match_id, next_match_slot, loser_next_match_id, loser_next_match_slot, timestamps.
- `match_games` (lance a lance): Id, match_id, round_number, scoring_player_id, finish_type (`spin`, `over`, `burst`, `xtreme`, `draw`), points_awarded, player1_combo_id, player2_combo_id, timestamp.

### Tabelas & Storage da Fase 3 (`005`–`009`)
- `parts_catalog`: Id, name, aliases (`TEXT[]`), part_type (`blade`, `main_blade`, `metal_blade`, `over_blade`, `lock_chip`, `assist_blade`, `ratchet`, `bit`), line (`BX`, `BXE`, `UX`, `UXE`, `CX`, `CXE` ou `NULL` universal para `ratchet`/`bit`), `is_simple_ratchet`, `requires_simple_ratchet`, `blocks_bit`, is_active, timestamps (unique por `name + part_type`).
- `rulesets` & `ruleset_banned_parts`: formatos competitivos independentes (`Livre`, etc.) e peças banidas por formato.
- `league_settings`: singleton (`id = 1`) com chave PIX, recebedor e cidade da liga.
- `blader_inventory`, `blader_claim_requests`, `tournament_registrations`, `registration_combos` (com `system`, `over_blade_id`, `ratchet_id`/`bit_id` nullable): coleção pessoal de peças, solicitações de vínculo de conta e inscrições online/decklists com proteção via RLS + trigger `guard_blader_registration_update`.
- Storage bucket `avatars` (`public = true`, teto `512 KB`): leitura pública e `INSERT`/`UPDATE`/`DELETE` restritos via RLS ao caminho `{auth.uid()}/avatar.webp`.
- Storage bucket `receipts` (`public = false`, teto `5 MB`, imagens + PDF): leitura/escrita privada restrita via RLS à pasta `{tournament_id}/{auth.uid()}/...` para o Blader e acesso total para `admin` via Signed URLs temporárias.

---

## 🔐 Autenticação e Proteção de Rotas (`proxy.ts`)

- O Next.js 16 descontinuou o `middleware.ts` e padronizou o `src/proxy.ts`.
- O `src/proxy.ts` (via `updateSession` em `src/lib/supabase/proxy.ts` e `src/lib/auth-roles.ts`) intercepta `/admin/*` permitindo acesso total a `role = 'admin'`, acesso restrito a `/admin/arenas` e `/admin/arena/[id]` para `role = 'judge'` (redirecionando outras rotas `/admin/*` para `/admin/arenas`) e redirecionando `blader`/não-admins para `/meu-painel`; também protege `/meu-painel/*` exigindo usuário autenticado.
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
SUPABASE_SERVICE_ROLE_KEY=*** (apenas no servidor — gestão de admins em /admin/configuracoes)
NEXT_PUBLIC_APP_URL=https://sistema-oba-alpha.vercel.app
```

---

## 🎯 Status Atual & Próximos Passos

Com as **Fases 1, 2, 3 e 4** implementadas, o Sistema OBA cobre integralmente o ciclo competitivo da **Organização de Beyblade do Amazonas (OBA)**: ranking anual, motor Suíço + Top Cut ao vivo, gestão de catálogo/formatos, inscrições online com PIX e decklists, arbitragem por juízes com rastreamento de combos por round e inteligência de meta/estatísticas regionais.

---

*Documento atualizado em: Novembro 2026 | Sistema OBA — Organização de Beyblade do Amazonas*
