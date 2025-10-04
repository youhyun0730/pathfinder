 # スキルツリーRPG 実装計画

     ## アーキテクチャ概要

     ### フロントエンド (Vercel)
     - **Next.js 14** (App Router)
     - **React Flow** - グラフ可視化
     - **TailwindCSS** + **Framer Motion** - スタイリング・アニメーション
     - **Zustand** - 状態管理
     - **React Query** - サーバーステート管理

     ### バックエンド (Vercel + Supabase)
     - **Vercel Edge Functions** - LLM API呼び出し
     - **Supabase**
       - Auth - 認証（メール/パスワードレス）
       - PostgreSQL - データベース
       - Row Level Security - セキュリティ
       - Realtime - リアルタイム同期（将来）

     ### AI/LLM
     - **Gemini 2.5 flash** - ツリー生成・分類

     ---

     ## データベース設計 (Supabase)

     ### テーブル構成

     ```sql
     -- users (Supabaseのauth.usersを利用)

     -- profiles
     - id (uuid, FK to auth.users)
     - answers (jsonb) -- オンボーディング回答
     - created_at
     - updated_at

     -- graphs
     - id (uuid, PK)
     - user_id (uuid, FK)
     - version (int) -- バージョン管理
     - created_at
     - updated_at

     -- nodes
     - id (uuid, PK)
     - graph_id (uuid, FK)
     - node_type (enum: center, current, skill, cert, position, goal)
     - label (text)
     - description (text)
     - required_exp (int)
     - current_exp (int, default 0)
     - parent_ids (uuid[])
     - position_x (float)
     - position_y (float)
     - color (text)
     - metadata (jsonb) -- resources, etc.
     - created_at

     -- edges
     - id (uuid, PK)
     - graph_id (uuid, FK)
     - from_node_id (uuid)
     - to_node_id (uuid)

     -- goals
     - id (uuid, PK)
     - user_id (uuid, FK)
     - description (text)
     - target_node_id (uuid)
     - recommended_path (uuid[])
     - created_at
     ```

     ### RLS (Row Level Security) ポリシー
     - 各テーブルに `user_id` ベースのアクセス制御
     - ユーザーは自分のデータのみ操作可能

     ---

     ## ディレクトリ構造

     ```
     /
     ├── src/
     │   ├── app/                      # Next.js App Router
     │   │   ├── (auth)/
     │   │   │   ├── login/
     │   │   │   └── onboarding/       # Phase 1: オンボーディング
     │   │   ├── (main)/
     │   │   │   ├── graph/            # Phase 2: メイングラフUI
     │   │   │   └── goals/            # Phase 4: 目標設定
     │   │   ├── api/
     │   │   │   ├── llm/              # Edge Functions
     │   │   │   │   ├── classify/    # 現在地分類
     │   │   │   │   ├── generate/    # ツリー生成
     │   │   │   │   └── expand/      # ツリー拡張
     │   │   │   └── nodes/            # CRUD API
     │   │   └── layout.tsx
     │   ├── components/
     │   │   ├── graph/
     │   │   │   ├── GraphCanvas.tsx   # React Flow wrapper
     │   │   │   ├── NodeComponent.tsx # カスタムノード
     │   │   │   ├── NodeMenu.tsx      # 長押しメニュー
     │   │   │   └── EdgeComponent.tsx
     │   │   ├── onboarding/
     │   │   │   └── QuestionFlow.tsx
     │   │   └── ui/                   # 共通UIコンポーネント
     │   ├── lib/
     │   │   ├── supabase/
     │   │   │   ├── client.ts         # Supabaseクライアント
     │   │   │   ├── queries.ts        # データ取得関数
     │   │   │   └── mutations.ts      # データ更新関数
     │   │   ├── llm/
     │   │   │   ├── prompts.ts        # プロンプトテンプレート
     │   │   │   └── client.ts         # LLM API wrapper
     │   │   └── utils/
     │   │       ├── graph.ts          # グラフ計算ロジック
     │   │       └── exp.ts            # EXP計算ロジック
     │   ├── stores/
     │   │   └── graphStore.ts         # Zustand store
     │   └── types/
     │       └── index.ts               # TypeScript型定義
     ├── supabase/
     │   ├── migrations/                # DBマイグレーション
     │   └── seed.sql                   # 初期データ
     ├── public/
     ├── package.json
     ├── tsconfig.json
     ├── tailwind.config.ts
     └── next.config.js
     ```

     ---

     ## フェーズ別実装計画

     ### **Phase 1: 基礎セットアップ + 認証** (1-2週間)

     1. **プロジェクト初期化**
        - `create-next-app` でNext.js 14セットアップ
        - TailwindCSS, TypeScript設定
        - Supabaseプロジェクト作成

     2. **Supabase統合**
        - Supabase Auth設定（メール認証）
        - データベーススキーマ作成・マイグレーション
        - RLSポリシー設定

     3. **認証フロー**
        - ログイン/サインアップページ
        - 保護されたルート設定
        - セッション管理

     ### **Phase 2: グラフ基盤 + オンボーディング** (2-3週間)

     4. **React Flow統合**
        - GraphCanvas基本実装
        - カスタムNodeComponent作成
        - ズーム・パン機能

     5. **オンボーディング**
        - 質問フロー画面
        - 回答データのDB保存
        - LLM API統合（現在地分類）

     6. **初期ツリー生成**
        - LLMプロンプト設計
        - ノード・エッジ生成ロジック
        - DBへの保存

     ### **Phase 3: コアインタラクション** (2-3週間)

     7. **タップ機能**
        - ノードタップでEXP増加
        - 進捗バーアニメーション
        - 親ノード依存チェック

     8. **長押しメニュー**
        - コンテキストメニューUI
        - 詳細表示モーダル
        - 削除機能（子孫ノード処理）

     9. **ツリー拡張**
        - 「ツリーを伸ばす」機能
        - LLM API呼び出し
        - 新規ノード追加UI

     ### **Phase 4: 高度な機能** (2週間)

     10. **目標設定**
         - 目標入力フォーム
         - 逆算ツリー生成
         - 推奨パスのハイライト

     11. **UI/UX最適化**
         - カラースキーム実装
         - アニメーション（Framer Motion）
         - レスポンシブ対応

     ### **Phase 5: 最適化・デプロイ** (1週間)

     12. **パフォーマンス**
         - React Flowの仮想化
         - 画像最適化
         - コード分割

     13. **テスト・デプロイ**
         - Vercelデプロイ設定
         - 環境変数設定
         - エラーハンドリング

     ---

     ## LLM統合詳細

     ### API Routes構成

     #### `/api/llm/classify` (現在地分類)
     - Input: ユーザーの回答データ
     - Output: 現在地ノードの配列
     - Model: GPT-4-turbo or Claude 3.5 Sonnet

     #### `/api/llm/generate` (初期ツリー生成)
     - Input: 現在地ノード
     - Output: スキルツリー（ノード・エッジ配列）
     - キャッシュ戦略: 類似プロファイルで再利用

     #### `/api/llm/expand` (ツリー拡張)
     - Input: 選択ノード + 現在のコンテキスト
     - Output: 提案ノード配列（3-5個）

     ### プロンプト設計例

     ```typescript
     // classify用
     const CLASSIFY_PROMPT = `
     あなたは人生コーチです。ユーザーの回答から現在地を分類してください。

     回答データ:
     {answers}

     以下のJSON形式で2-4個の現在地を出力:
     [{
       category: string,
       currentPosition: string,
       reasoning: string
     }]
     `;
     ```

     ---

     ## コスト最適化

     ### LLM
     - 初回生成: GPT-4 (高品質)
     - 拡張: GPT-3.5-turbo or Claude Haiku (低コスト)
     - キャッシング: Redis (Upstash) or Vercel KV

     ### Supabase
     - 無料枠: 500MB DB, 2GB転送/月
     - 有料移行: Pro ($25/月) で十分

     ### Vercel
     - Hobby: 無料
     - Pro ($20/月): 商用化時

     ---

     ## セキュリティ

     1. **API Key保護**
        - 環境変数に保存
        - Edge Functionsでのみ使用

     2. **RLS**
        - 全テーブルでuser_id検証

     3. **レート制限**
        - Vercel Edge Middleware
        - ユーザーあたりLLM呼び出し制限

     ---

     ## 最初に実装するファイル（優先順位順）

     1. `package.json` - 依存関係
     2. `src/types/index.ts` - 型定義
     3. Supabase migrations - DB構造
     4. `src/lib/supabase/client.ts` - DB接続
     5. `src/app/(auth)/login/page.tsx` - 認証UI
     6. `src/components/graph/GraphCanvas.tsx` - グラフ基盤
     7. `src/app/api/llm/classify/route.ts` - LLM統合
     8. `src/app/(main)/graph/page.tsx` - メイン画面

     ---

     この計画で、8-10週間で完全に動作するMVPが完成します。