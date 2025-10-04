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
    return NextResponse.json(
      { error: 'Failed to generate skill tree' },
      { status: 500 }
    );
  }
}
