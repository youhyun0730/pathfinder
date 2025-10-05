import { NextRequest, NextResponse } from 'next/server';
import { generateJSON } from '@/lib/llm/client';
import { createTreeGenerationPrompt } from '@/lib/llm/prompts';
import { CurrentPositionClassification, TreeGenerationResponse } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { currentPosition } = await request.json() as {
      currentPosition: CurrentPositionClassification;
    };

    if (!currentPosition) {
      return NextResponse.json(
        { error: 'Invalid request: currentPosition is required' },
        { status: 400 }
      );
    }

    // プロンプト生成
    const prompt = createTreeGenerationPrompt(currentPosition);

    // Geminiでツリー生成
    const treeData = await generateJSON<TreeGenerationResponse>(prompt);

    return NextResponse.json({
      tree: treeData,
      success: true,
    });
  } catch (error) {
    console.error('Tree generation error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage === 'QUOTA_EXCEEDED' || errorMessage === 'SERVICE_OVERLOADED') {
      return NextResponse.json(
        { error: 'サービスが混み合っています。しばらく時間をおいてから再度お試しください。' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'スキルツリーの生成に失敗しました。もう一度お試しください。' },
      { status: 500 }
    );
  }
}
