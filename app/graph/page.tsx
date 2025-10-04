'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { GraphNode } from '@/types';

export default function GraphPage() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
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

        if (graphNodes) {
          setNodes(graphNodes as GraphNode[]);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
      {/* ヘッダー */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-white">Pathfinder</h1>
          <div className="flex items-center gap-4">
            <span className="text-white">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            あなたのスキルツリー
          </h2>

          {/* 仮のノード表示 */}
          <div className="space-y-4">
            <p className="text-gray-600 mb-4">
              {nodes.length}個のノードが生成されました
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nodes.map((node) => (
                <div
                  key={node.id}
                  className="p-4 border-2 rounded-lg"
                  style={{ borderColor: node.color }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: node.color }}
                    />
                    <span className="text-xs font-semibold text-gray-500 uppercase">
                      {node.nodeType}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-800 mb-2">{node.label}</h3>
                  <p className="text-sm text-gray-600 mb-3">{node.description}</p>
                  <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full transition-all"
                      style={{
                        width: `${(node.currentExp / node.requiredExp) * 100}%`,
                        backgroundColor: node.color,
                      }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {node.currentExp} / {node.requiredExp} EXP
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 p-6 bg-blue-50 rounded-lg">
            <h3 className="font-bold text-blue-900 mb-2">🚧 開発中</h3>
            <p className="text-blue-800">
              React Flowを使用したインタラクティブなグラフビューは次のフェーズで実装予定です。
              現在は生成されたノードのリストを表示しています。
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
