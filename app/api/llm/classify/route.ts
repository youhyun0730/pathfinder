import { NextRequest, NextResponse } from 'next/server';
import { generateJSON } from '@/lib/llm/client';
import { createClassifyPrompt } from '@/lib/llm/prompts';
import { CurrentPositionClassification, OnboardingAnswer } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { answers } = await request.json() as { answers: OnboardingAnswer[] };

    if (!answers || !Array.isArray(answers)) {
      return NextResponse.json(
        { error: 'Invalid request: answers array is required' },
        { status: 400 }
      );
    }

    // プロンプト生成
    const prompt = createClassifyPrompt(answers);

    // Geminiで現在地分類
    const classifications = await generateJSON<CurrentPositionClassification[]>(prompt);

    return NextResponse.json({
      classifications,
      success: true,
    });
  } catch (error) {
    console.error('Classification error:', error);
    return NextResponse.json(
      { error: 'Failed to classify user position' },
      { status: 500 }
    );
  }
}
