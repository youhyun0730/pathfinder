import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
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

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { graphId } = await request.json();

    // グラフの全ノードを取得
    const { data: nodes, error: nodesError } = await supabase
      .from('nodes')
      .select('*')
      .eq('graph_id', graphId);

    if (nodesError || !nodes) {
      return NextResponse.json(
        { error: 'ノードの取得に失敗しました' },
        { status: 500 }
      );
    }

    // エッジを取得
    const { data: edges } = await supabase
      .from('edges')
      .select('*')
      .eq('graph_id', graphId);

    // 各ノードのロック状態をチェック
    const updates: { id: string; is_locked: boolean }[] = [];
    const unlockedNodes: any[] = [];

    for (const node of nodes) {
      // 中心ノードと現在地ノードは常にアンロック
      if (
        node.node_type === 'center' ||
        node.node_type === 'current'
      ) {
        if (node.is_locked) {
          updates.push({ id: node.id, is_locked: false });
        }
        continue;
      }

      // 親ノードを取得
      const parentEdge = edges?.find(
        (e) => e.to_node_id === node.id
      );

      if (!parentEdge) {
        // 親がない場合はアンロック
        if (node.is_locked) {
          updates.push({ id: node.id, is_locked: false });
          unlockedNodes.push(node);
        }
        continue;
      }

      const parentNode = nodes.find((n) => n.id === parentEdge.from_node_id);

      if (!parentNode) continue;

      // 親ノードが50%以上達成していればアンロック
      const parentProgress =
        (parentNode.current_exp / parentNode.required_exp) * 100;

      if (parentProgress >= 50) {
        if (node.is_locked) {
          updates.push({ id: node.id, is_locked: false });
          unlockedNodes.push(node);
        }
      } else {
        if (!node.is_locked) {
          updates.push({ id: node.id, is_locked: true });
        }
      }
    }

    // 更新を実行
    for (const update of updates) {
      await supabase
        .from('nodes')
        .update({ is_locked: update.is_locked })
        .eq('id', update.id);
    }

    return NextResponse.json({
      success: true,
      updatedCount: updates.length,
      unlockedNodes,
    });
  } catch (error: any) {
    console.error('ロックチェックエラー:', error);
    return NextResponse.json(
      { error: error.message || 'サーバーエラー' },
      { status: 500 }
    );
  }
}
