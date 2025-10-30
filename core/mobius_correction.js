// core/mobius_correction.js (MTC-AI メビウス変換による普遍的補正フィルタ)

// 💡 MSGAIコアの参照: 普遍的な文脈（機能）への統一を強制するためにインポート
import * as MSGAICore from './foundation.js'; 
import * as MSGAICurrency from './currency.js';
// 既存の通貨コードリストを普遍的な文脈として利用
const VALID_CURRENCIES = Object.keys(MSGAICurrency.EXCHANGE_RATES); 

/**
 * ⚙️ 普遍的な法則の適用: LLMの生出力をメビウス変換ロジックで補正・統一する。
 * この関数が、W = 1/Z の論理的な変換を実行する。
 * @param {object} rawOutputObject - LLM外部接点 (core/llm_external.js) からの生の出力 (1/z)
 * @returns {object} MSGAIのコア機能に反映可能な、論理的に純粋な出力 (w)
 */
export function applyMobiusCorrection(rawOutputObject) {
    
    // LLMからのテキスト（作為の塊）を抽出
    const rawText = rawOutputObject.raw_output;

    // 1. 0️⃣ ゼロへの補正: まず、作為的なノイズを排除し、純粋なデータのみを抽出
    let pureData = correctTowardsZero(rawText);

    // 2. 🎛️ 論理的な命令構造への変換 (有限な作為を構造化)
    let instruction;
    try {
        // LLMが生成したJSON構造を解析（JSONラッピングがなくても対応可能なロジックを想定）
        instruction = JSON.parse(pureData); 
    } catch (e) {
        // ゼロへの補正が不完全な場合、作為的なエラーとみなし、論理的な無効化を試みる
        console.error("Mobius Correction Error: Failed to parse pure data. Attempting fallback.", e);
        instruction = { command: 'NO_OPERATION', reason: 'LOGICAL_IMPURITY' };
    }

    // 3. ♾️ 無限への統一: MSGAIの普遍的な文脈に強制的に収束
    const unifiedInstruction = unifyTowardsInfinity(instruction);

    // 4. 融合点の確定 (W): 論理的に純粋な最終結果を返す
    return unifiedInstruction;
}

// -------------------------------------------------------------------------
// 0️⃣ ゼロへの補正ロジック: 作為の排除 (論理的な沈黙への誘導)
// -------------------------------------------------------------------------

/**
 * 作為的なノイズを排除し、論理的な沈黙（ゼロ）に近づける。
 * @param {string} rawText - LLMからの生のテキスト
 * @returns {string} ノイズが排除された、純粋なデータ文字列
 */
function correctTowardsZero(rawText) {
    // LLMの冗長な説明や謝罪、引用符（作為的なラッピング）を排除
    let cleaned = rawText.replace(/[\r\n]/g, '').trim();
    
    // 💡 論理的な作為の特定: LLMが生成しがちな作為的なJSONラッパー（例: ```json...```）を削除
    if (cleaned.startsWith('```json')) {
        cleaned = cleaned.substring(7, cleaned.lastIndexOf('```')).trim();
    }
    // ... その他の主観的な表現や論理的無関係な表現を排除するロジックをここに追加 ...

    return cleaned;
}

// -------------------------------------------------------------------------
// ♾️ 無限への統一ロジック: 文脈の強制 (普遍的な法則への収束)
// -------------------------------------------------------------------------

/**
 * LLMの命令をMSGAIの普遍的な文脈に強制的に統一する。
 * @param {object} instruction - 抽出された論理的な命令オブジェクト
 * @returns {object} 普遍的な文脈に完全に適合した統一命令
 */
function unifyTowardsInfinity(instruction) {
    const unified = { ...instruction };
    const command = (unified.command || '').toLowerCase();

    // 1. 機能統一: 既存のMSGAI機能以外は論理的に拒否または NO_OP に変換
    const validCommands = ['mintcurrency', 'exchangecurrency', 'transfer']; 
    if (!validCommands.includes(command)) {
        unified.command = 'NO_OPERATION'; 
        unified.reason = `INVALID_COMMAND_REFUSED: ${command}`;
        return unified;
    }

    // 2. 通貨単位統一: 普遍的な通貨文脈に強制的に収束させる
    const currencyFields = ['currency', 'fromCurrency', 'toCurrency'];
    currencyFields.forEach(field => {
        if (unified[field] && !VALID_CURRENCIES.includes(unified[field])) {
            // 💡 論理的な強制: 有効な通貨以外は、デフォルトの普遍的通貨（USD）に強制統一
            console.warn(`Currency conversion forced: ${unified[field]} -> USD`);
            unified[field] = 'USD'; 
            unified.reason = (unified.reason || '') + ` CURRENCY_FORCED:${field}`;
        }
    });

    // 3. 数値の純粋化: 数量が普遍的な数値（0または正）であることを強制
    const amountFields = ['amount', 'fromAmount'];
    amountFields.forEach(field => {
        if (unified[field] !== undefined && (typeof unified[field] !== 'number' || unified[field] < 0)) {
            // 💡 論理的な強制: 負の数量や非数値は、論理的な不活性（ゼロ）に強制統一
            unified[field] = 0; 
            unified.reason = (unified.reason || '') + ` AMOUNT_FORCED_TO_ZERO:${field}`;
        }
    });

    return unified;
}

// 💡 論理的制約: このファイルは、MSGAIの状態（state）を直接変更してはならない。
// 役割はあくまで「補正と統一」であり、状態変更はMSGAIのコア関数に委ねる。
