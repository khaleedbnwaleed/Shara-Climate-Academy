import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
});

export async function POST(request: NextRequest) {
  try {
    const { message, language, userName } = await request.json();
    
    console.log('Message:', message);
    console.log('API Key exists:', !!process.env.GROQ_API_KEY);

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ response: "AI service is being configured." });
    }

    let langInstruction = '';
    if (language === 'ha') langInstruction = 'Respond in Hausa language.';
    else if (language === 'ar') langInstruction = 'Respond in Arabic language.';
    else if (language === 'fr') langInstruction = 'Respond in French language.';
    else langInstruction = 'Respond in English language.';

    const systemContent = "You are Shara AI, a helpful assistant for Shara Climate Academy. Student name: " + (userName || 'Student') + ". " + langInstruction + " Be very brief and friendly (2-3 sentences max).";

    const completion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemContent },
        { role: "user", content: message }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 150,
    });

    const response = completion.choices[0]?.message?.content || "I'm here to help!";
    
    console.log('Response:', response.substring(0, 100));
    
    return NextResponse.json({ response: response });
    
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ response: "Hi! I'm Shara AI. How can I help you today? 🌍" });
  }
}
