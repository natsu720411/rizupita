# リズピタ (Rizupita)

無料・登録不要のリズム感診断サイトです。音に合わせて16拍タップすると、スコア、平均タイミング誤差、早め/遅めの傾向がわかります。

## 開発環境
- Node.js 20 以降
- Vite / Vanilla JavaScript
- Web Audio API
- Local Storage（自己ベスト保存）

## 起動
```
npm install
npm run dev
```

## ビルド
```
npm run build
```

生成物は `dist/` に出力されます。Vercel の Framework Preset は `Vite`、Build Command は `npm run build`、Output Directory は `dist` に設定してください。

## 採点仕様
難易度別に4拍カウントイン後16拍を計測し、各拍のタイミング誤差を元に各拍を0〜100点に採点します。未入力は0点です。端末の遅延により点数は変わるため、医療的・専門的な能力の測定ではなく、ゲームとして利用してください。

## 注意
スコアはブラウザ内にのみ保存され、端末間で同期されません。


## 追加機能
- メトロノーム練習（24拍）、裏拍チャレンジ、無音テンポキープ、リズム記憶
- 診断結果PNG生成・画像のダウンロード・対応端末ではWeb Share APIによる共有
- ±150msの手動タイミング補正（同じ端末・出力方法で調整）
- キミキーへのリンク、構造化データ、canonical、robots、sitemap

## Google Analytics 4（任意）
このプロジェクト専用のGA4データストリームを作成し、その測定ID（例：G-XXXXXXXXXX）をVercelのEnvironment Variablesに VITE_GA_MEASUREMENT_ID として登録して再デプロイしてください。測定IDがない場合、Google Analyticsタグは一切読み込まれません。既存の別サイトの測定IDを流用しないでください。利用規約・プライバシー表記と同意管理は必要に応じて適切に整備してください。

## 計測の注意
タイミング補正は手動の目安で、自動的なハードウェア遅延の検出や完全除去ではありません。Bluetooth機器、ブラウザのバックグラウンド化、バッテリー節約機能などで結果が変わります。
