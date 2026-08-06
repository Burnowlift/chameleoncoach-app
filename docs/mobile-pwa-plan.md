# 📱 Plano de Melhorias — Mobile + Implementação PWA

> Objetivo: transformar o Chameleon Coach em um **app instalável, rápido e offline-first**, com UX mobile de primeira linha para o portal do aluno (e para o treinador no dia a dia).

## ✅ Status de implementação (06/08/2026)

| Item | Status |
|---|---|
| `vite-plugin-pwa` + manifest + ícones (192/512/maskable/apple-touch) | ✅ Implementado |
| Service worker com precache do shell + cache de imagens R2 | ✅ Implementado |
| Meta tags PWA (`theme-color`, `viewport-fit`, iOS) | ✅ Implementado |
| Prompt automático de instalação ao abrir o site (`InstallAppDialog`) | ✅ Implementado |
| Botão "Instalar" (Chrome/Edge/Android) + instruções iOS (Adicionar à Tela de Início) | ✅ Implementado |
| Dismiss com re-exibição após 7 dias / sessão | ✅ Implementado |
| Build, typecheck e testes | ✅ Passando |
| Push notifications, bottom nav, code splitting | ⚙️ Parcial — bottom nav, code splitting e **notificações in-app + Web Push codificados** (06/08); ativação depende do deploy das migrations/functions |

**Extras implementados (06/08):**
- ✅ **Bottom nav do aluno** (`StudentBottomNav.tsx`): barra fixa no mobile (Início / Histórico / Check-ins) com safe area (`pb-safe`) e ativação por rota, nas páginas Dashboard, Histórico e Histórico de Check-ins
- ✅ **Safe areas / toque:** `env(safe-area-inset-*)` global, `overscroll-behavior-y: none`, `-webkit-tap-highlight-color: transparent`
- ✅ **Code splitting:** rotas pesadas via `React.lazy` + `Suspense` (todas as páginas exceto entrada/auth); `manualChunks` (vendor-react, vendor-recharts, vendor-supabase) — bundle inicial caiu de **1.402 kB → 639 kB** (gzip 398 → 184 kB)
- ✅ **Background Sync** (item P3): SW em `injectManifest` (`public/sw.ts`) com handler `sync` (tag `chameleon-sync`) que acorda clientes abertos; `enqueueAction` registra o sync tag
- ✅ **Notificações in-app** (`NotificationBell` + `useNotifications`): sino com badge de não lidas, painel com lista e "marcar todas como lidas"; Realtime (INSERT em `notifications`) atualiza em tempo real; montado no header do treinador (`CoachLayout`) e do aluno (`StudentDashboard`)
- ✅ **Web Push codificado:** handler `push`/`notificationclick` no SW; tabela `push_subscriptions` (migração `20260807000000_push_subscriptions.sql`); Edge Function `register-push-subscription`; toggle "Ativar push" no sino (permite negar silenciosamente se a função não estiver publicada); chaves VAPID geradas (pública em `src/config/push.ts`, privada em `scripts/.vapid-private-key` — gitignored); script de envio `scripts/send-push.js` (web-push, remove inscrições 404/410)

---

## 1. Diagnóstico atual

### O que já existe
- ✅ Layout responsivo com Tailwind/shadcn (`md:`, `lg:`, `max-w-*` em páginas-chave).
- ✅ Tema escuro dedicado ao aluno (`JaguarTheme`) — experiência de app.
- ✅ Fixes específicos de mobile já aplicados: login no Safari iOS (storage adapter), desativação de auto-capitalização no iOS.
- ✅ `viewport` configurado; rotas SPA com fallback no Netlify.
- ✅ Auth persistente (Supabase) com "Lembrar-me" (`rememberMeStorage`).

### O que falta
| Item | Status |
|---|---|
| Web App Manifest (`manifest.json`) | ❌ Não existe |
| Service Worker / offline | ❌ Não existe |
| Ícone de app (192px, 512px, apple-touch-icon) | ❌ Não existe |
| `theme-color`, `viewport-fit=cover`, meta tags iOS (PWA) | ❌ Não existem |
| Botão "Instalar app" / prompt de instalação | ❌ Não existe |
| Push notifications (web) | ❌ Não existe |
| Bottom navigation no mobile | ❌ Sidebar de coach existe; aluno não tem nav fixa |
| Pull-to-refresh, safe areas (notch), toque (touch targets) | ⚠️ Parcial |
| Perf: code-splitting, lazy loading, bundle | ⚠️ Não otimizado |
| Testes E2E mobile (Playwright em viewport móvel) | ⚠️ Não há configuração |

---

## 2. Fase 1 — PWA base (instalação + offline) ⭐ maior impacto

### 2.1 — Dependências

```bash
bun add -d vite-plugin-pwa
# ícones: adicionar à pasta public/ (512x512, 192x192, maskable, apple-touch-icon 180x180)
```

### 2.2 — Configurar `vite.config.ts`

```ts
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => ({
  // ... config existente
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.ico", "apple-touch-icon.png"],
      manifest: {
        name: "Chameleon Coach",
        short_name: "Chameleon",
        description: "Treinos personalizados que evoluem com você.",
        lang: "pt-BR",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "/pwa-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: "NetworkFirst",
            options: { cacheName: "supabase-api", expiration: { maxEntries: 50, maxAgeSeconds: 60 } },
          },
          { // imagens R2/avatars
            urlPattern: /^https:\/\/pub-.*\.r2\.dev\/.*/i,
            handler: "CacheFirst",
            options: { cacheName: "r2-images", expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
        ],
      },
    }),
  ],
}));
```

> **Atenção:** cache de API Supabase deve ser `NetworkFirst` com TTL curto (ou não cachear respostas autenticadas — avaliar). Nunca cachear respostas com dados de saúde em cache persistente por longos períodos (LGPD). Alternativa segura: não incluir runtimeCaching de API e deixar o offline apenas para shell (app + UI), com dados via TanStack Query cache em memória.

### 2.3 — Meta tags no `index.html`

```html
<meta name="theme-color" content="#0f172a" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="mobile-web-app-capable" content="yes" />
```

### 2.4 — Botão "Instalar app"

- Hook `usePWAInstall` escutando `beforeinstallprompt`.
- Componente `InstallAppButton`: aparece no dashboard do aluno e no sidebar do coach quando o evento dispara (desktop Chrome/Edge, Android).
- iOS (Safari): exibir dica "Toque em Compartilhar → Adicionar à Tela de Início" para quem acessar via Safari.

### 2.5 — Offline-first na prática

- **Shell offline:** service worker (Workbox) com `navigateFallback` cobre navegação e UI.
- **Dados:** TanStack Query com `staleTime` generoso + persistência opcional (`persistQueryClient`) apenas para dados não sensíveis (catálogo de exercícios, templates).
- **Banner de conectividade:** componente `OfflineBanner` via `navigator.onLine` + eventos `online`/`offline`.
- **Fila offline (opcional, fase 2):** registros de check-in/treino salvos localmente (localStorage/IndexedDB) e sincronizados ao voltar (Background Sync `sync.register`).

---

## 3. Fase 2 — UX mobile

### 3.1 — Navegação
- **Aluno:** bottom navigation fixa (Dashboard, Treino, Check-in, Mais) para telas `< md`; tabs com icons.
- **Coach:** manter Sidebar (colapsável), mas garantir `Sheet` (drawer) no mobile em vez de sidebar overlay pesado; adicionar header com menu hambúrguer.

### 3.2 — Safe areas e toque
- CSS global:
  ```css
  body { padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left); }
  ```
- Áreas fixas (bottom nav, headers) com `padding-bottom: env(safe-area-inset-bottom)`.
- Touch targets ≥ 44px (`h-11`+ nos botões de ação principal); foco visível (`focus-visible`).
- `overscroll-behavior` para evitar bounce estranho; `-webkit-tap-highlight-color: transparent`.

### 3.3 — Interações nativas
- **Pull-to-refresh:** custom (evitar conflito com service worker) ou botão de refresh.
- **Share:** Web Share API nos botões "Compartilhar resultado/troféu" (`navigator.share`) com fallback para clipboard.
- **Vibration/feedback** opcional no check-in (navegadores Android).
- **Upload de anamnese:** aceitar câmera (`capture="user"`) em input de arquivo — já usado no app; garantir compressão de imagem antes do upload (evitar base64 gigante no Storage).

### 3.4 — Tabelas e formulários
- `Ranking`, `Students`, `StudentWorkout`: transformar tabelas largas em cards/lista empilhada no mobile (dados essenciais primeiro, expandir para detalhes).
- Formulários longos (anamnese): wizard por etapas com progresso salvo (localStorage) — já existe fluxo de anamnese; validar em telas < 400px.
- Números (peso, RPE, 1RM): usar `<input type="number">` com `inputmode="decimal"` e teclado numérico.

### 3.5 — Performance mobile
- **Code splitting:** `React.lazy` nas rotas pesadas (`Ranking`, `Plans`, `StudentCheckinHistory`, módulos de finance) — reduzir bundle inicial.
- `loading="lazy"` em imagens de avatar/R2; dimensões fixas (evitar CLS).
- Recharts: carregar dinamicamente; considerar versão tree-shakeable.
- **Métricas:** alvo < 3s LCP em 4G; audit no Lighthouse mobile a cada release.

---

## 4. Fase 3 — Push notifications

> Alavanca a tabela `notifications` já existente (após correção do M-3 do [plano de segurança](security-improvements-plan.md)).

- **Opção A:** Web Push com VAPID — **implementado** (06/08): SW `push`/`notificationclick` em `public/sw.ts`; tabela `push_subscriptions`; Edge Function `register-push-subscription`; toggle no sino; VAPID keys em `src/config/push.ts` + `scripts/.vapid-private-key`; envio via `scripts/send-push.js`. ⏳ **Ativação:** rodar `supabase db push` e `supabase functions deploy register-push-subscription`, depois pedir permissão (toggle no sino).
- **Opção B:** Supabase Realtime para **notificações in-app** — **implementado** (06/08): `NotificationBell` + `useNotifications` (badge, painel, marcar lidas, atualização via `postgres_changes` em `notifications`), montado no header do treinador e do aluno.
- Permissão pedida no contexto certo (toggle explícito no sino, nunca no 1º load).
- Casos: resposta do treinador ao check-in, novo treino publicado, podium/campeonato, lembrete de check-in semanal.
- No iOS/Safari, push web exige app instalado na tela inicial (a partir do iOS 16.4) — documentar.
- **Pendente:** trigger automático de push (ex.: lembrete de check-in semanal) e integração com envio agendado.

---

## 5. Testes e validação

### 5.1 — Playwright mobile — ✅ Implementado (06/08)
- `playwright.config.ts` reescrito (config lovable removida — pacote nunca instalado): projetos `desktop-chromium`, `mobile-chrome` (Pixel 7) e `mobile-ios` (iPhone 13, WebKit) + `webServer` (build + preview na 4173).
- `e2e/smoke.spec.ts`: 5 testes públicos (landing + manifest, CTA instalação mobile, login aluno, login treinador, SW registrado/ativo) — **15/15 passando** (3 projetos).
- Script: `npm run test:e2e` (browsers: `npx playwright install chromium webkit`).
- Fluxos com dados ainda **pendentes** (exigem credenciais): login → dashboard → check-in, upload anamnese.

### 5.2 — Checklist de qualidade
- Lighthouse PWA (installable, offline, best practices) ≥ 90.
- Teste manual: iPhone (Safari), Android (Chrome), iPad, desktop.
- Offline: abrir app → modo avião → navegar entre rotas do shell.
- Atualização: publicar nova versão → `autoUpdate` do Workbox recarrega.

### 5.3 — Segurança no contexto PWA
- Service worker não pode expor rotas autenticadas em cache público.
- Não persistir dados de saúde/check-ins em IndexedDB sem criptografia/contexto claro.
- Headers CSP (plano de segurança) devem permitir o worker (`worker-src 'self'`).

---

## 6. Backlog priorizado

| Prioridade | Item | Esforço |
|---|---|---|
| P0 | Manifest + service worker + ícones + meta tags (instalável) | S |
| P0 | `vite-plugin-pwa` com shell offline | S |
| P1 | Botão instalar + dica iOS | S |
| P1 | Bottom nav do aluno + safe areas | M |
| P1 | Offline banner + refresh manual | S |
| P2 | Persistência seletiva de dados (exercícios/templates) | M |
| P2 | Code splitting e lazy loading de rotas | S |
| P2 | Web Share API + compressão de imagem na anamnese | S |
| P3 | Push notifications (Realtime in-app + Web Push) | M |
| P3 | Background sync de check-ins/treinos | M |
| P3 | Playwright mobile + Lighthouse CI | M |

---

## 7. Critérios de aceite (Fase 1)

1. `bun run build` gera `manifest.webmanifest` + `sw.js` + ícones; app instalável no Chrome Android e adicionável à tela inicial no iOS.
2. Com o app aberto uma vez e em modo avião, o shell (UI + navegação) continua funcionando e exibe banner de offline.
3. Lighthouse PWA ≥ 90 (installable + offline).
4. Nenhuma resposta autenticada de dados sensíveis fica em cache persistente.
5. Login e "Lembrar-me" continuam funcionando após instalação/atualização do worker.
