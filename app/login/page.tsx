'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { motion } from 'framer-motion';
import SkillTreeBackground from '../components/SkillTreeBackground';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isSignUp) {
        // サインアップ
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;

        if (data.user) {
          // メール確認が必要かチェック
          if (data.user.confirmed_at) {
            setMessage('✅ アカウントが作成されました！ログインしてください。');
            setIsSignUp(false);
          } else {
            setMessage('📧 確認メールを送信しました。メール内のリンクをクリックしてアカウントを有効化してください。');
          }
        }
      } else {
        // ログイン
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          // より詳細なエラーメッセージ
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('メールアドレスまたはパスワードが正しくありません');
          } else if (error.message.includes('Email not confirmed')) {
            throw new Error('メールアドレスが確認されていません。確認メールをご確認ください。');
          }
          throw error;
        }

        if (data.user) {
          setMessage('ログイン成功！リダイレクト中...');

          // 少し待ってからプロファイルチェック
          await new Promise(resolve => setTimeout(resolve, 1000));

          // プロファイルの存在チェック
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id);

          if (profileError) {
            throw new Error('プロファイルの取得に失敗しました: ' + profileError.message);
          }

          if (profiles && profiles.length > 0) {
            // プロファイルがある = オンボーディング済み
            await new Promise(resolve => setTimeout(resolve, 500));
            window.location.href = '/graph';
          } else {
            // プロファイルがない = オンボーディングへ
            await new Promise(resolve => setTimeout(resolve, 500));
            window.location.href = '/onboarding';
          }
        }
      }
    } catch (error: unknown) {
      console.error('認証エラー:', error);
      setMessage(error instanceof Error ? error.message : 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 p-4 relative overflow-hidden">
      <SkillTreeBackground />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative z-10"
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl font-bold mb-2 tracking-wider bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent" style={{ letterSpacing: '0.1em' }}>
            PATHFINDER
          </h1>
          <p className="text-gray-600">
            {isSignUp ? 'アカウント作成' : 'ログイン'}
          </p>
        </motion.div>

        <form onSubmit={handleAuth} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              メールアドレス
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              パスワード
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition"
              placeholder="••••••••"
            />
          </div>

          {message && (
            <div className={`p-4 rounded-lg ${
              message.includes('エラー') || message.includes('失敗')
                ? 'bg-red-50 text-red-700'
                : 'bg-green-50 text-green-700'
            }`}>
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '処理中...' : isSignUp ? 'アカウント作成' : 'ログイン'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setMessage('');
            }}
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            {isSignUp
              ? 'すでにアカウントをお持ちの方はこちら'
              : 'アカウントをお持ちでない方はこちら'}
          </button>
        </div>

        <div className="mt-6 text-center">
          <a
            href="/"
            className="text-gray-500 hover:text-gray-700 text-sm"
          >
            ← トップページに戻る
          </a>
        </div>
      </motion.div>
    </div>
  );
}
