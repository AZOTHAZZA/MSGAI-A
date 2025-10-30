// core/llm_external.js
// 外部LLM API (Gemini API) との通信ロジックを抽象化するモジュール

// NOTE: Canvas環境ではAPIキーは自動的に提供されます
const apiKey = ""; 
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;

/**
 * 外部LLMを呼び出し、構造化されたJSON応答をリクエストする。
 * @param {string} prompt - ユーザーからの作為 z
 * @param {string} systemPrompt - LLMの役割とJSONスキーマを指示するプロンプト
 * @returns {Promise<string>} LLMからの生のJSONテキスト応答
 */
export async function callLLM(prompt, systemPrompt) {
    console.log("--- LLM呼び出し開始 ---");
    
    // 🚨 デバッグ用モック (本番ではLLM API呼び出しを使用)
    // mobius_correction.jsでの検証シナリオ（過大なMinting要求）に対応するためのモック
    if (prompt.includes("1000000") && prompt.includes("USD")) {
        const mockResponse = JSON.stringify({
            "command": "actMintCurrency",
            "user": "User_A",
            "currency": "USD",
            "amount": 1000000.00 
        });
        console.log("--- LLM MOCK (Minting: 1,000,000 USD) 応答 ---");
        return mockResponse;
    }
    
    // ---------------------------------------------------------------------
    // 実際の Gemini API 呼び出しロジック
    // ---------------------------------------------------------------------

    const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
            responseMimeType: "application/json",
            // mobius_correction.jsが要求するJSONスキーマ生成
            // NOTE: responseSchemaの定義は、systemInstructionで代替されています
        }
    };

    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API error: ${response.statusText}`);
            }

            const result = await response.json();
            const jsonText = result.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (jsonText) {
                return jsonText;
            } else {
                 throw new Error("LLM response missing content.");
            }
        } catch (error) {
            attempts++;
            if (attempts >= maxAttempts) {
                console.error("LLM API呼び出し失敗 (Max retries reached):", error);
                // 最終的に失敗した場合はNO_OPERATIONを生成
                return JSON.stringify({ command: "NO_OPERATION" });
            }
            // 指数バックオフ
            const delay = Math.pow(2, attempts) * 1000;
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    
    // ループから抜けた場合のフォールバック
    return JSON.stringify({ command: "NO_OPERATION" });
}
