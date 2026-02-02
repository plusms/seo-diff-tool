# SEO Diff Analyzer

競合サイトの変更差分（HTML Diff）をAIで分析し、SEO的な意図と自社への推奨施策を提案するツールです。

## 使い方

1.  **APIキーの取得**: [Google AI Studio](https://aistudio.google.com/app/apikey) からGeminiのAPIキーを取得してください（無料枠で利用可能です）。
2.  **ツールの起動**:
    * このフォルダ内の `index.html` をダブルクリックしてブラウザ（Chrome等）で開いてください。
    * ローカル環境でそのまま動作します（サーバー不要）。
3.  **分析の実行**:
    * **Gemini API Key**: 取得したキーを入力します（ブラウザに保存されます）。
    * **Target URL**: 自社の記事URLを入力します（任意）。
    * **Keywords**: 狙っているキーワードを3つまで入力します。
    * **Upload Diff HTML**: Pythonの `difflib` 等で出力されたHTML diffファイルをアップロードします。
    * 「Start Analysis」ボタンを押します。

## 注意事項
* 入力されたデータやAPIキーはGoogleのサーバー（Gemini API）に直接送信され、**外部の第三者サーバーには保存されません**。
* Diffファイルが巨大すぎる場合、APIの制限により分析できないことがあります。
