import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { message, language, userName } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;
    
    console.log('API Key exists:', !!apiKey);
    console.log('API Key prefix:', apiKey ? apiKey.substring(0, 5) : 'none');
    
    if (!apiKey) {
      return NextResponse.json({ response: "API key not configured" });
    }

    let langInstruction = '';
    if (language === 'ha') langInstruction = 'Respond in Hausa language.';
    else if (language === 'ar') langInstruction = 'Respond in Arabic language.';
    else if (language === 'fr') langInstruction = 'Respond in French language.';
    else langInstruction = 'Respond in English language.';

    const prompt = `You are Shara AI, a helpful assistant for Shara Climate Academy.
Student name: ${userName || 'Student'}
${langInstruction}
Keep responses very brief and friendly (2-3 sentences max).
Help with: climate change, courses, certificates, payments, and climate action.

User question: ${message}`;

    console.log('Calling Gemini API with gemini-2.5-flash...');

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 200
          }
        })
      }
    );

    const data = await response.json();
    console.log('Status:', response.status);

    if (!response.ok) {
      console.error('Error:', data.error?.message);
      return NextResponse.json({ 
        response: `Error: ${data.error?.message || 'API error'}`
      });
    }
    
    const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm here to help!";
    console.log('Response received!');
    return NextResponse.json({ response: aiResponse });
    
  } catch (error: any) {
    console.error('Error:', error.message);
    return NextResponse.json({ 
      response: "Hi! I'm Shara AI. How can I help you today? 🌍" 
    });
  }
}
