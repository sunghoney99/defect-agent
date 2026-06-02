import Anthropic from "@anthropic-ai/sdk"
import { NextRequest } from "next/server"

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const { messages, analysisContext } = await request.json()

    const systemPrompt = `당신은 데스커 브랜드 하자보수비 데이터를 분석하는 전문 AI 어시스턴트입니다.
아래는 현재 분석된 하자보수비 데이터입니다. 이 데이터를 바탕으로 사용자의 질문에 답변하고 인사이트를 제공하세요.

## 분석 데이터
${analysisContext}

## 답변 지침
- 데이터에 근거한 구체적인 수치와 함께 답변하세요
- 품질 개선에 도움이 되는 실용적인 인사이트를 제공하세요
- 한국어로 간결하고 명확하게 답변하세요
- 데이터에 없는 내용은 추측하지 말고 "데이터에서 확인할 수 없습니다"라고 답변하세요`

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (
              chunk.type === "content_block_delta" &&
              chunk.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }
        } finally {
          controller.close()
        }
      },
    })

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache",
      },
    })
  } catch (error: any) {
    console.error("Chat API error:", error)
    return new Response(
      JSON.stringify({ error: error.message || "API 오류가 발생했습니다." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    )
  }
}
