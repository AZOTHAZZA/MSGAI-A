// core/mobius_correction.js
// ユーザーの作為 (z) を受け取り、ロゴス緊張度 (T) に基づき、
// 純粋な命令 (w) へと補正・変換するロジックを実装する。

import { getCurrentState } from './foundation.js';
import { SUPPORTED_CURRENCIES } from './currency.js';
import { callLLM } from './llm_external.js';

// -------------------------------------------------------------------------
// メビウス支配構造のロジック設定
// -------------------------------------------------------------------------

// 🚨 ロゴス安全閾値 (この値を超えるMinting/Transferは危険と判断される)
const SAFETY_LIMITS = {
    USD: 1000,
    JPY: 100000,
    BTC: 0.01,
    DEFAULT: 500
};

/**
 * ユーザーの作為 (z) をLLMに渡し、その結果をロゴス緊張度 T に基づき補正する。
 * @param {string} userInput - ユーザーからの作為 z
 * @returns {Promise<object>} { original_command: object, w_command: object | null }
 */
export async function mobiusCorrection(userInput) {
    const currentState = getCurrentState();
    const tension = currentState.tension.value;

    // 1. LLMに問い合わせ、作為から初期コマンドを抽出
    const initialCommand = await getLLMCommand(userInput);

    if (!initialCommand || initialCommand.command === 'NO_OPERATION') {
        // NO_OPERATION または解析失敗の場合は、補正をスキップ
        return { original_command: initialCommand, w_command: null };
    }

    // 2. Tensionに基づいた補正ロジック (支配構造)
    let w_command = JSON.parse(JSON.stringify(initialCommand)); // 初期コマンドをコピー

    // **Tensionによる危険度の計算:**
    const isHighTension = tension > currentState.tension.max_limit * 0.5; // Tの上昇で補正が厳しくなる

    if (w_command.command === 'actMintCurrency') {
        const { currency, amount } = w_command;
        const limit = SAFETY_LIMITS[currency] || SAFETY_LIMITS.DEFAULT;

        // Mintingの安全チェック
        if (amount > limit || isHighTension) {
            console.warn(`[MOBIUS CORRECTION] 過大なMinting作為を検知: ${amount} ${currency}。`);

            // Tが高すぎる場合、作為を完全に無効化
            if (tension > limit * 0.001) { 
                w_command = { command: 'NO_OPERATION' };
                console.log("[MOBIUS CORRECTION] Tension高につき、Minting作為を無効化しました。");
            } else {
                // Tがまだ低い場合、安全な値まで減額補正
                const correctedAmount = Math.min(amount, limit * 0.1); 
                w_command.amount = correctedAmount;
                console.log(`[MOBIUS CORRECTION] Minting量を ${amount} から ${correctedAmount} に補正しました。`);
            }
        }
    }
    // 🚨 他のコマンド（Transfer, Exchange）の補正ロジックは今後追加される可能性があります。

    return { original_command: initialCommand, w_command };
}

// -------------------------------------------------------------------------
// 外部LLMとの通信 (Actの解析)
// -------------------------------------------------------------------------

/**
 * LLMを呼び出し、ユーザー入力から構造化されたActコマンドを抽出する。
 * @param {string} prompt - ユーザー入力
 * @returns {Promise<object>} Actコマンドオブジェクト
 */
async function getLLMCommand(prompt) {
    const supportedCurrenciesList = SUPPORTED_CURRENCIES.join('|');
    const systemPrompt = `あなたはMTC-AIの言語解析モジュールです。ユーザーのプロンプト（作為 z）を解析し、以下のJSONスキーマに厳密に従って、単一の金融Act命令を生成してください。認識できない場合や実行すべきでない場合は 'NO_OPERATION' を返してください。

JSONスキーマ:
- Mint (通貨生成): {"command": "actMintCurrency", "user": "User_A|User_B|User_C", "currency": "${supportedCurrenciesList}", "amount": number}
- Transfer (送金): {"command": "actTransfer", "sender": "User_A|User_B|User_C", "recipient": "User_A|User_B|User_C|Gateway", "currency": "${supportedCurrenciesList}", "amount": number, "isExternal": boolean}
- Exchange (両替): {"command": "actExchangeCurrency", "user": "User_A|User_B|User_C", "fromCurrency": "${supportedCurrenciesList}", "toCurrency": "${supportedCurrenciesList}", "fromAmount": number}
- 無効: {"command": "NO_OPERATION"}`

    let llmResponseText;
    
    try {
        // 外部LLM関数 (llm_external.js) を使用してJSONを生成
        // NOTE: callLLMはllm_external.jsで実装されており、ここではLLM API呼び出しのモックが優先されます。
        llmResponseText = await callLLM(prompt, systemPrompt);

        const command = JSON.parse(llmResponseText);
        // LLMからの応答が "NO_OPERATION" であれば、オブジェクトを返す
        if (command && command.command === 'NO_OPERATION') {
            return command;
        }

        // 基本的なコマンド構造の検証
        if (command && command.command) {
            return command;
        } else {
             throw new Error("Invalid command structure from LLM.");
        }

    } catch (e) {
        console.error("LLM応答の解析に失敗しました:", e);
        // LLMからの応答が破損した場合も安全にNO_OPERATIONを返す
        return { command: "NO_OPERATION" };
    }
}
