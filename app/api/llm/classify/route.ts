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

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage === 'QUOTA_EXCEEDED' || errorMessage === 'SERVICE_OVERLOADED') {
      return NextResponse.json(
        { error: 'サービスが混み合っています。しばらく時間をおいてから再度お試しください。' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: '現在地の分析に失敗しました。もう一度お試しください。' },
      { status: 500 }
    );
  }
}
