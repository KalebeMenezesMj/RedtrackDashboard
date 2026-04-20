/**
 * Stage 3 — Bater controle de Body + Hook (Modo Automático)
 *
 * POST /api/ai/stage3
 * Body: { step: 1|2|3, bodyCopy?: string, hookCopy?: string, bodiesOutput?: string, hooksOutput?: string }
 * Response: text/event-stream (SSE)
 */

import Anthropic from '@anthropic-ai/sdk'
import { NextRequest } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' })

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Conta blocos no texto separados por '---' ou parágrafo duplo (min 30 chars) */
function countBlocks(text: string): number {
  const items = text.split(/\n---+\n|\n{3,}/).filter(s => s.trim().length >= 30)
  return Math.max(1, items.length)
}

function bodyQuantity(count: number): number {
  if (count <= 3)  return 5
  if (count <= 6)  return 8
  if (count <= 10) return 12
  return 15
}

function hookQuantity(count: number): number {
  if (count <= 3)  return 10
  if (count <= 6)  return 15
  if (count <= 10) return 20
  return 25
}

// ---------------------------------------------------------------------------
// Prompts (exatamente conforme o documento)
// ---------------------------------------------------------------------------

function buildBodyPrompt(bodyCopy: string): string {
  const qty = bodyQuantity(countBlocks(bodyCopy))
  return [
    'Você é um copywriter e estrategista de performance.',
    '',
    'Vou te enviar uma lista de BODY\'s de criativos que já performaram bem.',
    '',
    'Sua tarefa é criar novas variações com alta probabilidade de bater controle.',
    '',
    'OBJETIVO',
    '',
    'Gerar novos BODY\'s mantendo o DNA dos melhores, mas com profundidade suficiente para sustentar conversão.',
    '',
    'QUANTIDADE',
    '',
    `Gere exatamente ${qty} variações.`,
    '',
    'REGRA CRÍTICA (PROFUNDIDADE)',
    '',
    'Cada BODY deve:',
    '',
    'ter desenvolvimento completo de ideia explicar, sustentar ou provar o argumento NÃO ser superficial ou resumido',
    '',
    'Tamanho esperado:',
    '',
    'mínimo de 120 a 250 palavras por BODY pode ser maior se necessário OBRIGATÓRIO',
    '',
    'Cada variação deve usar uma abordagem diferente:',
    '',
    'lógica direta',
    'história',
    'dor intensa',
    'transformação/alívio',
    'prova/autoridade',
    'explicação de mecanismo',
    'quebra de crença',
    '',
    'ESTRUTURA INTERNA (OBRIGATÓRIA)',
    '',
    'Cada BODY deve conter pelo menos 2 desses elementos:',
    '',
    'dor clara ou situação específica',
    'explicação do problema',
    'mecanismo ou causa',
    'prova ou exemplo',
    'promessa implícita ou explícita',
    '',
    'REGRAS CRÍTICAS',
    'NÃO copiar nem parafrasear',
    'NÃO repetir estrutura',
    'NÃO simplificar demais',
    'NÃO encurtar ideias',
    '',
    'FOCO',
    'manter o que funciona',
    'aumentar clareza e impacto',
    'aprofundar argumento',
    'melhorar potencial de conversão',
    '',
    'FORMATO',
    '',
    'BODY 1:',
    '(texto)',
    '',
    'BODY 2:',
    '(texto)',
    '',
    '...',
    '',
    'REGRAS FINAIS',
    'Não explicar nada',
    'Não comentar',
    'Apenas entregar os textos',
    '',
    '---',
    '',
    'BODIES RECEBIDOS:',
    bodyCopy.trim(),
  ].join('\n')
}

function buildHookPrompt(hookCopy: string): string {
  const qty = hookQuantity(countBlocks(hookCopy))
  return [
    'Você é um copywriter de performance especializado em criação de HOOKS altamente agressivos e focados em retenção.',
    '',
    'Vou te enviar uma lista de HOOKS que já performaram bem.',
    '',
    'Sua tarefa é criar novas variações com alta probabilidade de parar o scroll e aumentar retenção — com mais intensidade, mais dor e mais impacto do que os originais.',
    '',
    'O QUE É UM HOOK',
    '',
    'O hook é a primeira parte do criativo.',
    '',
    'Ele serve para:',
    '',
    'capturar atenção imediata',
    'gerar curiosidade',
    'criar tensão',
    'fazer a pessoa continuar assistindo',
    '',
    'O hook NÃO deve:',
    '',
    'explicar tudo',
    'entregar a solução',
    'ser completo',
    '',
    'OBJETIVO',
    '',
    'Gerar novos HOOKS mais fortes que os originais, elevando:',
    '',
    'intensidade emocional',
    'curiosidade',
    'impacto imediato',
    '',
    'QUANTIDADE',
    '',
    `Gere exatamente ${qty} variações.`,
    '',
    'ÂNGULOS (OBRIGATÓRIO USAR E VARIAR)',
    '',
    'Cada hook deve usar um ângulo diferente ou combinação de ângulos:',
    '',
    'Promessa',
    'Problema',
    'Causa raiz',
    'Mecanismo da solução',
    'Segredo antigo',
    'História emocional',
    'Descoberta científica',
    'Controvérsia',
    'Future pacing',
    'História associativa',
    'Demonstração dramática',
    'Notícia sensacionalista',
    'Conspiração',
    'Depoimento',
    'Pergunta paradoxal',
    'Quebra de expectativa',
    '',
    'OBRIGATÓRIO',
    '',
    'Cada hook deve explorar um ângulo diferente',
    'Pode combinar ângulos para aumentar força',
    'Deve aumentar intensidade em relação aos originais',
    '',
    'TOM (CRÍTICO)',
    'mais agressivo',
    'mais direto',
    'mais visceral',
    'mais "dedo na ferida"',
    '',
    'Evite suavizar.',
    '',
    'REGRAS CRÍTICAS',
    '',
    'NÃO copiar ou parafrasear',
    'NÃO repetir estrutura',
    'NÃO explicar demais',
    'NÃO concluir a ideia',
    '',
    'FOCO',
    'parar o scroll',
    'gerar curiosidade forte',
    'criar tensão imediata',
    '',
    'FORMATO',
    '',
    'HOOK 1:',
    '(texto)',
    '',
    'HOOK 2:',
    '(texto)',
    '',
    '...',
    '',
    'REGRAS FINAIS',
    'Não explicar nada',
    'Não comentar',
    'Apenas entregar os hooks',
    '',
    '---',
    '',
    'HOOKS RECEBIDOS:',
    hookCopy.trim(),
  ].join('\n')
}

function buildCombinePrompt(bodiesOutput: string, hooksOutput: string): string {
  return [
    'Você é um estrategista de criativos e especialista em montagem de anúncios de alta performance.',
    '',
    'Vou te enviar:',
    '',
    'Lista de HOOKS',
    'Lista de BODYS',
    '',
    'Sua tarefa é combinar HOOK + BODY de forma estratégica, mantendo fluidez e coerência.',
    '',
    'OBJETIVO',
    '',
    'Criar combinações prontas de criativos onde:',
    '',
    'o hook captura atenção',
    'o body sustenta e desenvolve',
    '',
    'REGRA PRINCIPAL',
    'Cada BODY deve receber até 2 HOOKS',
    'NÃO combinar todos com todos',
    'Distribuir os hooks de forma equilibrada',
    '',
    'LÓGICA DE DISTRIBUIÇÃO',
    'Percorra os BODIES na ordem',
    'Para cada BODY, associe até 2 HOOKS',
    'Continue até acabar os hooks ou bodies',
    'Se sobrar HOOK, não forçar uso',
    '',
    'TRANSIÇÃO (CRÍTICO)',
    '',
    'Você deve adaptar a conexão entre hook e body:',
    '',
    'Criar uma frase ou ajuste leve entre eles',
    'Garantir que a leitura seja fluida',
    'Evitar quebra brusca',
    'Não repetir o hook dentro do body',
    '',
    'REGRAS CRÍTICAS',
    'NÃO alterar o núcleo do BODY',
    'NÃO distorcer o HOOK',
    'Apenas ajustar conexão entre eles',
    'Manter naturalidade',
    '',
    'FORMATO',
    '',
    'CRIATIVO 1:',
    'HOOK:',
    '(texto)',
    '',
    'TRANSIÇÃO:',
    '(texto curto, 1 linha no máximo)',
    '',
    'BODY:',
    '(texto)',
    '',
    'CRIATIVO 2:',
    '...',
    '',
    'SOBRAS',
    '',
    'Se houver HOOKS não utilizados, listar no final:',
    '',
    'HOOKS NÃO UTILIZADOS:',
    '',
    '(lista)',
    '',
    'REGRAS FINAIS',
    'Não explicar nada',
    'Não justificar',
    'Apenas entregar combinações prontas',
    '',
    '---',
    '',
    'LISTA DE HOOKS:',
    hooksOutput.trim(),
    '',
    '---',
    '',
    'LISTA DE BODIES:',
    bodiesOutput.trim(),
  ].join('\n')
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    step?: number
    bodyCopy?: string
    hookCopy?: string
    bodiesOutput?: string
    hooksOutput?: string
  }

  const { step = 1, bodyCopy = '', hookCopy = '', bodiesOutput = '', hooksOutput = '' } = body

  let prompt = ''
  if (step === 1) {
    if (!bodyCopy.trim()) {
      return new Response(JSON.stringify({ error: 'Nenhum body fornecido.' }), { status: 400 })
    }
    prompt = buildBodyPrompt(bodyCopy)
  } else if (step === 2) {
    if (!hookCopy.trim()) {
      return new Response(JSON.stringify({ error: 'Nenhum hook fornecido.' }), { status: 400 })
    }
    prompt = buildHookPrompt(hookCopy)
  } else if (step === 3) {
    if (!bodiesOutput.trim() && !hooksOutput.trim()) {
      return new Response(JSON.stringify({ error: 'Execute os passos 1 e 2 primeiro.' }), { status: 400 })
    }
    prompt = buildCombinePrompt(
      bodiesOutput || bodyCopy,
      hooksOutput || hookCopy,
    )
  } else {
    return new Response(JSON.stringify({ error: 'Step inválido.' }), { status: 400 })
  }

  const stream = client.messages.stream({
    model: 'claude-opus-4-7',
    max_tokens: 8192,
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
