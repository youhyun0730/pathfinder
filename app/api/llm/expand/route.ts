import { NextRequest, NextResponse } from 'next/server';
import { generateJSON } from '@/lib/llm/client';
import { createTreeExpansionPrompt } from '@/lib/llm/prompts';
import { TreeGenerationResponse, NodeType } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { nodeLabel, nodeDescription, nodeType, category } = await request.json() as {
      nodeLabel: string;
      nodeDescription: string;
      nodeType: NodeType;
      category: string;
    };

    if (!nodeLabel || !nodeType) {
      return NextResponse.json(
        { error: 'Invalid request: nodeLabel and nodeType are required' },
        { status: 400 }
      );
    }

    // プロンプト生成
    const prompt = createTreeExpansionPrompt(
      nodeLabel,
      nodeDescription,
      nodeType,
      category
    );

    // Geminiでツリー拡張
    const expansionData = await generateJSON<TreeGenerationResponse>(prompt);

    return NextResponse.json({
      expansion: expansionData,
      success: true,
    });
  } catch (error) {
    console.error('Tree expansion error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage === 'QUOTA_EXCEEDED' || errorMessage === 'SERVICE_OVERLOADED') {
      return NextResponse.json(
        { error: 'サービスが混み合っています。しばらく時間をおいてから再度お試しください。' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'スキルツリーの拡張に失敗しました。もう一度お試しください。' },
      { status: 500 }
    );
  }
}
