# SA-assist 統合アプリケーション

このプロジェクトは、SA（Student Assistant）の業務をサポートするための「時間割クロック（Timekeeper）」および「業務日誌タイトル・内容生成ツール」を1つのアプリケーションに統合したものです。

最新のモダンフロントエンド環境である **Vite + React + Tailwind CSS** で構築されており、スクロール不要の1画面（SPA）で全ての操作が完結します。Vercelなどのホスティングサービスで簡単に公開・運用できるよう最適化されています。

---

## 🌟 主な機能

### 1. 🕒 Timekeeper（時間割クロック）
現在の時刻と時間割を照らし合わせ、自動的に「授業中」「休み時間」「開室前/終了後」のステータスを判定します。
- ステータスに応じたリッチな背景カラーの自動切り替え
- 授業の経過時間、または次の授業までの残り時間を大きな文字で表示
- 指定した「退勤アラーム時間」の1分前に音声で時報（ピッ・ピッ・ピー）を鳴らし、画面右上にトースト通知を表示

### 2. 📝 業務日誌生成（Work Log）
SA業務の終了時に作成する日誌の「タイトル」や「本文」を簡単に生成し、クリップボードにコピーできます。
- タブ（ステップ）形式の直感的なUI
- 本文作成時に、あらかじめ登録しておいた見出しタグ（例: `【引継ぎ事項】`）をワンクリックで挿入可能
- 複数の定型業務をチェックボックスで選択するだけで、フォーマットに沿ったテキストを自動生成

### 3. ⚙️ 共通設定（Settings）
アプリケーションの設定情報は **Firebase Firestore** を用いてクラウドに保存・同期されます。これにより、環境復元がかかるPCを使用している場合でも、すべてのPC間で最新の設定を共有できます。
設定画面から以下の項目を自由に追加・編集・削除できます。
- Timekeeperの「時間割（何限が何時から何時までか）」
- Timekeeperの「退勤アラーム時間」
- 業務日誌ツールの「定型業務リスト」および「クイックインサート用タグ」

---

## 🚀 開発環境のセットアップ

### 必須要件
- Node.js (v18以降推奨)
- npm

### 1. パッケージのインストール
プロジェクトのルートディレクトリ（`sa-app`）で以下のコマンドを実行し、必要なパッケージをインストールします。

```bash
npm install
```

### 2. 環境変数の設定
Firebaseを利用して設定データを保存するため、ルートディレクトリに `.env.local` というファイルを作成し、以下の内容を記述してください。（値はご自身のFirebaseプロジェクトの設定に合わせて変更してください）

```env
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-auth-domain"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-storage-bucket"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
```
*(※値が空の場合でも、一時的なデフォルト設定を使用してエラーを出さずにUIの表示テストができるよう設計されています)*

### 3. 開発サーバーの起動
以下のコマンドで開発サーバーを起動し、ブラウザで動作を確認します。

```bash
npm run dev
```

---

## 🔒 Firebase Firestore のセキュリティルール設定

設定画面から保存ボタンを押した際に **「FirebaseError: Missing or insufficient permissions.」** というエラーが出た場合、Firestoreのセキュリティルール（アクセス権限）で弾かれていることが原因です。

このアプリは「SA全員で1つの設定を共有する（ログイン機能なし）」という運用を想定しているため、Firestoreのルールを「誰でも読み書き可能」に変更する必要があります。

Firebaseコンソールの **「Firestore Database」 > 「ルール (Rules)」** タブを開き、以下の内容に書き換えて「公開 (Publish)」してください。

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 全体へのアクセスは禁止しつつ、「settings/shared」ドキュメントのみ読み書きを許可する
    match /settings/shared {
      allow read, write: if true;
    }
  }
}
```

> **注意**: `allow read, write: if true;` は誰でもアクセス可能になる設定です。今回は保存されるデータが「シフト時間」や「業務の種類」など機密性の低い公開情報のみであるため許容されますが、ユーザーの個人情報などを保存する場合はFirebase Authenticationの導入が必要です。

---

## 📦 ビルドとデプロイ

本番環境（VercelやFirebase Hostingなど）へデプロイする場合は、以下のコマンドで最適化された本番用ビルドを作成します。

```bash
npm run build
```

### Vercel へのデプロイ時の注意点（Root Directory の設定）
GitHubリポジトリ（`SA-assist`）の直下ではなく、一段階下の `sa-app` フォルダ内にプロジェクトが存在するため、Vercelでデプロイする際は以下の設定を行なってください。

**【新規にVercelプロジェクトを作成する場合】**
1. Vercelで `SA-assist` リポジトリをインポートします。
2. 「Configure Project」の画面で、**Root Directory** の項目にある「Edit」をクリックし、`sa-app` を選択（または入力）します。
3. Framework Preset が自動的に `Vite` になっていることを確認します。
4. Environment Variables に、先ほど設定した `VITE_FIREBASE_...` の環境変数をすべて追加します。
5. 「Deploy」をクリックします。

**【すでにVercelプロジェクトを作成してしまっている場合】**
1. Vercelのダッシュボードから該当プロジェクトを開きます。
2. 上部の **「Settings」** タブを開き、左メニューの **「General」** を選択します。
3. 少し下にスクロールし、**「Root Directory」** の項目の「Edit」をクリックして `sa-app` と入力し、Saveします。
4. 上部の **「Deployments」** タブから最新のデプロイの右端の点ボタンを押し、「Redeploy」を実行してください。
