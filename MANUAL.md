# MIERIS (旧: ブラックリスト登録・管理アプリ) 納品マニュアル

このドキュメントは、アプリケーションの環境構築、データベース設定、および運用手順についてまとめたものです。

## 1. アプリケーション概要

本アプリ「MIERIS」は、建設業界における要注意人物や事象（ケース）をミエリスのように登録・共有・管理するためのWebアプリケーションです。
Next.js (App Router) と Supabase を使用して構築されています。

![ダッシュボード画面](/manual_images/dashboard.png)
*ダッシュボード画面イメージ（承認済みユーザー向けトップページ）*

### 主な機能

- **ユーザー認証**: メールアドレスによるサインアップ・ログイン
- **承認フロー**: 新規登録ユーザーは管理者による承認後に利用可能
- **閲覧制限**: 一般ユーザーは承認済みケースのみ閲覧可能（承認待ちは非表示）
- **ケース管理**:
  - ケースの登録・編集・削除
  - 証拠資料（画像・ファイル）の添付
  - 会社情報の紐付け
- **管理者機能**:
  - ユーザー管理（一覧表示、承認）
  - 会社管理（登録・編集・削除）
  - 全ケースの管理

---

## 2. 環境構築 (ローカル開発環境)

### 前提条件

- Node.js (v18以上推奨)
- npm

### インストール手順

1. リポジトリをクローンまたはダウンロードします。
2. 依存パッケージをインストールします。

   ```bash
   npm install
   ```

3. 環境変数ファイル `.env.local` をルートディレクトリに作成します（後述）。

### 起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` にアクセスします。

![ログイン画面](/manual_images/login.png)
*ログイン画面イメージ*

---

## 3. データベース・バックエンド設定 (Supabase)

本アプリはバックエンドに Supabase を使用しています。以下の設定が必要です。

### 3.1 環境変数 (.env.local)

`.env.local` ファイルを作成し、SupabaseのプロジェクトURLとAnon Keyを設定してください。

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3.2 データベース (Table) 設計

以下のテーブルを作成してください。

#### `companies` (会社マスタ)

| カラム名 | データ型 | 説明 |
| --- | --- | --- |
| `id` | UUID | Primary Key (Default: `gen_random_uuid()`) |
| `name` | Text | 会社名 |
| `created_at` | Timestamptz | 作成日時 (Default: `now()`) |

![会社管理画面](/manual_images/company_list.png)
*会社管理画面イメージ*

#### `app_users` (ユーザー情報)

※ `auth.users` とトリガーで同期することを推奨しますが、アプリ上では以下の構造を想定しています。

| カラム名 | データ型 | 説明 |
| --- | --- | --- |
| `id` | UUID | Primary Key (`auth.users.id` と紐付け) |
| `email` | Text | メールアドレス |
| `display_name` | Text | 表示名 |
| `role` | Text | 役割 (`admin` or `user`) |
| `company_id` | UUID | `companies.id` への外部キー (Optional) |
| `is_approved` | Boolean | 承認済みフラグ (Default: `false`) |
| `created_at` | Timestamptz | 作成日時 |

![ユーザー承認画面](/manual_images/user_approval.png)
*ユーザー承認画面（管理者のみ）*

#### `cases` (ケース情報)

| カラム名 | データ型 | 説明 |
| --- | --- | --- |
| `id` | UUID | Primary Key |
| `title` | Text | タイトル |
| `content` | Text | 詳細内容 |
| `status` | Text | `pending`, `approved`, `rejected` 等 |
| `created_by` | UUID | 作成者ID (`app_users.id`) |
| `company_id` | UUID | 関連会社ID (`companies.id`) |
| `evidence_urls` | Text[] | 配列型。証拠ファイルのパスまたはURL |
| `risk_score` | Integer | 戦闘力（リスクスコア）。トラブル内容から自動算出 |
| `created_at` | Timestamptz | 作成日時 |

![ケース一覧画面](/manual_images/case_list.png)
*ケース一覧画面*

### 3.3 Storage 設定

証拠ファイル保存用に Storage バケットを作成してください。

- **バケット名**: `case-evidence`
- **公開設定**: Public Access を有効にするか、適切にPolicyを設定して署名付きURLを使用してください（現状の実装ではPublic URL参照を想定）。

### 3.4 認証設定 (Authentication)

- **Email Auth**: メールアドレス・パスワード認証を有効にしてください。
- **Email Template**:
  - Confirm Email のテンプレートは日本語化済みです。必要に応じてSupabaseダッシュボードから内容を調整してください。

![サインアップ画面](/manual_images/signup.png)
*サインアップ画面イメージ*

---

## 4. 管理者権限の設定

最初の管理者は、データベースを直接操作して設定する必要があります。

1. アプリのサインアップ画面からユーザー登録を行います。
2. Supabase の Table Editor で `app_users` テーブルを開きます。
3. 該当ユーザーのレコードを探し、以下のカラムを編集します。
    - `role`: `user` -> `admin` に変更
    - `is_approved`: `false` -> `true` に変更
4. これで管理者としてログイン・操作が可能になります。2人目以降の管理者は、既存の管理者が管理画面から承認できます（ロール変更機能はDB操作が必要です）。

---

## 5. 新機能ガイド (Ver.2.2)

### 5.1 ミエリス機能 (戦闘力表示)

トラブル内容に含まれるキーワード（例：「横領」「暴行」など）や文章量に基づいて、AIがリスクスコア（戦闘力）を自動算出します。

- **表示**: 詳細画面や検索結果に「CP: 530,000」のように表示されます。
- **色分け**: スコアに応じて色が変化します（安全: 緑 → 危険: 赤/紫）。

![ミエリス詳細画面](/manual_images/case_detail.png)
*ミエリス機能による詳細画面（戦闘力表示）*

### 5.2 OCR機能 (画像文字認識)

証拠画像からテキストを抽出して、登録情報に追記できます。

1. 新規登録画面 (`/cases/new`) で画像を添付します。
2. 添付した画像の横に表示される「文字認識(OCR)」ボタンをクリックします。
3. 画像内の文字が読み取られ、「登録理由/詳細」欄に自動で追記されます。
   （これにより、画像内の文字も検索対象となります）

![OCR機能](/manual_images/ocr_upload.png)
*OCRボタンと画像アップロードUI*

---

## 6. デプロイ

Vercel や Netlify などのホスティングサービスへのデプロイを推奨します。

1. **Build settings**:
    - Framework Preset: Next.js
    - Build Command: `npm run build`
    - Output Directory: `.next` (Vercelの場合は自動設定)
2. **Environment Variables**:
    - 環境変数 (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) をホスティングサービスの管理画面で設定してください。

---

## 7. よくあるトラブルと対処

- **ログインしても画面が「承認待ち」のまま変わらない**:
  - キャッシュが残っている可能性があります。ログアウトして再ログインするか、スーパーリロードを試してください。
  - 管理者が `is_approved` を `true` に設定しているかデータベースを確認してください。
- **画像のアップロードに失敗する**:
  - Supabase Storage の `case-evidence` バケットが存在するか確認してください。
  - Storage の RLS Policy（書き込み権限）が正しく設定されているか確認してください。

以上
