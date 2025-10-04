'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';

export default function DebugPage() {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string>('');

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
      } catch (err: any) {
        console.error('Debug error:', err);
        setError(err.message);
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
            <div className="space-x-4">
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
          </div>
        </div>
      </div>
    </div>
  );
}
