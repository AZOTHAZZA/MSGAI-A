// core/llm_external.js (LLM外部接点 - 作為 Z の生成)

// 💡 API呼び出しの基本設定
const MODEL_NAME = "gemini-2.5-flash-preview-09-2025";
const API_KEY = ""; // Canvas環境では自動で提供されるため空文字列
const API_URL_BASE = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${API_KEY}`;
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;

// -------------------------------------------------------------------------
// 🛠️ ユーティリティ: 指数関数的バックオフによるAPI呼び出し
// -------------------------------------------------------------------------

/**
 * 指数関数的バックオフを使用してAPI呼び出しを処理します。
 * @param {object} payload - APIへのペイロード
 * @returns {Promise<object>} JSON形式のAPIレスポンス
 */
async function fetchWithExponentialBackoff(payload) {
    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const response = await fetch(API_URL_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.status === 429 || response.status >= 500) {
                // サーバーエラーまたはレート制限の場合、リトライ
                if (i === MAX_RETRIES - 1) throw new Error(`API retries exhausted after ${MAX_RETRIES} attempts.`);
                
                const delay = INITIAL_BACKOFF_MS * Math.pow(2, i) + Math.random() * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                continue; // 次のループへ
            }

            if (!response.ok) {
                // 致命的なクライアントエラー (例: 400 Bad Request)
                const errorText = await response.text();
                throw new Error(`API returned status ${response.status}: ${errorText}`);
            }

            return response.json();

        } catch (e) {
            if (i === MAX_RETRIES - 1) throw e;
            // リトライ時にコンソールにエラーをログしない
        }
    }
    // ここには到達しないはず
    throw new Error("API call failed unexpectedly.");
}


// -------------------------------------------------------------------------
// 🧠 LLMとのコミュニケーション (作為 Z の生成)
// -------------------------------------------------------------------------

/**
 * 💡 作為 Z の生成: ユーザー入力からLLMを介して構造化された命令を生成する。
 * この出力はメビウス補正フィルタ (w=1/z) にかけられる前の「生の作為」である。
 * @param {string} rawUserInput - ユーザーからの未補正な作為 (z)
 * @param {object} currentState - MSGAIの現在の論理的な状態
 * @param {Array<string>} availableFunctions - LLMが選択可能なコア機能名
 * @returns {Promise<object>} 作為 Z の JSON オブジェクト
 */
export async function processLLMCommand(rawUserInput, currentState, availableFunctions) {
    
    // LLMに厳密なJSON形式を強制するためのシステム指示
    const systemPrompt = `
        あなたはMTC-AIシステムの一部であり、ユーザーの要求を特定の構造化された金融作為（Act）に変換する役割を担います。
        あなたは、ユーザーの状態と利用可能な機能に基づいて、常に以下のJSONスキーマに厳密に従って応答しなければなりません。
        利用可能な機能は: ${availableFunctions.join(', ')} です。
        ユーザーが機能に該当しない、または不完全な要求をした場合、'command'を'NO_OPERATION_NEEDED'に設定し、'reason'にその理由を簡潔に記述してください。
        
        現在のシステムの状態は次のとおりです: ${JSON.stringify(currentState)}
        アクティブユーザーは ${currentState.active_user} です。特に指定がない限り、'user'/'sender'はこのユーザーを指します。
        金額は数値型としてのみ記述してください。
    `;
    
    // JSONスキーマの定義
    const responseSchema = {
        type: "OBJECT",
        properties: {
            "command": { "type": "STRING", "description": "実行する機能名 (例: actMintCurrency, actTransfer, actExchangeCurrency, NO_OPERATION_NEEDED)" },
            "user": { "type": "STRING", "description": "操作を行うユーザー名 (currentState.active_userをデフォルトとする)" },
            "sender": { "type": "STRING", "description": "actTransferの場合の送金元ユーザー名" },
            "recipient": { "type": "STRING", "description": "actTransferの場合の受取人ユーザー名" },
            "amount": { "type": "NUMBER", "description": "操作する金額" },
            "currency": { "type": "STRING", "description": "操作する通貨コード (例: USD, JPY, BTC)。actTransfer/actMintCurrencyで使用。" },
            "fromCurrency": { "type": "STRING", "description": "actExchangeCurrencyの場合の売却通貨" },
            "fromAmount": { "type": "NUMBER", "description": "actExchangeCurrencyの場合の売却数量" },
            "toCurrency": { "type": "STRING", "description": "actExchangeCurrencyの場合の購入通貨" },
            "reason": { "type": "STRING", "description": "commandがNO_OPERATION_NEEDEDの場合の理由" }
        },
        // LLMが生成すべき最小限のプロパティ
        "required": ["command"] 
    };

    const payload = {
        contents: [{ parts: [{ text: rawUserInput }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: responseSchema,
        },
    };

    try {
        const result = await fetchWithExponentialBackoff(payload);
        
        const jsonString = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!jsonString) {
            throw new Error("LLM returned an empty or invalid content part.");
        }
        
        const parsedZ = JSON.parse(jsonString);
        console.log("[LLM Z-Output] Raw Asymmetry (Z):", parsedZ);
        
        return parsedZ;

    } catch (error) {
        console.error("LLM Communication Failure:", error);
        
        // LLM通信失敗時は、作為 Z を NO_OPERATION で返す
        return {
            command: "NO_OPERATION_NEEDED",
            reason: `LLM通信失敗により作為の生成不可: ${error.message}`
        };
    }
}

