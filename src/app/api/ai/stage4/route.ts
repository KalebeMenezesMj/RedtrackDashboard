/**
 * Stage 4 — Encontrar novas fatias de público
 *
 * POST /api/ai/stage4
 * Body (research):  { mode: 'research', nicho: string }
 * Body (multiply):  { mode: 'multiply', creative: string, slices: string[] }
 * Response: text/event-stream (SSE)
 */

import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' })

// ---------------------------------------------------------------------------
// Research prompt — condensa os 7 prompts do documento em uma única análise
// ---------------------------------------------------------------------------

function buildResearchPrompt(nicho: string): string {
  return [
    'Olá, você é um copywriter profissional especializado na escrita de campanhas de marketing de resposta direta e um analista de mercado experiente.',
    '',
    'Sua missão é fazer uma pesquisa profunda e completa sobre o nicho abaixo e me entregar as 30 principais fatias de público compradoras desse mercado, com análise completa.',
    '',
    `NICHO: ${nicho}`,
    '',
    '---',
    '',
    'EXECUTE ESTA PESQUISA NA SEGUINTE ORDEM:',
    '',
    '## FASE 1 — PESQUISA DE MERCADO',
    '',
    'Use todo o seu conhecimento sobre este nicho para identificar:',
    '- Principais demographics (idade, gênero, renda, localização)',
    '- Principais fóruns, comunidades e grupos onde esse público está',
    '- Headlines e hooks que já funcionaram historicamente neste nicho',
    '- Principais dores, problemas e pesadelos relatados por este público',
    '- Produtos mais vendidos (Amazon, ClickBank, etc.) neste nicho',
    '- Principais objeções e crenças limitantes',
    '- Linguagem e vocabulário característico deste público',
    '',
    '## FASE 2 — IDENTIFICAÇÃO DAS 30 FATIAS DE PÚBLICO',
    '',
    'Identifique os principais SUBGRUPOS dentro deste nicho.',
    'Para cada subgrupo, identifique as fatias específicas.',
    '',
    'CRITÉRIO DE SELEÇÃO:',
    '- Cada fatia deve ser específica o suficiente para escrever um anúncio exclusivo para ela',
    '- Se outras fatias virem o anúncio, NÃO deve chamar atenção delas',
    '- A fatia deve indicar o MOMENTO atual e OBJETIVO/DIFICULDADE da pessoa',
    '',
    '## FASE 3 — ENTREGA FINAL',
    '',
    'Entregue EXATAMENTE no formato abaixo para todas as 30 fatias:',
    '',
    '---',
    '',
    '# 30 FATIAS DE PÚBLICO — [NICHO]',
    '*(ordenadas por demanda estimada — maior público primeiro)*',
    '',
    '## SUBGRUPO: [Nome do Subgrupo]',
    '',
    '**[Número]. [Nome da Fatia]**',
    '*Descrição (2 linhas):* [descrição clara e objetiva — quem é essa pessoa, em que momento está, qual dificuldade ou objetivo principal]',
    '',
    'Necessidades:',
    '- [necessidade 1]',
    '- [necessidade 2]',
    '- [necessidade 3]',
    '',
    'Motivações:',
    '- [motivação 1]',
    '- [motivação 2]',
    '- [motivação 3]',
    '',
    'Comportamentos:',
    '- [comportamento 1]',
    '- [comportamento 2]',
    '- [comportamento 3]',
    '',
    'Linguagem/tom ideal para anúncio:',
    '- [dica de tom 1]',
    '- [dica de tom 2]',
    '',
    '---',
    '',
    '*(repetir para todas as 30 fatias)*',
    '',
    'REGRAS FINAIS:',
    '- Entregar todas as 30 fatias sem exceção',
    '- Ser específico e objetivo em cada descrição',
    '- As fatias devem ser distintas entre si',
    '- Usar linguagem prática, orientada para copywriting de anúncios',
    '- Ao final, adicionar uma seção "TOP 5 FATIAS PARA COMEÇAR" com justificativa',
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Multiply prompt — adaptar 1 criativo validado para 5 fatias
// ---------------------------------------------------------------------------

function buildMultiplyPrompt(creative: string, slices: string[]): string {
  const sliceList = slices.map((s, i) => `${i + 1}. ${s || `Fatia ${i + 1}`}`).join('\n')

  return [
    'Você é um copywriter de resposta direta especializado em adaptação de criativos vencedores.',
    '',
    'Vou te enviar um criativo VALIDADO (Hook + Body + CTA).',
    '',
    'Sua tarefa é adaptar esse mesmo criativo para 5 FATIAS DE PÚBLICO diferentes.',
    '',
    '---',
    '',
    '## FATIAS DE PÚBLICO',
    '',
    sliceList,
    '',
    '---',
    '',
    '## OBJETIVO',
    '',
    'Para cada fatia de público:',
    '',
    '- adaptar o criativo de forma completa e independente',
    '- manter o que já funciona',
    '- aumentar identificação com o público específico',
    '',
    '---',
    '',
    '## REGRAS CRÍTICAS',
    '',
    '- NÃO misturar públicos',
    '- NÃO reaproveitar adaptações entre eles',
    '- NÃO reescrever do zero',
    '- NÃO mudar a estrutura original',
    '- NÃO encurtar o texto',
    '',
    '---',
    '',
    '## VOCÊ DEVE ADAPTAR',
    '',
    'Para cada público, ajustar:',
    '',
    '- dores específicas',
    '- desejos ocultos',
    '- linguagem (tom, vocabulário, forma de falar)',
    '- contexto e situações',
    '- nível de consciência',
    '',
    '---',
    '',
    '## OBRIGATÓRIO',
    '',
    '- manter a mesma estrutura: Hook, Body e CTA',
    '- manter o mesmo nível de profundidade',
    '- manter o mesmo ritmo narrativo',
    '- manter intensidade emocional',
    '',
    '---',
    '',
    '## FOCO',
    '',
    '- fazer parecer que o criativo foi feito exclusivamente para aquele público',
    '- aumentar identificação imediata',
    '- intensificar conexão emocional',
    '',
    '---',
    '',
    '## FORMATO DE SAÍDA',
    '',
    '### PÚBLICO 1: (nome da fatia)',
    '',
    'HOOK:',
    '(texto)',
    '',
    'BODY:',
    '(texto)',
    '',
    'CTA:',
    '(texto)',
    '',
    '---',
    '',
    '### PÚBLICO 2: (nome da fatia)',
    '',
    'HOOK:',
    '(texto)',
    '',
    'BODY:',
    '(texto)',
    '',
    'CTA:',
    '(texto)',
    '',
    '---',
    '',
    '*(repetir até o público 5)*',
    '',
    '---',
    '',
    '## REGRAS FINAIS',
    '',
    '- Não explicar nada',
    '- Não comentar',
    '- Apenas entregar os criativos adaptados',
    '',
    '---',
    '',
    '## CRIATIVO VALIDADO:',
    '',
    creative.trim(),
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    mode?: string
    nicho?: string
    creative?: string
    slices?: string[]
  }

  const { mode = 'research', nicho = '', creative = '', slices = ['', '', '', '', ''] } = body

  let prompt = ''

  if (mode === 'research') {
    if (!nicho.trim()) {
      return new Response(JSON.stringify({ error: 'Informe o nicho para pesquisa.' }), { status: 400 })
    }
    prompt = buildResearchPrompt(nicho.trim())
  } else if (mode === 'multiply') {
    if (!creative.trim()) {
      return new Response(JSON.stringify({ error: 'Informe o criativo validado.' }), { status: 400 })
    }
    const validSlices = slices.filter(s => s.trim().length > 0)
    if (validSlices.length === 0) {
      return new Response(JSON.stringify({ error: 'Informe pelo menos uma fatia de público.' }), { status: 400 })
    }
    prompt = buildMultiplyPrompt(creative.trim(), slices)
  } else {
    return new Response(JSON.stringify({ error: 'Mode inválido.' }), { status: 400 })
  }

  const stream = client.messages.stream({
    model: 'claude-opus-4-7',
    max_tokens: 16000,
    thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content: prompt }],
  })

  const encoder = new TextEncoder()
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erro desconhecido'
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(readable, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  })
}
