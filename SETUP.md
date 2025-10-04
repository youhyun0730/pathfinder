# Pathfinder - セットアップガイド

## 基礎セットアップ完了 ✅

以下のセットアップが完了しています：

### 1. プロジェクト構造
- ✅ Next.js 14 (App Router)
- ✅ TypeScript設定
- ✅ TailwindCSS設定
- ✅ 必要な依存関係のインストール

### 2. データベース設計
- ✅ Supabaseクライアント設定
- ✅ マイグレーションSQL作成 (`supabase/migrations/`)
- ✅ Row Level Security (RLS) ポリシー定義
- ✅ TypeScript型定義

### 3. 基本ファイル
- ✅ グローバルレイアウト
- ✅ ランディングページ
- ✅ 環境変数テンプレート

### 4. LLM統合 (Gemini 2.0 Flash)
- ✅ Geminiクライアント設定
- ✅ プロンプトテンプレート
- ✅ API Routes作成
  - `/api/llm/classify` - 現在地分類
  - `/api/llm/generate` - ツリー生成
  - `/api/llm/expand` - ツリー拡張

---

## 次のステップ

### 1. Google Gemini API Keyの取得

1. [Google AI Studio](https://aistudio.google.com/app/apikey)にアクセス
2. 「Get API Key」をクリックして新しいAPIキーを作成
3. APIキーをコピー

### 2. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com)にアクセスしてプロジェクトを作成
2. Project Settings → API から以下を取得：
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **重要: 開発環境でメール確認を無効化**
   - Authentication → Settings → Email Auth
   - 「Confirm email」を**オフ**にする
   - 「Save」をクリック

   ⚠️ これにより、メール確認なしでユーザー登録とログインが可能になります（開発環境のみ推奨）

### 3. 環境変数の設定

`.env.local` ファイルを作成し、以下を設定：

```bash
cp .env.local.example .env.local
```

`.env.local` に値を入力：
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
GEMINI_API_KEY=AIza...
```

### 4. マイグレーション実行

Supabaseプロジェクトにマイグレーションを適用：

```bash
# Supabase CLIをインストール（まだの場合）
npm install -g supabase

# Supabaseにログイン
supabase login

# プロジェクトとリンク
supabase link --project-ref <your-project-id>

# マイグレーション実行
supabase db push
```

または、Supabase Dashboard の SQL Editor で `supabase/migrations/20250104000000_initial_schema.sql` の内容を実行

### 5. 開発サーバー起動

```bash
npm run dev
```

http://localhost:3000 にアクセス

---

## 実装済みの機能

### データベース
- `profiles` - ユーザープロファイル
- `graphs` - スキルグラフ
- `nodes` - ノード（スキル、資格、ポジションなど）
- `edges` - ノード間の接続
- `goals` - 目標設定

### API関数
- `lib/supabase/client.ts` - クライアントサイド用
- `lib/supabase/server.ts` - サーバーサイド用
- `lib/supabase/queries.ts` - データ取得
- `lib/supabase/mutations.ts` - データ更新

### LLM統合
- `lib/llm/client.ts` - Geminiクライアント
- `lib/llm/prompts.ts` - プロンプトテンプレート
- `app/api/llm/classify/route.ts` - 現在地分類API
- `app/api/llm/generate/route.ts` - ツリー生成API
- `app/api/llm/expand/route.ts` - ツリー拡張API

### 型定義
- `types/index.ts` - 全てのTypeScript型定義

---

## 次の実装予定

### Phase 1（続き）
- [ ] ログイン/サインアップページ
- [ ] 認証フロー
- [ ] オンボーディング画面

### Phase 2
- [ ] React Flow統合
- [ ] グラフ可視化
- [x] LLM統合（Gemini 2.0 Flash）

詳細は `PLAN.md` を参照してください。

---

## 開発コマンド

```bash
# 開発サーバー
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm run start

# Lint
npm run lint
```

---

## トラブルシューティング

### ❗ ログインできない問題

**症状**: アカウント登録は成功するがログインできない

**原因**: Supabaseのメール確認が有効になっている

**解決方法**:
1. **開発環境**: Supabase Dashboard → Authentication → Settings → Email Auth → 「Confirm email」を**オフ**
2. **既存ユーザー**: Supabase Dashboard → Authentication → Users → ユーザーの「⋮」メニュー → 「Confirm User」

詳細は `TROUBLESHOOTING.md` を参照してください。

### Supabase接続エラー
- `.env.local` ファイルが正しく設定されているか確認
- SupabaseプロジェクトのURLとキーが正しいか確認

### TypeScriptエラー
- `npm install` を再実行
- VSCodeの場合は TypeScript サーバーを再起動

### ビルドエラー
- `node_modules` を削除して再インストール
  ```bash
  rm -rf node_modules
  npm install
  ```
