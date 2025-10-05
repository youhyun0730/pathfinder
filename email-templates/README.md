# Email Templates

Supabase認証メールのテンプレート

## Confirm Signup

**件名:** Pathfinder - メールアドレスを確認してください

**ファイル:**
- `confirm-signup.html` - HTML版
- `confirm-signup.txt` - プレーンテキスト版

## 使用方法

1. Supabaseダッシュボードにアクセス
2. Authentication → Email Templates に移動
3. Confirm signup を選択
4. 件名と本文をコピー&ペーストして保存

## 利用可能な変数

- `{{ .ConfirmationURL }}` - 確認用URL
- `{{ .Token }}` - 確認トークン
- `{{ .Email }}` - ユーザーのメールアドレス
- `{{ .SiteURL }}` - サイトURL
