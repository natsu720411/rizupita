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
