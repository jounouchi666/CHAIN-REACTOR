# GitHub Pagesへの公開準備

公開先：[CHAIN REACTOR](https://jounouchi666.github.io/CHAIN-REACTOR/)。公開・更新は手動workflowで行います。

## ローカルで公開物を作る

```powershell
npm ci
npm run build:pages
npm run preview:pages
```

`http://127.0.0.1:4192/chain-reactor/` で確認します。リポジトリ名の下に配置されるProject Pagesを模したURLです。公開アセット・Worker・CSS・取説・manifest・アイコンは相対パスなので、リポジトリ名をコードへ埋め込む必要はありません。

生成先は `_site/`。配布に必要なファイルだけを明示コピーします。`src/`、`tests/`、`evidence/`、`node_modules/`、開発用プローブ、ローカル記録は含めません。不明なファイルが既存 `_site/` にある場合は、巻き込んで公開せずbuildを失敗させます。

## 自分で公開するとき

1. この **chain-reactorディレクトリをリポジトリのルート** としてGitHubへ配置します。親のGodCodex全体をルートにする場合はworkflowのworking-directoryとartifact pathの調整が必要です。
2. GitHubリポジトリのSettings → PagesでSourceをGitHub Actionsにします。
3. Actionsの「Publish CHAIN REACTOR to GitHub Pages」を選び、公開してよいbranchで「Run workflow」を実行します。
4. 完了時のPages URLで確認します。workflowは手動実行のみで、pushだけでは公開しません。

GitHubアカウントのプラン、リポジトリの可視性、Actionsの利用枠や課金設定は本人が確認してください。本作は有料サービスを必要としませんが、ホスティングやCIの料金をゼロと保証するものではありません。

workflow内の外部Actionsは参照SHAを固定しています。2026-11-07に公式各リポジトリのv4/v5/v3タグから照合しました。公開時はCIログとPages URLを確認してください。

## アイコンとホーム画面

- SVG原稿：`assets/icon.svg`
- favicon：SVG、16/32px PNG、16/32/48pxを含むICO
- Apple Touch Icon：`apple-touch-icon.png`、180×180、不透明
- manifest：192/512px PNG、maskable用512px、相対scope/start_url
- Safari pinned tab：単色SVG

`npm run build` でSVGから各画像と取説HTMLを再生成します。maskable版は重要図形を内側へ縮め、OSによる切抜きに備えます。角丸は画像へ焼き込まずOSへ任せます。

Safariでは共有 → ホーム画面に追加から確認します。実機Safari/iOSでの確認は未実施。アイコンキャッシュが残る場合は追加し直しが必要です。manifestがあるだけで全ブラウザのインストールメニュー表示を保証するものではありません。Service Workerはなく、オフライン起動には対応しません。

## 公開前チェック

- `_site/` だけを公開する。リポジトリ全体を手動アップロードしない。
- サブディレクトリURLでapp.js、worker.js、CSS、取説、manifest、全アイコンが200で読める。
- SEをユーザー操作で開始でき、ミュート・音量・復帰後のOFF→ONが働く。
- 320px幅と一般的なノートPCの高さで下部操作が画面内に収まる。
- iPhone実機でレイアウト、音の開始、ホーム画面追加、アイコン、ファイル保存／読込を確認する。

参考：[GitHub公式Pagesの公開元設定](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)、[Apple公式Web Clipアイコン設定](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/ConfiguringWebApplications/ConfiguringWebApplications.html)。
