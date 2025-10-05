'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { GraphNode, GraphEdge } from '@/types';
import { calculateRadialLayout } from '@/lib/graph/layout';
import dynamic from 'next/dynamic';
import NodeContextMenu from '@/components/graph/NodeContextMenu';

// React FlowはクライアントサイドのみでレンダリングするためにSSRを無効化
const GraphCanvas = dynamic(() => import('@/components/graph/GraphCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <div className="text-gray-500">グラフを読み込み中...</div>
    </div>
  ),
});

export default function GraphPage() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [contextMenu, setContextMenu] = useState<{
    node: GraphNode;
    position: { x: number; y: number };
  } | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const router = useRouter();

  useEffect(() => {
    const loadGraph = async () => {
      try {
        // ユーザー取得
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!currentUser) {
          router.push('/login');
          return;
        }

        setUser(currentUser);

        // グラフ取得
        const { data: graph } = await supabase
          .from('graphs')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('version', { ascending: false })
          .limit(1)
          .single();

        if (!graph) {
          router.push('/onboarding');
          return;
        }

        // ノード取得
        const { data: graphNodes } = await supabase
          .from('nodes')
          .select('*')
          .eq('graph_id', graph.id);

        // エッジ取得
        const { data: graphEdges } = await supabase
          .from('edges')
          .select('*')
          .eq('graph_id', graph.id);

        if (graphNodes) {
          // レイアウト計算
          const layoutNodes = calculateRadialLayout(
            graphNodes as GraphNode[],
            (graphEdges as GraphEdge[]) || []
          );
          setNodes(layoutNodes);
        }

        if (graphEdges) {
          setEdges(graphEdges as GraphEdge[]);
        }
      } catch (error) {
        console.error('グラフの読み込みエラー:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGraph();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-white text-2xl">読み込み中...</div>
      </div>
    );
  }

  const checkUnlocks = async (graphId: string) => {
    try {
      const response = await fetch('/api/nodes/unlock-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graphId }),
      });

      if (response.ok) {
        // グラフを再読み込み
        const { data: graphNodes } = await supabase
          .from('nodes')
          .select('*')
          .eq('graph_id', graphId);

        const { data: graphEdges } = await supabase
          .from('edges')
          .select('*')
          .eq('graph_id', graphId);

        if (graphNodes) {
          const layoutNodes = calculateRadialLayout(
            graphNodes as GraphNode[],
            (graphEdges as GraphEdge[]) || []
          );
          setNodes(layoutNodes);
        }

        if (graphEdges) {
          setEdges(graphEdges as GraphEdge[]);
        }
      }
    } catch (error) {
      console.error('アンロックチェックエラー:', error);
    }
  };

  const handleNodeLongPress = (node: GraphNode, event: React.MouseEvent) => {
    event.preventDefault();
    setContextMenu({
      node,
      position: { x: event.clientX, y: event.clientY },
    });
  };

  const handleContextMenuClose = () => {
    setContextMenu(null);
  };

  const handleExpandTree = async () => {
    if (!contextMenu) return;

    const node = contextMenu.node;
    setContextMenu(null);

    try {
      setLoading(true);

      // プロファイルからカテゴリを取得
      const { data: profile } = await supabase
        .from('profiles')
        .select('answers')
        .eq('id', user.id)
        .single();

      const category = profile?.answers?.interests || 'general';

      // LLMでツリー拡張
      const expandResponse = await fetch('/api/llm/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeLabel: node.label,
          nodeDescription: node.description,
          nodeType: node.nodeType || node.node_type,
          category,
        }),
      });

      if (!expandResponse.ok) {
        throw new Error('ツリー拡張に失敗しました');
      }

      const { expansion } = await expandResponse.json();

      // グラフIDを取得
      const { data: graph } = await supabase
        .from('graphs')
        .select('id')
        .eq('user_id', user.id)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (!graph) throw new Error('グラフが見つかりません');

      // 新しいノードを作成
      const nodeMap = new Map<string, string>();
      nodeMap.set(node.label, node.id);

      const colorMap: Record<string, string> = {
        skill: '#7ED321',
        cert: '#9013FE',
        position: '#F5A623',
      };

      // ノードを作成（位置は後でcalculateRadialLayoutが計算）
      for (const newNodeData of expansion.nodes) {
        // 親ラベルから親IDを取得
        const parentLabel = newNodeData.parentLabels?.[0] || node.label;
        let parentId = nodeMap.get(parentLabel) || node.id;

        const newNode = {
          graph_id: graph.id,
          node_type: newNodeData.nodeType,
          label: newNodeData.label,
          description: newNodeData.description,
          required_exp: newNodeData.requiredExp,
          current_exp: 0,
          parent_ids: [parentId],
          position_x: 0, // 仮の位置（calculateRadialLayoutで再計算される）
          position_y: 0,
          color: colorMap[newNodeData.nodeType] || '#4A90E2',
          is_locked: true,
          metadata: { suggestedResources: newNodeData.suggestedResources || [] },
        };

        const { data: createdNode } = await supabase
          .from('nodes')
          .insert(newNode)
          .select()
          .single();

        if (createdNode) {
          nodeMap.set(newNodeData.label, createdNode.id);

          // エッジを作成
          await supabase.from('edges').insert({
            graph_id: graph.id,
            from_node_id: parentId,
            to_node_id: createdNode.id,
          });
        }
      }

      // グラフを再読み込み
      const { data: graphNodes } = await supabase
        .from('nodes')
        .select('*')
        .eq('graph_id', graph.id);

      const { data: graphEdges } = await supabase
        .from('edges')
        .select('*')
        .eq('graph_id', graph.id);

      if (graphNodes) {
        const layoutNodes = calculateRadialLayout(
          graphNodes as GraphNode[],
          (graphEdges as GraphEdge[]) || []
        );
        setNodes(layoutNodes);
      }

      if (graphEdges) {
        setEdges(graphEdges as GraphEdge[]);
      }

      alert(`${expansion.nodes.length}個の新しいノードを追加しました！`);
    } catch (error) {
      console.error('ツリー拡張エラー:', error);
      alert('ツリーの拡張に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubtree = async () => {
    if (!contextMenu) return;

    if (!confirm(`「${contextMenu.node.label}」とその子孫ノードを削除しますか？\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      // 子孫ノードを再帰的に取得
      const nodesToDelete = new Set<string>([contextMenu.node.id]);
      const queue = [contextMenu.node.id];

      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        const childEdges = edges.filter(e =>
          (e.sourceId || e.source_id || e.fromNodeId || e.from_node_id) === nodeId
        );

        childEdges.forEach(edge => {
          const childId = edge.targetId || edge.target_id || edge.toNodeId || edge.to_node_id;
          if (!nodesToDelete.has(childId)) {
            nodesToDelete.add(childId);
            queue.push(childId);
          }
        });
      }

      // エッジを削除
      for (const nodeId of nodesToDelete) {
        await supabase.from('edges').delete().or(`from_node_id.eq.${nodeId},to_node_id.eq.${nodeId}`);
      }

      // ノードを削除
      for (const nodeId of nodesToDelete) {
        await supabase.from('nodes').delete().eq('id', nodeId);
      }

      // 画面を更新
      setNodes(prevNodes => prevNodes.filter(n => !nodesToDelete.has(n.id)));
      setEdges(prevEdges => prevEdges.filter(e =>
        !nodesToDelete.has(e.sourceId || e.source_id || e.fromNodeId || e.from_node_id || '') &&
        !nodesToDelete.has(e.targetId || e.target_id || e.toNodeId || e.to_node_id || '')
      ));

      setContextMenu(null);
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  const handleResetProgress = async () => {
    if (!contextMenu) return;

    if (!confirm(`「${contextMenu.node.label}」の進捗を初期化しますか？`)) {
      return;
    }

    try {
      await supabase
        .from('nodes')
        .update({ current_exp: 0 })
        .eq('id', contextMenu.node.id);

      // 画面を更新
      setNodes(prevNodes =>
        prevNodes.map(n =>
          n.id === contextMenu.node.id
            ? { ...n, currentExp: 0, current_exp: 0 }
            : n
        )
      );

      setContextMenu(null);
    } catch (error) {
      console.error('初期化エラー:', error);
      alert('初期化に失敗しました');
    }
  };

  const handleNodeClick = async (node: GraphNode) => {
    if (node.isLocked) {
      console.log('ロックされたノードです:', node.label);
      return;
    }

    try {
      const response = await fetch(`/api/nodes/${node.id}/increment-exp`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('EXP増加エラー:', error);
        return;
      }

      const { node: updatedNode, expGain } = await response.json();

      // ノードを更新
      setNodes(prevNodes =>
        prevNodes.map(n =>
          n.id === updatedNode.id
            ? {
                ...n,
                currentExp: updatedNode.current_exp,
                current_exp: updatedNode.current_exp
              }
            : n
        )
      );

      console.log(`${node.label} +${expGain} EXP!`);

      // ロックチェック（親ノードが50%達成したら子をアンロック）
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (currentUser) {
        const { data: graph } = await supabase
          .from('graphs')
          .select('id')
          .eq('user_id', currentUser.id)
          .order('version', { ascending: false })
          .limit(1)
          .single();

        if (graph) {
          await checkUnlocks(graph.id);
        }
      }
    } catch (error) {
      console.error('ノードクリックエラー:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Pathfinder</h1>
          <div className="flex items-center gap-4">
            <span className="text-white text-sm">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ - グラフキャンバス */}
      <main className="flex-1 relative">
        <div className="absolute inset-0 bg-white/5 backdrop-blur-sm m-4 rounded-2xl shadow-2xl overflow-hidden">
          {nodes.length > 0 ? (
            <GraphCanvas
              nodes={nodes}
              edges={edges}
              onNodeClick={handleNodeClick}
              onNodeLongPress={handleNodeLongPress}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <p className="text-white text-lg">ノードが見つかりません</p>
            </div>
          )}
        </div>

        {/* コンテキストメニュー */}
        {contextMenu && (
          <NodeContextMenu
            node={contextMenu.node}
            position={contextMenu.position}
            onClose={handleContextMenuClose}
            onExpandTree={handleExpandTree}
            onDeleteSubtree={handleDeleteSubtree}
            onResetProgress={handleResetProgress}
          />
        )}

        {/* フローティング情報パネル */}
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md rounded-lg shadow-lg p-4 max-w-xs">
          <h3 className="font-bold text-gray-800 mb-2">スキルツリー</h3>
          <p className="text-sm text-gray-600 mb-2">
            {nodes.length}個のノードを表示中
          </p>
          <div className="text-xs text-gray-500 space-y-1">
            <p>🖱️ ドラッグでパン移動</p>
            <p>🔍 スクロールでズーム</p>
            <p>👆 ノードをクリックしてEXP獲得</p>
          </div>
        </div>
      </main>
    </div>
  );
}
