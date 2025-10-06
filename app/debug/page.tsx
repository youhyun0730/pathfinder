'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Dialog from '@/components/ui/Dialog';
import Toast from '@/components/ui/Toast';

export default function DebugPage() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [session, setSession] = useState<{ access_token: string; refresh_token: string } | null>(null);
  const [profile, setProfile] = useState<{ id: string; name: string; graph_id: string } | null>(null);
  const [error, setError] = useState<string>('');
  const [deleting, setDeleting] = useState(false);
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

  const handleDeleteGraph = async () => {
    if (!user) {
      setToast({
        isOpen: true,
        message: 'ログインしてください',
        variant: 'warning',
      });
      return;
    }

    setDialog({
      isOpen: true,
      title: 'スキルツリーの削除',
      message: '本当にスキルツリーを削除しますか？この操作は取り消せません。',
      variant: 'error',
      onConfirm: async () => {
        await performDeleteGraph();
      },
    });
  };

  const performDeleteGraph = async () => {
    if (!user) {
      setToast({
        isOpen: true,
        message: 'ユーザー情報が見つかりません',
        variant: 'error',
      });
      return;
    }

    setDeleting(true);
    try {
      if (!user) {
        setToast({
          isOpen: true,
          message: 'ログインしてください',
          variant: 'warning',
        });
        setDeleting(false);
        return;
      }

      // グラフを取得
      const { data: graphs } = await supabase
        .from('graphs')
        .select('id')
        .eq('user_id', user.id);

      if (!graphs || graphs.length === 0) {
        setToast({
          isOpen: true,
          message: '削除するグラフが見つかりません',
          variant: 'warning',
        });
        return;
      }

      for (const graph of graphs) {
        // エッジを削除
        await supabase.from('edges').delete().eq('graph_id', graph.id);

        // ノードを削除
        await supabase.from('nodes').delete().eq('graph_id', graph.id);

        // グラフを削除
        await supabase.from('graphs').delete().eq('id', graph.id);
      }

      // プロファイルを削除
      await supabase.from('profiles').delete().eq('id', user.id);

      setToast({
        isOpen: true,
        message: 'スキルツリーとプロファイルを削除しました。オンボーディングからやり直してください。',
        variant: 'success',
      });
      setTimeout(() => {
        window.location.href = '/onboarding';
      }, 2000);
    } catch (err: unknown) {
      console.error('削除エラー:', err);
      const errorMessage = err instanceof Error ? err.message : '不明なエラー';
      setToast({
        isOpen: true,
        message: `削除に失敗しました: ${errorMessage}`,
        variant: 'error',
      });
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // セッション取得
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        console.log('Session:', sessionData, 'Error:', sessionError);
        setSession(sessionData.session);

        // ユーザー取得
        const { data: userData, error: userError } = await supabase.auth.getUser();
        console.log('User:', userData, 'Error:', userError);
        setUser(userData.user);

        if (userData.user) {
          // プロファイル取得
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userData.user.id);

          console.log('Profile:', profileData, 'Error:', profileError);

          if (profileError) {
            setError(profileError.message);
          } else if (profileData && profileData.length > 0) {
            setProfile(profileData[0]);
          } else {
            setProfile(null);
            setError('プロファイルが見つかりません（オンボーディング未完了）');
          }
        }
      } catch (err: unknown) {
        console.error('Debug error:', err);
        setError(err instanceof Error ? err.message : '不明なエラー');
      }
    };

    checkAuth();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">認証デバッグページ</h1>

        <div className="space-y-4">
          {/* セッション情報 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">セッション情報</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>

          {/* ユーザー情報 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">ユーザー情報</h2>
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
              {JSON.stringify(user, null, 2)}
            </pre>
          </div>

          {/* プロファイル情報 */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">プロファイル情報</h2>
            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded mb-4">
                エラー: {error}
              </div>
            )}
            <pre className="bg-gray-100 p-4 rounded overflow-x-auto text-sm">
              {JSON.stringify(profile, null, 2)}
            </pre>
          </div>

          {/* 環境変数チェック */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">環境変数チェック</h2>
            <div className="space-y-2">
              <p>
                <strong>SUPABASE_URL:</strong>{' '}
                {process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ 設定済み' : '❌ 未設定'}
              </p>
              <p>
                <strong>SUPABASE_ANON_KEY:</strong>{' '}
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ 設定済み' : '❌ 未設定'}
              </p>
            </div>
          </div>

          {/* アクション */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">アクション</h2>
            <div className="space-x-4 mb-4">
              <a
                href="/login"
                className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                ログインページへ
              </a>
              <a
                href="/onboarding"
                className="inline-block px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                オンボーディングへ
              </a>
              <a
                href="/graph"
                className="inline-block px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
              >
                グラフページへ
              </a>
            </div>
            <div className="pt-4 border-t">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">危険な操作</h3>
              <button
                onClick={handleDeleteGraph}
                disabled={deleting || !user}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? '削除中...' : '🗑️ スキルツリーとプロファイルを削除'}
              </button>
              <p className="text-xs text-gray-500 mt-2">
                ※この操作は取り消せません。削除後はオンボーディングからやり直せます。
              </p>
            </div>
          </div>
        </div>
      </div>

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
    </div>
  );
}
