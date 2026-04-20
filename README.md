# RedTrack Dashboard

Dashboard de analytics em tempo real para monitoramento de campanhas via [RedTrack API](https://redtrack.io), com módulo de **Análise de Criativos com IA** (Claude Opus 4.7). Visualize gastos, receita, ROI e conversões por plataforma de tráfego — e use IA para otimizar e multiplicar seus criativos vencedores.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8?logo=tailwindcss)
![Recharts](https://img.shields.io/badge/Recharts-2-22d3ee)
![Claude](https://img.shields.io/badge/Claude-Opus_4.7-orange?logo=anthropic)

---

## Funcionalidades

### Painel de Analytics
- **Painel Geral** — KPIs consolidados de todas as campanhas ativas
- **Campanhas por Plataforma** — filtro por Facebook, Google, YouTube, TikTok, Outbrain e Taboola
- **Drawer de Campanha** — análise detalhada por campanha com gráficos diários
- **Seletor de Período** — filtro por intervalo de datas customizável
- **Cache no servidor** — evita estouro do limite de 20 RPM da API RedTrack
- **Responsivo** — funciona em mobile, tablet e desktop

### Análise de Criativos com IA
Módulo completo para análise matemática de criativos e geração de variações via IA:

- **Upload de planilha** — importa relatório `.xlsx` exportado do RedTrack
- **Classificação matemática** — ordena hooks (por retenção) e bodies (por conversão) em TOP, FORTE e FRACO
- **Score de anúncios** — pontuação ponderada de cada combinação hook + body
- **Combinações prioritizadas** — lista as melhores combinações com potencial de escala
- **Recomendação de CTA** — sugere o melhor call-to-action baseado em performance

#### Stage 3 — Bater Controle de Body + Hook (IA)
Pipeline sequencial em 3 passos para multiplicar criativos vencedores:
1. **Mix dos Melhores Bodies** — cola o copy dos bodies TOP/FORTE separadamente por anúncio → gera variações com abordagens distintas (lógica direta, história, dor, prova, etc.)
2. **Mix dos Melhores Hooks** — cola o copy dos hooks TOP/FORTE separadamente por anúncio → gera variações mais agressivas usando 16 ângulos diferentes
3. **Junção** — combina hooks e bodies gerados em criativos prontos com transições fluidas

#### Stage 4 — Fatias de Público (IA)
- **Pesquisa de mercado** — insere o nicho e recebe 30 fatias de público compradoras com necessidades, motivações, comportamentos e tom ideal para anúncio, além de um ranking TOP 5
- **Multiplicar criativo** — cola um criativo validado (Hook + Body + CTA) e define 5 fatias → a IA adapta o criativo para cada público mantendo a estrutura original

---

## Pré-requisitos

- [Node.js](https://nodejs.org/) 18 ou superior
- [npm](https://www.npmjs.com/) (incluso com Node.js)
- Chave de API RedTrack válida
- Chave de API Anthropic (para os Stages 3 e 4 com IA)

---

## Instalação

```bash
# 1. Clone o repositório
git clone <url-do-repositorio>
cd dashboard

# 2. Instale as dependências
npm install

# 3. Configure as variáveis de ambiente
cp .env.local.example .env.local
```

Edite o arquivo `.env.local` com suas credenciais:

```env
REDTRACK_API_KEY=sua_chave_api_aqui
NEXT_PUBLIC_APP_NAME=RedTrack Dashboard
ANTHROPIC_API_KEY=sk-ant-api03-...
```

```bash
# 4. Inicie o servidor de desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) no navegador.

---

## Variáveis de Ambiente

| Variável | Descrição | Obrigatória |
|----------|-----------|-------------|
| `REDTRACK_API_KEY` | Chave de API da conta RedTrack | Sim |
| `ANTHROPIC_API_KEY` | Chave de API da Anthropic (Claude) | Para Stages 3 e 4 |
| `NEXT_PUBLIC_APP_NAME` | Nome exibido no cabeçalho do app | Não |

> Ambas as chaves são usadas **somente no servidor** (rotas `/api/*`) e nunca são expostas ao cliente.

---

## Scripts

```bash
npm run dev      # Servidor de desenvolvimento (porta 3000)
npm run build    # Build de produção
npm run start    # Executa o build de produção
npm run lint     # Lint com ESLint
```

---

## Estrutura do Projeto

```
dashboard/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── report/              # Dados agregados de todas as campanhas
│   │   │   ├── platform/            # Dados filtrados por plataforma de tráfego
│   │   │   ├── campaign/[id]/       # Métricas diárias de uma campanha específica
│   │   │   ├── settings/            # Configurações da conta RedTrack
│   │   │   ├── debug/               # Endpoint de diagnóstico (desenvolvimento)
│   │   │   └── ai/
│   │   │       ├── stage3/          # SSE: variações de body + hook + junção
│   │   │       └── stage4/          # SSE: pesquisa de fatias + multiplicação
│   │   ├── analise-criativos/       # Módulo de análise de criativos + IA
│   │   ├── campanhas/               # Página de seleção de plataforma
│   │   ├── page.tsx                 # Painel principal
│   │   ├── layout.tsx               # Layout raiz
│   │   └── globals.css              # Estilos globais
│   ├── components/
│   │   ├── KPICard.tsx              # Card de métrica com ícone e tooltip
│   │   ├── CampaignTable.tsx        # Tabela de campanhas com ordenação
│   │   ├── CampaignDrawer.tsx       # Painel lateral de detalhes da campanha
│   │   ├── CampaignPieChart.tsx     # Gráfico de pizza por campanha
│   │   ├── ROILineChart.tsx         # Gráfico de linha ROI & Lucro
│   │   ├── SpendRevenueChart.tsx    # Gráfico de barras Gasto vs Receita
│   │   ├── DateRangePicker.tsx      # Seletor de período
│   │   ├── InfoTooltip.tsx          # Tooltip contextual (ícone ⓘ)
│   │   ├── Sidebar.tsx              # Menu de navegação lateral
│   │   └── StatusBadge.tsx          # Indicador de status da API
│   └── lib/
│       ├── redtrack.ts              # Cliente HTTP da API RedTrack
│       ├── reportCache.ts           # Cache em memória no servidor
│       ├── format.ts                # Utilitários de formatação
│       └── types.ts                 # Tipos e interfaces TypeScript
├── public/
│   └── images/                      # Logos das plataformas
├── .env.local                       # Variáveis de ambiente (não versionar)
├── next.config.js                   # Configuração do Next.js
├── tailwind.config.js               # Tema e customizações do Tailwind
└── tsconfig.json                    # Configuração do TypeScript
```

---

## Rotas da API

### Analytics (RedTrack)

Todas as rotas proxy retornam JSON no formato `{ ok, ...dados }`.

#### `GET /api/report`
Agrega métricas de todas as campanhas ativas.

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `from` | `YYYY-MM-DD` | Data inicial |
| `to` | `YYYY-MM-DD` | Data final |

#### `GET /api/platform`
Filtra campanhas por tag de plataforma.

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `tag` | `string` | Tag da plataforma: `FB`, `GG`, `YT`, `TTK`, `OT`, `TB` |
| `from` | `YYYY-MM-DD` | Data inicial |
| `to` | `YYYY-MM-DD` | Data final |

#### `GET /api/campaign/[id]`
Métricas diárias de uma campanha específica.

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `from` | `YYYY-MM-DD` | Data inicial |
| `to` | `YYYY-MM-DD` | Data final |

---

### IA — Análise de Criativos

Todas as rotas de IA usam **Server-Sent Events (SSE)** para streaming em tempo real.  
Resposta: `Content-Type: text/event-stream`, eventos no formato `data: {"text":"..."}`, finaliza com `data: [DONE]`.

#### `POST /api/ai/stage3`
Pipeline de variações de body e hook.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `step` | `1 \| 2 \| 3` | 1 = gerar bodies · 2 = gerar hooks · 3 = combinar |
| `bodyCopy` | `string` | Bodies dos top performers (step 1) |
| `hookCopy` | `string` | Hooks dos top performers (step 2) |
| `bodiesOutput` | `string` | Saída do step 1, usada no step 3 |
| `hooksOutput` | `string` | Saída do step 2, usada no step 3 |

A quantidade de variações geradas escala automaticamente com o número de copies recebidos:

| Bodies recebidos | Variações geradas | Hooks recebidos | Variações geradas |
|-----------------|------------------|-----------------|------------------|
| 1–3 | 5 | 1–3 | 10 |
| 4–6 | 8 | 4–6 | 15 |
| 7–10 | 12 | 7–10 | 20 |
| 10+ | 15 | 10+ | 25 |

#### `POST /api/ai/stage4`
Pesquisa de fatias de público e multiplicação de criativos.

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `mode` | `'research' \| 'multiply'` | Modo de operação |
| `nicho` | `string` | Nicho de mercado (mode: research) |
| `creative` | `string` | Criativo validado Hook+Body+CTA (mode: multiply) |
| `slices` | `string[]` | Array de 5 fatias de público (mode: multiply) |

---

## Plataformas Suportadas

As campanhas são identificadas por tags no título dentro do RedTrack:

| Tag | Plataforma |
|-----|-----------|
| `[FB]` | Facebook Ads |
| `[GG]` | Google Ads |
| `[YT]` | YouTube Ads |
| `[TTK]` | TikTok Ads |
| `[OT]` | Outbrain |
| `[TB]` | Taboola |

---

## Métricas Disponíveis

| Métrica | Descrição |
|---------|-----------|
| **Gasto** | Total investido nas campanhas no período |
| **Receita** | Total de receita gerada pelas conversões |
| **Lucro** | Receita − Gasto (negativo = prejuízo, exibido em vermelho) |
| **ROI** | Retorno sobre investimento em percentual |
| **Conversões** | Total de conversões rastreadas |
| **Cliques** | Total de cliques nas campanhas |
| **Compras** | Eventos de compra (convtype1) |
| **Init. Checkout** | Início de checkout (convtype2) |

---

## Cache (RedTrack)

Para respeitar o limite de **20 requisições por minuto** da API RedTrack, a aplicação utiliza cache em memória no servidor:

| Dado | TTL |
|------|-----|
| IDs de campanhas ativas | 10 minutos |
| Relatório por campanha | 3 minutos |
| Relatório diário | 5 minutos |
| IDs por plataforma | 10 minutos |

Em caso de erro 429 (rate limit), o cache vencido é retornado como fallback para evitar tela em branco.

---

## Tecnologias

| Tecnologia | Uso |
|-----------|-----|
| [Next.js 14](https://nextjs.org/) | Framework React com App Router e API Routes |
| [TypeScript](https://www.typescriptlang.org/) | Tipagem estática |
| [Tailwind CSS](https://tailwindcss.com/) | Estilização utilitária |
| [Recharts](https://recharts.org/) | Gráficos interativos |
| [Anthropic SDK](https://github.com/anthropic-ai/sdk-js) | Integração com Claude Opus 4.7 via streaming SSE |
| [Axios](https://axios-http.com/) | Cliente HTTP |
| [date-fns](https://date-fns.org/) | Manipulação de datas |
| [Lucide React](https://lucide.dev/) | Ícones |
| [SheetJS (xlsx)](https://sheetjs.com/) | Leitura de planilhas `.xlsx` |
| [react-datepicker](https://reactdatepicker.com/) | Seletor de datas |

---

## Licença

Uso interno. Todos os direitos reservados.
