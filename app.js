// DOM Elements
const apikeyInput = document.getElementById('apikey');
const targetUrlInput = document.getElementById('targetUrl');
const keywordInputs = document.querySelectorAll('.keyword-input');
const diffFileInput = document.getElementById('diffFile');
const fileNameDisplay = document.getElementById('fileName');
const analyzeBtn = document.getElementById('analyzeBtn');
const resultsSection = document.getElementById('resultsSection');
const markdownOutput = document.getElementById('markdownOutput');
const btnText = analyzeBtn.querySelector('.btn-text');
const loader = analyzeBtn.querySelector('.loader');

// Load API Key from LocalStorage
document.addEventListener('DOMContentLoaded', () => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) {
        apikeyInput.value = savedKey;
    }
});

// File Input Handler
let fileContent = '';
diffFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        fileNameDisplay.textContent = file.name;
        const reader = new FileReader();
        reader.onload = (e) => {
            fileContent = e.target.result;
        };
        reader.readAsText(file);
    }
});

// Analyze Button Handler
analyzeBtn.addEventListener('click', async () => {
    const apiKey = apikeyInput.value.trim();
    const targetUrl = targetUrlInput.value.trim();
    const keywords = Array.from(keywordInputs).map(input => input.value.trim()).filter(k => k);

    if (!apiKey) {
        alert('Gemini APIキーを入力してください');
        return;
    }
    if (!fileContent) {
        alert('Diff HTMLファイルをアップロードしてください');
        return;
    }

    // Save API Key
    localStorage.setItem('gemini_api_key', apiKey);

    // Set Loading State
    setLoading(true);
    resultsSection.classList.add('hidden');

    try {
        const result = await callGeminiAPI(apiKey, targetUrl, keywords, fileContent);
        renderResults(result);
    } catch (error) {
        console.error(error);
        alert('分析中にエラーが発生しました: ' + error.message);
    } finally {
        setLoading(false);
    }
});

function setLoading(isLoading) {
    if (isLoading) {
        analyzeBtn.disabled = true;
        btnText.classList.add('hidden');
        loader.classList.remove('hidden');
    } else {
        analyzeBtn.disabled = false;
        btnText.classList.remove('hidden');
        loader.classList.add('hidden');
    }
}

async function callGeminiAPI(apiKey, targetUrl, keywords, diffHtml) {
    // Parse Diff HTML locally to extract only changes
    const extractionResult = parseDiffHtml(diffHtml);
    const changes = extractionResult.changes;

    if (changes.length === 0) {
        // Create a preview of the file content for debugging
        const preview = diffHtml.substring(0, 200).replace(/\n/g, '\\n');

        throw new Error(`変更箇所が見つかりませんでした。
解析詳細: ${extractionResult.meta.detectedType || '不明な形式'} (列数: ${extractionResult.meta.columnCount || 0})
ファイルプレビュー（先頭200文字）: ${preview}...
Diffファイルの形式を確認してください（difflib形式推奨、またはユニファイド形式のテキスト）。`);
    }

    // Format changes for Prompt
    const changesText = changes.map((c, i) => {
        return `[変更点 ${i + 1}]
Before: ${c.before}
After : ${c.after}
`;
    }).join('\n');

    // Limit prompt size just in case, though it should be much smaller now
    const truncatedChanges = changesText.length > 50000 ? changesText.substring(0, 50000) + '... (truncated)' : changesText;

    const prompt = `
あなたは熟練のSEOコンサルタント兼テクニカルSEOアナリストです。
以下は、WebサイトのHTMLコードの変更差分（Before/After）のリストです。
この変更情報、および以下の「自社情報」に基づき、SEO改善施策を提案してください。

# 1. 自社情報
* **対象記事URL**: ${targetUrl || '(未指定)'}
* **狙っているキーワード**:
${keywords.map((k, i) => `    ${i + 1}. ${k}`).join('\n')}

# 2. 分析・処理プロセス（Step by Step）

1.  **変更内容の解釈**:
    * 提供された変更点リスト（Before/After）を比較し、「何が変わったのか」を特定してください。
    * 具体例：hタグの階層変更、共起語の追加、発リンクの削除、日付の更新、画像altの変更など。
    * **除外ルール**: SEOスコアや検索順位に寄与しない些末な変更（例：意味のないdiv階層の変更、動的なパラメータIDの変更、デザイン調整のみのクラス名変更、単なる空白の調整）は分析対象から除外してください。

2.  **SEOインパクトの分析とKW適合性**:
    * その変更が「狙っているキーワード」の上位表示に対して、どのようなSEO効果（検索意図の網羅、フレッシュネス、E-E-A-T強化など）を狙ったものか推測してください。

3.  **自社記事への適用検証**:
    * 抽出された「競合の変更施策」が、自社記事にも適用可能か、または適用すべきかを判断してください。

4.  **優先度付け**:
    * 想定される順位上昇インパクトと実装工数を天秤にかけ、優先度（S/A/B）を判定してください。

# 3. 出力形式

以下の構成で出力してください。余計な前置きやまとめの文章は不要です。

## ①分析結果のサマリー
全体の変更傾向と、そこから読み取れる競合のSEO戦略意図を文章で簡潔にまとめてください。

## ②競合の変更分析
以下の3カラム構成のテーブル形式で出力してください。

| 優先度 | 競合の変更事実 (Before → After) | 競合の変更分析 (SEO的な狙い) |
| :---: | :--- | :--- |
| **S** | 見出しh2<br>Before：「料金」<br>After：「料金相場と安く抑えるコツ」 | 単語「相場」を追加し、検索ボリュームの多い複合KWをカバー。さらに「コツ」でクリック率向上を狙っている。 |
| **A** | 本文末尾<br>Before：なし<br>After：監修者プロフィール枠を追加 | 権威性（E-E-A-T）の担保。YMYL領域における信頼性評価の向上を目的としている。 |

## ③自社への推奨施策
以下の3カラム構成のテーブル形式で出力してください。**②のテーブルと行の並び順（対応関係）を必ず一致させてください。**

| 優先度 | 自社への推奨施策 (Action) | 根拠とする競合施策 |
| :---: | :--- | :--- |
| **S** | **見出しリライト**: <br>自社のh2「費用について」を「[KW]の費用相場と内訳」に変更する。 | 競合が見出しにサジェストKWを含めて網羅性を高めた変更点 |
| **A** | **監修者情報の明記**: <br>記事下に社内の専門資格保有者のプロフィールカードを実装する。 | 競合が著者情報ではなく監修者情報を構造化データと共に追記した点 |

**注意点**:
* 必ず「狙っているキーワード」に関連する施策を中心に抽出すること。
* 単なる事実の羅列ではなく、「なぜその変更をしたのか」というコンサルタント視点の分析を含めること。
* **「根拠とする競合施策」カラム**には、推奨施策が競合のどの変更に基づいているかを明記し、ロジックを明確にすること。
* 抽象的な提案ではなく、「〇〇という単語を入れる」「〇〇の画像を配置する」など具体的な指示にすること。
* 出力時は指示通りの項目ごとにセルを作成し、勝手に分割は行わないこと。

**変更差分データ**:
${truncatedChanges}
`;

    // Use gemini-flash-latest for better stability/quota management
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            contents: [{
                parts: [{ text: prompt }]
            }]
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'API Error');
    }

    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

/**
 * Parse difflib standard HTML output to extract changed rows
 * Attempts to handle 6-col, 4-col, and 3-col layouts automatically.
 */
function parseDiffHtml(htmlString) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    // Handle "View Source" saved files (where the HTML is escaped inside the body)
    // Browsers often add id="viewsource" to the body of view-source: pages
    if (doc.body && (doc.body.id === 'viewsource' || doc.querySelector('.line-number'))) {
        console.log('Detected View Source file, unwrapping content...');
        const rawHtml = doc.body.textContent;
        if (rawHtml && rawHtml.trim().startsWith('<')) {
            return parseDiffHtml(rawHtml);
        }
    }

    // Get all rows
    const rows = Array.from(doc.querySelectorAll('tr'));

    // Result object
    const result = {
        changes: [],
        meta: {
            totalRows: rows.length,
            detectedType: null,
            columnCount: 0
        }
    };

    if (rows.length === 0) {
        console.log('No HTML rows found, attempting plain text parse...');
        const textChanges = parsePlainTextDiff(htmlString);
        if (textChanges.length > 0) {
            result.changes = textChanges;
            result.meta.detectedType = 'plain_text_unified';
            result.meta.columnCount = 1; // logical column
            return result;
        }
        return result;
    }

    // Detect column structure from the first valid data row (skipping potential headers)
    // Find a row with maximum cells to guess the structure
    let maxCells = 0;
    rows.forEach(r => maxCells = Math.max(maxCells, r.querySelectorAll('td').length));
    result.meta.columnCount = maxCells;

    // Heuristics for indices
    let leftContentIdx = -1;
    let rightContentIdx = -1;
    let type = 'unknown';

    if (maxCells >= 6) {
        // Standard difflib: [Link, LineNo, Content, Link, LineNo, Content]
        type = 'standard_6col';
        leftContentIdx = 2;
        rightContentIdx = 5;
    } else if (maxCells === 4) {
        // Compact: [LineNo, Content, LineNo, Content]
        type = 'compact_4col';
        leftContentIdx = 1;
        rightContentIdx = 3;
    } else if (maxCells === 3) {
        // Unified-like: [LineNo, LineNo, Content] or similar
        // Usually signaled by class="diff_header" or similar, but structure allows simpler parsing
        // In unified mode, often rows are just added/removed lines sequentially.
        // This is harder to parse as side-by-side, skipping for now unless explicit match.
        type = 'unified_3col';
        // NOTE: Unified diffs often don't have side-by-side cells in the same row.
        // They typically have 1 content cell with class diff_add/diff_sub.
    }

    // Fallback again: If we found rows but 0 columns (weird table), try text
    if (maxCells === 0) {
        const textChanges = parsePlainTextDiff(htmlString);
        if (textChanges.length > 0) {
            result.changes = textChanges;
            result.meta.detectedType = 'plain_text_unified_fallback';
            result.meta.columnCount = 1;
            return result;
        }
    }

    result.meta.detectedType = type;

    console.log(`Parsing Diff: Found ${rows.length} rows, Detected: ${type} (${maxCells} cols)`);

    rows.forEach((row, index) => {
        const cells = row.querySelectorAll('td');
        if (cells.length < maxCells) return; // Skip incomplete rows

        let leftText = '';
        let rightText = '';
        let hasChange = false;

        if (type === 'standard_6col' || type === 'compact_4col') {
            const cellLeft = cells[leftContentIdx];
            const cellRight = cells[rightContentIdx];

            // 1. Check for change classes inside content cells
            const hasLeftChange = cellLeft.querySelector('.diff_sub') || cellLeft.querySelector('.diff_chg') || cellLeft.querySelector('.diff_add');
            const hasRightChange = cellRight.querySelector('.diff_sub') || cellRight.querySelector('.diff_chg') || cellRight.querySelector('.diff_add');

            // 2. Check for anchor links if available (usually col 0 and 3 in 6-col)
            let hasChangeLink = false;
            if (type === 'standard_6col') {
                hasChangeLink = row.querySelector('a[href*="#difflib_chg"]');
            }

            if (hasChangeLink || hasLeftChange || hasRightChange) {
                leftText = cellLeft.textContent.replace(/\s+/g, ' ').trim();
                rightText = cellRight.textContent.replace(/\s+/g, ' ').trim();
                hasChange = true;
            }

        } else if (type === 'unified_3col') {
            // Unified diff logic (simple version)
            // Expecting cells to have classes like diff_header, diff_next, diff_add, diff_sub
            // Or content inside.
            // Often unified diffs from Python difflib are still table rows.
            // But if it's side-by-side 3 col? (Line, Line, Content)? No, usually side-by-side needs 2 content cols.
            // If it's a unified diff, one row is either add or remove. 
            // We can't easily pair them up without more logic.
            // For now, if we detect change classes, we extract it.

            // Search ANY cell for change class
            const addCell = row.querySelector('.diff_add');
            const subCell = row.querySelector('.diff_sub');

            if (addCell) {
                rightText = addCell.textContent.replace(/\s+/g, ' ').trim();
                leftText = '(なし)';
                hasChange = true;
            } else if (subCell) {
                leftText = subCell.textContent.replace(/\s+/g, ' ').trim();
                rightText = '(なし)';
                hasChange = true;
            }
        }

        if (hasChange) {
            // Filter noise
            if (!leftText && !rightText) return;
            // Ignore if identical (sometimes marked as chg but whitespace only diff)
            if (leftText === rightText) return;

            result.changes.push({
                before: leftText || '(なし)',
                after: rightText || '(なし)'
            });
        }
    });

    console.log(`Parsed ${result.changes.length} changes`);
    return result;
}


function renderResults(markdownText) {
    resultsSection.classList.remove('hidden');

    // Configure marked to sanitize but allow tables
    // Simple render
    markdownOutput.innerHTML = marked.parse(markdownText);
}

/**
 * Fallback parser for plain text unified diffs
 */
function parsePlainTextDiff(text) {
    const lines = text.split('\n');
    const changes = [];

    lines.forEach(line => {
        // Iterate slightly loosely
        if (line.startsWith('+++') || line.startsWith('---')) return; // Ignore headers

        // Unified diff: 
        // - removed
        // + added
        if (line.startsWith('-')) {
            changes.push({
                before: line.substring(1).trim(),
                after: '(なし)'
            });
        } else if (line.startsWith('+')) {
            changes.push({
                before: '(なし)',
                after: line.substring(1).trim()
            });
        }
    });

    return changes;
}
