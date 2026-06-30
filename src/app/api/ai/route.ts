import { NextRequest, NextResponse } from 'next/server';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function POST(request: NextRequest) {
  try {
    const { messages }: { messages: Message[] } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages requis' }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'GROQ_API_KEY non configurée' }, { status: 500 });
    }

    const systemPrompt: Message = {
      role: 'system',
      content: `Tu es un assistant IA intégré dans une application de chat.

Règles :
- Réponds en français.
- Sois court, clair et utile.
- Tu as accès à l'historique de la conversation pour garder le contexte.
- Ne fais pas de longs discours.
- Si on te pose une question, réponds directement.`,
    };

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [systemPrompt, ...messages],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Groq API error:', response.status, errorText);
      return NextResponse.json({ error: 'Erreur API Groq' }, { status: response.status });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      return NextResponse.json({ error: 'Réponse vide' }, { status: 500 });
    }

    return NextResponse.json({ reply });
  } catch (err) {
    console.error('AI route error:', err);
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 });
  }
}
