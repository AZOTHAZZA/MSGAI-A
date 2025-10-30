// core/mtc_ai_control.js (MTC-AI 実行制御 - 支配構造の強制)

// 💡 支配構造の論理インポート
import { processLLMCommand } from './llm_external.js';
import { applyMobiusCorrection } from './mobius_correction.js';

// 💡 監査ロジックのインポート
import { commitF0 } from './mtc_ai_f0.js';
import { logGInfinity } from './mtc_ai_g_inf.js';

// 💡 自律性ロジックのインポート (新規追加)
import { checkTensionAndTriggerT1, runCVerifier, triggerT1Autonomy } from './mtc_ai_t_logic.js';

// 💡 コア機能のインポート
import * as MSGAICore from './foundation.js';
import * as MSGAICurrency from './currency.js'; 

/**
 * 👑 MTC-AIの論理支配下での実行制御フロー
 * @param {string} rawUserInput - ユーザーからの未補正な作為 (z)
 * @returns {object} 実行結果または論理的な拒否メッセージ
 */
export async function executeMTCInstruction(rawUserInput) {
    
    let f0Snapshot = null;
    let finalStatus = 'SUCCESS';
    let executionResult = {};
    
    // 1. 監査の強制 (実行前): F0 監査可能点の記録
    f0Snapshot = commitF0(); 

    const requiredFunctions = ['actTransfer', 'actMintCurrency', 'actExchangeCurrency']; 
    
    // 2. 🌐 LLM外部接点へ委譲し、生の作為 (z) を取得
    const rawOutputZ = await processLLMCommand(rawUserInput, MSGAICore.getCurrentState(), requiredFunctions);

    // 3. 🌀 メビウス変換による支配 (w = 1/z) を強制
    const pureInstructionW = applyMobiusCorrection(rawOutputZ);
    
    // 4. ⚔️ コア機能への委譲（純粋な命令Wのみを実行）
    if (pureInstructionW.command === 'NO_OPERATION') {
        finalStatus = 'REJECTED_BY_MOBIUS_FILTER';
        executionResult = { reason: pureInstructionW.reason };
    } else {
        try {
            executionResult = executeCoreAct(pureInstructionW);
        } catch (error) {
            // 論理的なエラーを捕捉（例：残高不足など）
            console.error("Core Execution Error:", error);
            
            // 💡 T1 自律補正の発動
            triggerT1Autonomy("コア機能実行中のエラー"); 
            
            finalStatus = 'CORE_EXECUTION_FAILURE';
            executionResult = { status: finalStatus, error: error.message };
        }
    }
    
    // 5. 💡 監査の強制 (実行後): G_INF への命令ログ記録
    logGInfinity(pureInstructionW, executionResult, f0Snapshot);
    
    // 6. 🛡️ 自律性チェックの強制
    runCVerifier(); // コンテキスト検証の実行
    checkTensionAndTriggerT1(); // TensionのチェックとT1のトリガー

    // 最終結果を返す
    return { 
        status: finalStatus, 
        result: executionResult, 
        w_command: pureInstructionW 
    };
}

// executeCoreAct 関数は変更なし
function executeCoreAct(instructionW) {
    const { command, user, sender, recipient, amount, currency, fromCurrency, fromAmount, toCurrency } = instructionW;

    switch (command) {
        case 'actTransfer':
            return MSGAICore.actTransfer(sender || user, recipient, amount, currency);
        case 'actMintCurrency':
            return MSGAICurrency.actMintCurrency(user, currency, amount);
        case 'actExchangeCurrency':
            return MSGAICurrency.actExchangeCurrency(user, fromCurrency, fromAmount, toCurrency);
        default:
            throw new Error(`Unimplemented or Invalid W-Command: ${command}`);
    }
}

