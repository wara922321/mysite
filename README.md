# みんなの掲示板

Cloudflare Workers + D1 で動くシンプルな掲示板です。掲示板は1つだけで、誰でも自由に書き込みができ、書き込みは全員に表示されます。

## 構成

- `src/worker.js` — Worker本体（HTML配信 + `/api/posts` のGET/POST API）
- `wrangler.toml` — Worker設定（D1バインディングを含む）
- `schema.sql` — D1のテーブル定義

## ローカルで試す

```bash
npm install
npm run dev
```

## デプロイ（初回のみ手動で必要な設定）

このリポジトリには GitHub Actions (`.github/workflows/deploy.yml`) が用意されており、`main` ブランチにpushすると自動でCloudflare Workersにデプロイされます。

有効にするには、GitHubリポジトリの Settings → Secrets and variables → Actions の **Secrets** タブで以下を登録してください（Variablesタブではありません）。

- `CLOUDFLARE_API_TOKEN` — Cloudflareダッシュボードで発行するAPIトークン（Workers編集権限が必要）

登録後、`main` へのpush（またはActionsタブから手動実行）でデプロイされます。

手元から直接デプロイしたい場合は、Cloudflareにログインした状態で:

```bash
npm install
npx wrangler deploy
```

## データベース

D1データベース `bulletin-board-db` は作成済みで、`wrangler.toml` に `database_id` を設定済みです。テーブルも作成済みのため、追加の初期化作業は不要です。
