'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Goal, GraphNode } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const router = useRouter();

  useEffect(() => {
    const loadGoals = async () => {
      try {
        const {
          data: { user: currentUser },
        } = await supabase.auth.getUser();

        if (!currentUser) {
          router.push('/login');
          return;
        }

        setUser(currentUser);

        // Load existing goals
        const { data: goalsData } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false });

        if (goalsData) {
          setGoals(goalsData as Goal[]);
        }

        // Load nodes for the graph
        const { data: graph } = await supabase
          .from('graphs')
          .select('id')
          .eq('user_id', currentUser.id)
          .order('version', { ascending: false })
          .limit(1)
          .single();

        if (graph) {
          const { data: graphNodes } = await supabase
            .from('nodes')
            .select('*')
            .eq('graph_id', graph.id);

          if (graphNodes) {
            setNodes(graphNodes as GraphNode[]);
          }
        }
      } catch (error) {
        console.error('目標の読み込みエラー:', error);
      } finally {
        setLoading(false);
      }
    };

    loadGoals();
  }, [router]);

  const handleSubmitGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalDescription.trim() || !user) return;

    setSubmitting(true);

    try {
      // Get the latest graph
      const { data: graph } = await supabase
        .from('graphs')
        .select('*')
        .eq('user_id', user.id)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      if (!graph) {
        alert('グラフが見つかりません');
        return;
      }

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('認証セッションが見つかりません');
        return;
      }

      // Call the goal generation API
      const response = await fetch('/api/llm/goal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          goalDescription: newGoalDescription,
          graphId: graph.id,
        }),
      });

      if (!response.ok) {
        throw new Error('目標の生成に失敗しました');
      }

      const { goal, newNodes } = await response.json();

      // Reload goals
      const { data: goalsData } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (goalsData) {
        setGoals(goalsData as Goal[]);
      }

      setNewGoalDescription('');
      alert(`目標を設定しました！${newNodes || 0}個の新しいノードが追加されました。`);
    } catch (error) {
      console.error('目標の送信エラー:', error);
      alert('目標の設定に失敗しました');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (!confirm('この目標を削除しますか？')) return;

    try {
      await supabase.from('goals').delete().eq('id', goalId);

      setGoals(prevGoals => prevGoals.filter(g => g.id !== goalId));
    } catch (error) {
      console.error('削除エラー:', error);
      alert('削除に失敗しました');
    }
  };

  const handleViewGoalInGraph = (goalId: string) => {
    router.push(`/graph?goalId=${goalId}`);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-600 to-indigo-700">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-white text-2xl"
        >
          読み込み中...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-indigo-700">
      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
        <div className="container mx-auto px-4 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/graph')}
              className="text-white hover:text-white/80 transition"
            >
              ← グラフに戻る
            </button>
            <h1 className="text-2xl font-bold text-white">目標設定</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white text-sm hidden sm:block">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-white/20 text-white rounded-lg hover:bg-white/30 transition"
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Goal Input Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 mb-8"
        >
          <h2 className="text-2xl font-bold text-gray-800 mb-4">新しい目標を設定</h2>
          <form onSubmit={handleSubmitGoal} className="space-y-4">
            <div>
              <label htmlFor="goal" className="block text-sm font-medium text-gray-700 mb-2">
                達成したい目標を入力してください
              </label>
              <textarea
                id="goal"
                value={newGoalDescription}
                onChange={(e) => setNewGoalDescription(e.target.value)}
                placeholder="例: フルスタックエンジニアになりたい、TOEIC 800点を取りたい、など..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none text-gray-900 placeholder:text-gray-400"
                rows={4}
                disabled={submitting}
                maxLength={500}
              />
              <div className="mt-1 text-xs text-gray-500 text-right">
                {newGoalDescription.length} / 500
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting || !newGoalDescription.trim()}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg"
            >
              {submitting ? '生成中...' : '目標を設定'}
            </button>
          </form>
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              💡 AIがあなたの目標に基づいて、達成までの推奨パスを自動生成します。
              必要に応じて新しいスキルノードがツリーに追加されます。
            </p>
          </div>
        </motion.div>

        {/* Goals List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="text-2xl font-bold text-white mb-6">現在の目標</h2>
          {goals.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-xl p-8 text-center">
              <p className="text-gray-600">まだ目標が設定されていません</p>
              <p className="text-sm text-gray-500 mt-2">
                上のフォームから最初の目標を設定してみましょう！
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {goals.map((goal, index) => (
                  <motion.div
                    key={goal.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                    className="bg-white/95 backdrop-blur-md rounded-xl shadow-lg p-6 hover:shadow-xl transition"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-800 mb-2">
                          {goal.description}
                        </h3>
                        <div className="flex flex-wrap gap-2 text-sm text-gray-600">
                          <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full">
                            推奨パス: {goal.recommendedPath?.length || 0}ステップ
                          </span>
                          <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full">
                            {new Date(goal.createdAt).toLocaleDateString('ja-JP')}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => handleViewGoalInGraph(goal.id)}
                          className="flex-1 sm:flex-none px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition text-sm font-medium"
                        >
                          グラフで表示
                        </button>
                        <button
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="px-4 py-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition text-sm font-medium"
                        >
                          削除
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
