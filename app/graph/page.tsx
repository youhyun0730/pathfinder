'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { GraphNode, GraphEdge, Goal } from '@/types';
import { calculateRadialLayout } from '@/lib/graph/layout';
import dynamic from 'next/dynamic';
import NodeContextMenu from '@/components/graph/NodeContextMenu';
import UnlockCelebration from '@/components/graph/UnlockCelebration';
import MaxExpCelebration from '@/components/graph/MaxExpCelebration';
import Dialog from '@/components/ui/Dialog';
import Toast from '@/components/ui/Toast';
import LoadingScreen from '@/components/ui/LoadingScreen';
import { motion } from 'framer-motion';

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
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    node: GraphNode;
    position: { x: number; y: number };
  } | null>(null);
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);
  const [unlockedNodes, setUnlockedNodes] = useState<GraphNode[]>([]);
  const [maxedNode, setMaxedNode] = useState<GraphNode | null>(null);
  const [dialog, setDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    variant: 'info' | 'warning' | 'error' | 'success';
    onConfirm?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    variant: 'info',
  });
  const [toast, setToast] = useState<{
    isOpen: boolean;
    message: string;
    variant: 'info' | 'success' | 'error' | 'warning';
  }>({
    isOpen: false,
    message: '',
    variant: 'info',
  });
  const router = useRouter();
  const searchParams = useSearchParams();
  const goalId = searchParams.get('goalId');

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

        // Load goal if goalId is provided
        if (goalId) {
          const { data: goalData } = await supabase
            .from('goals')
            .select('*')
            .eq('id', goalId)
            .single();

          if (goalData) {
            // Convert snake_case to camelCase
            const goal = {
              id: goalData.id,
              userId: goalData.user_id,
              description: goalData.description,
              targetNodeId: goalData.target_node_id,
              recommendedPath: goalData.recommended_path,
              createdAt: goalData.created_at,
            } as Goal;

            setActiveGoal(goal);
          }
        }
      } catch (error) {
        console.error('グラフの読み込みエラー:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGraph();
  }, [router, goalId]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return <LoadingScreen message="スキルツリーを読み込み中..." />;
  }

  const checkUnlocks = async (graphId: string) => {
    try {
      const response = await fetch('/api/nodes/unlock-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ graphId }),
      });

      if (response.ok) {
        const { unlockedNodes: newlyUnlockedNodes } = await response.json();

        // グラフを再読み込み（レイアウト再計算はしない）
        const { data: graphNodes } = await supabase
          .from('nodes')
          .select('*')
          .eq('graph_id', graphId);

        const { data: graphEdges } = await supabase
          .from('edges')
          .select('*')
          .eq('graph_id', graphId);

        if (graphNodes) {
          // 既存のノードの位置を保持し、is_lockedのみ更新
          setNodes(prevNodes =>
            prevNodes.map(prevNode => {
              const updatedNode = graphNodes.find((n: GraphNode) => n.id === prevNode.id);
              if (updatedNode) {
                return {
                  ...prevNode,
                  isLocked: updatedNode.is_locked,
                  is_locked: updatedNode.is_locked,
                };
              }
              return prevNode;
            })
          );
        }

        if (graphEdges) {
          setEdges(graphEdges as GraphEdge[]);
        }

        // アンロックされたノードがあれば祝福ポップアップを表示
        if (newlyUnlockedNodes && newlyUnlockedNodes.length > 0) {
          setUnlockedNodes(newlyUnlockedNodes);
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
        const parentId = nodeMap.get(parentLabel) || node.id;

        const newNode = {
          graph_id: graph.id,
          node_type: newNodeData.nodeType,
          label: newNodeData.label,
          description: newNodeData.description,
          required_exp: newNodeData.requiredExp,
          current_exp: 0,
          parent_ids: [parentId],
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

      setToast({
        isOpen: true,
        message: `${expansion.nodes.length}個の新しいノードを追加しました！`,
        variant: 'success',
      });
    } catch (error) {
      console.error('ツリー拡張エラー:', error);
      setToast({
        isOpen: true,
        message: 'ツリーの拡張に失敗しました',
        variant: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubtree = async () => {
    if (!contextMenu) return;

    setDialog({
      isOpen: true,
      title: 'ツリーの削除',
      message: `「${contextMenu.node.label}」とその子孫ノードを削除しますか？\nこの操作は取り消せません。`,
      variant: 'warning',
      onConfirm: async () => {
        await performDeleteSubtree();
      },
    });
  };

  const performDeleteSubtree = async () => {
    if (!contextMenu) return;

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

      // グラフIDを取得
      const { data: graph } = await supabase
        .from('graphs')
        .select('id')
        .eq('user_id', user.id)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (!graph) throw new Error('グラフが見つかりません');

      // グラフを再読み込みしてレイアウト再計算
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

      setContextMenu(null);
    } catch (error) {
      console.error('削除エラー:', error);
      setToast({
        isOpen: true,
        message: '削除に失敗しました',
        variant: 'error',
      });
    }
  };

  const handleResetProgress = async () => {
    if (!contextMenu) return;

    setDialog({
      isOpen: true,
      title: '進捗の初期化',
      message: `「${contextMenu.node.label}」の進捗を初期化しますか？`,
      variant: 'warning',
      onConfirm: async () => {
        await performResetProgress();
      },
    });
  };

  const performResetProgress = async () => {
    if (!contextMenu) return;

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
      setToast({
        isOpen: true,
        message: '初期化に失敗しました',
        variant: 'error',
      });
    }
  };

  const handleCompleteInstantly = async () => {
    if (!contextMenu) return;

    setDialog({
      isOpen: true,
      title: '即座に完了',
      message: `「${contextMenu.node.label}」を即座に完了させますか？`,
      variant: 'info',
      onConfirm: async () => {
        await performCompleteInstantly();
      },
    });
  };

  const performCompleteInstantly = async () => {
    if (!contextMenu) return;

    const requiredExp = contextMenu.node.requiredExp || contextMenu.node.required_exp || 100;

    try {
      await supabase
        .from('nodes')
        .update({ current_exp: requiredExp })
        .eq('id', contextMenu.node.id);

      // 画面を更新
      setNodes(prevNodes =>
        prevNodes.map(n =>
          n.id === contextMenu.node.id
            ? { ...n, currentExp: requiredExp, current_exp: requiredExp }
            : n
        )
      );

      // カンスト祝福ポップアップを表示
      setMaxedNode({
        ...contextMenu.node,
        currentExp: requiredExp,
        current_exp: requiredExp,
      });

      setContextMenu(null);

      // アンロックチェック
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
      console.error('即座完了エラー:', error);
      setToast({
        isOpen: true,
        message: '完了処理に失敗しました',
        variant: 'error',
      });
    }
  };

  const handleNodeClick = async (node: GraphNode) => {
    const isLocked = node.isLocked || node.is_locked;
    const currentExp = node.currentExp || node.current_exp || 0;
    const requiredExp = node.requiredExp || node.required_exp || 100;
    const isMaxed = currentExp >= requiredExp;

    console.log('ノードクリック:', {
      label: node.label,
      id: node.id,
      isLocked,
      isMaxed,
      node
    });

    if (isLocked) {
      console.log('ロックされたノードです:', node.label);
      return;
    }

    if (isMaxed) {
      console.log('EXPカンスト済みです:', node.label);
      return;
    }

    try {
      console.log('API呼び出し開始:', `/api/nodes/${node.id}/increment-exp`);

      const response = await fetch(`/api/nodes/${node.id}/increment-exp`, {
        method: 'POST',
        cache: 'no-store'
      });

      console.log('APIレスポンス:', response.status, response.statusText);

      if (!response.ok) {
        const error = await response.json();
        console.error('EXP増加エラー:', error);
        return;
      }

      const { node: updatedNode, expGain } = await response.json();
      console.log('EXP増加成功:', { expGain, newExp: updatedNode.current_exp });

      // カンストチェック
      const wasMaxed = currentExp >= requiredExp;
      const nowMaxed = updatedNode.current_exp >= updatedNode.required_exp;

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

      // カンストした場合は祝福ポップアップを表示
      if (!wasMaxed && nowMaxed) {
        setMaxedNode({
          ...node,
          currentExp: updatedNode.current_exp,
          current_exp: updatedNode.current_exp,
        });
      }

      // ロックチェック（親ノードが50%達成したら子をアンロック）
      // 進捗が50%以上の場合のみチェックを実行
      const currentProgress = (updatedNode.current_exp / updatedNode.required_exp) * 100;
      if (currentProgress >= 50) {
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
      }
    } catch (error) {
      console.error('ノードクリックエラー:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600 flex flex-col">
      {/* ヘッダー */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-white tracking-wider" style={{ letterSpacing: '0.1em' }}>PATHFINDER</h1>
          <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
            <button
              onClick={() => router.push('/goals')}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition text-sm font-medium"
            >
              🎯 目標設定
            </button>
            <span className="text-white text-sm hidden sm:block">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition text-sm"
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
              highlightedNodeId={activeGoal?.targetNodeId}
              onPaneClick={handleContextMenuClose}
              onMove={handleContextMenuClose}
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
            onCompleteInstantly={handleCompleteInstantly}
          />
        )}

        {/* フローティング情報パネル */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute top-4 left-4 bg-white/50 backdrop-blur-md rounded-lg shadow-lg p-4 max-w-xs"
        >
          {activeGoal && (
            <div className="mb-2 p-2 bg-gradient-to-r from-purple-100/80 to-pink-100/80 rounded text-xs">
              <p className="font-semibold text-purple-800">🎯 目標: {activeGoal.description}</p>
              <button
                onClick={() => {
                  setActiveGoal(null);
                  router.push('/graph');
                }}
                className="mt-2 text-xs text-purple-700 hover:text-purple-900 underline"
              >
                ハイライトを解除
              </button>
            </div>
          )}
          <div className="text-sm text-gray-700">
            <p>👆 スキルをクリックして成長させよう!</p>
          </div>
        </motion.div>

        {/* アンロック祝福ポップアップ */}
        {unlockedNodes.length > 0 && (
          <UnlockCelebration
            unlockedNodes={unlockedNodes}
            onClose={() => setUnlockedNodes([])}
          />
        )}

        {/* カンスト祝福ポップアップ */}
        {maxedNode && (
          <MaxExpCelebration
            node={maxedNode}
            onClose={() => setMaxedNode(null)}
          />
        )}

        {/* カスタムダイアログ */}
        <Dialog
          isOpen={dialog.isOpen}
          onClose={() => setDialog({ ...dialog, isOpen: false })}
          onConfirm={dialog.onConfirm}
          title={dialog.title}
          message={dialog.message}
          variant={dialog.variant}
        />

        {/* トースト通知 */}
        <Toast
          isOpen={toast.isOpen}
          onClose={() => setToast({ ...toast, isOpen: false })}
          message={toast.message}
          variant={toast.variant}
        />
      </main>
    </div>
  );
}
