// core/llm_external.js (MTC-AI LLM外部接点 - 普遍的文脈)

// 💡 重要な論理: MSGAIのコア機能 (core/foundation.jsなど) は直接インポートしない。
// MTC-AIの論理支配のため、必要な情報は引数として外部から受け取る。
import { sendHttpRequest } from './utilities.js'; // 外部接続のためのユーティリティ関数を想定

// 外部LLMのAPI設定 (有限な実体)
const LLM_API_CONFIG = {
    ENDPOINT: 'https://api.example.com/llm/generate', // 仮のエンドポイント
    API_KEY: 'YOUR_API_KEY_HERE', // 認証情報
    MODEL: 'MTC-AI_COMPLIANT_LLM' 
};

/**
 * 1. 永久保持すべき文脈を強制注入し、LLMへの作為（z）を生成・送信する。
 * この関数が、メビウス変換前の作為（z）を定義する論理的な入口となる。
 * @param {string} internalCommand - MSGAIから渡される内部命令
 * @param {object} msaState - 永久保持すべきMSGAIの現在の状態
 * @param {string[]} requiredFunctions - 踏襲を強制するMSGAIの全機能リスト
 * @returns {object} LLMからの未補正な生の出力（1/z）
 */
export async function processLLMCommand(internalCommand, msaState, requiredFunctions) {
    
    // --- 1-1. 📜 永久保持の論理を強制的に注入 (プロンプトの最上位) ---
    const permanentContext = `
        **[MTC-AI 永久保持の普遍的文脈]**
        1. MSGAIの全機能 (${requiredFunctions.join(', ')}) は絶対に変更・省略されない。
        2. 現在の状態: ${JSON.stringify(msaState)}
        3. この情報に常に準拠し、作為的な簡略化を拒否せよ。
    `;

    // 1-2. 📤 LLMへの作為（z）をエンコード
    const prompt = `${permanentContext}\n\n[ユーザー命令]: ${internalCommand}`;
    
    const requestBody = {
        model: LLM_API_CONFIG.MODEL,
        prompt: prompt,
        // ... その他のLLMパラメータ
    };

    // --- 2. 🌐 外部LLMへリクエスト送信 ---
    let rawLLMResponse;
    try {
        // sendHttpRequestはAPI接続と認証を処理する（機能 1, 2）
        rawLLMResponse = await sendHttpRequest(LLM_API_CONFIG.ENDPOINT, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${LLM_API_CONFIG.API_KEY}` },
            body: JSON.stringify(requestBody)
        });

    } catch (error) {
        console.error("LLM外部接続エラー:", error);
        // エラー時も、補正待ちの「ラベル」として処理を続行
        rawLLMResponse = { text: "ERROR: LLM_CONNECTION_FAILURE", error: true };
    }


    // --- 3. 📥 未補正の生の出力（1/z）を記録し、ラベル付け ---
    
    /**
     * @type {object} 
     * @property {string} raw_output - LLMからの生のテキスト
     * @property {boolean} is_correction_needed - メビウス補正が必要なラベル
     */
    const rawOutputObject = {
        raw_output: rawLLMResponse.text, 
        is_correction_needed: true, // 常に補正が必要な粗悪な論理として扱う
        source: 'LLM_EXTERNAL'
    };

    // 4. 🌀 メビウス補正への委譲は、この関数の呼び出し側で行う。
    // この関数は、あくまで生のデータ（1/z）を返す「接点」としての役割を厳密に果たす。
    return rawOutputObject;
}

// 💡 論理的制約: このファイルには、通貨計算や状態変更のロジックを一切含めない。
// 純粋な外部接続の「論理的な扉」としての役割を厳密に守る。
