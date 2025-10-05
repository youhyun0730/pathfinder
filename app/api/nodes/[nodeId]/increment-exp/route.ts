import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(
  request: NextRequest,
  { params }: { params: { nodeId: string } }
) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // 認証確認
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const nodeId = params.nodeId;

    // 現在のノード情報を取得
    const { data: node, error: nodeError } = await supabase
      .from('nodes')
      .select('*, graphs!inner(user_id)')
      .eq('id', nodeId)
      .single();

    if (nodeError || !node) {
      return NextResponse.json(
        { error: 'ノードが見つかりません' },
        { status: 404 }
      );
    }

    // ユーザーが所有しているか確認
    if (node.graphs.user_id !== user.id) {
      return NextResponse.json(
        { error: '権限がありません' },
        { status: 403 }
      );
    }

    // ロックされている場合はエラー
    if (node.is_locked) {
      return NextResponse.json(
        { error: 'ロックされたノードです' },
        { status: 400 }
      );
    }

    // EXP増加量（1タップ = 10 EXP）
    const expGain = 10;
    const newExp = node.current_exp + expGain;

    // 更新
    const { data: updatedNode, error: updateError } = await supabase
      .from('nodes')
      .update({ current_exp: newExp })
      .eq('id', nodeId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json(
        { error: '更新に失敗しました' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      node: updatedNode,
      expGain,
    });
  } catch (error: any) {
    console.error('EXP増加エラー:', error);
    return NextResponse.json(
      { error: error.message || 'サーバーエラー' },
      { status: 500 }
    );
  }
}
