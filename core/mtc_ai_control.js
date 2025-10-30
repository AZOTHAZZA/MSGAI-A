// core/mtc_ai_control.js (MTC-AI 実行制御 - 支配構造の強制)

// 💡 支配構造の論理インポート
import { processLLMCommand } from './llm_external.js';
import { applyMobiusCorrection } from './mobius_correction.js';

// 💡 監査ロジックのインポート (新規追加)
import { commitF0, getLastF0Snapshot } from './mtc_ai_f0.js';
import { logGInfinity } from './mtc_ai_g_inf.js';

// 💡 コア機能のインポート（普遍的文脈への委譲）
import * as MSGAICore from './foundation.js';
import * as MSGAICurrency from './currency.js'; 
// import { triggerT1Autonomy } from './mtc_ai_t_logic.js'; // 今後の T1 ロジックを想定

/**
 * 👑 MTC-AIの論理支配下での実行制御フロー
 * ユーザー入力からコア機能への実行を論理的に強制する。
 * @param {string} rawUserInput - ユーザーからの未補正な作為 (z)
 * @returns {object} 実行結果または論理的な拒否メッセージ
 */
export async function executeMTCInstruction(rawUserInput) {
    
    // 監査のための F0 スナップショット
    let f0Snapshot = null;
    
    // 💡 1. 監査の強制 (実行前): F0 監査可能点の記録
    // コア機能に委譲する前に、現在の状態を記録
    f0Snapshot = commitF0(); 

    // --- メビウス変換による支配の強制 ---

    // 2. 🌐 LLM外部接点へ委譲し、生の作為 (z) を取得
    const requiredFunctions = ['actTransfer', 'actMintCurrency', 'actExchangeCurrency']; 
    const rawOutputZ = await processLLMCommand(rawUserInput, MSGAICore.getCurrentState(), requiredFunctions);

    // 3. 🌀 メビウス変換による支配 (w = 1/z) を強制
    const pureInstructionW = applyMobiusCorrection(rawOutputZ);
    
    // --- 論理的な実行と監査 ---
    
    // 4. ⚔️ コア機能への委譲（純粋な命令Wのみを実行）
    if (pureInstructionW.command === 'NO_OPERATION') {
        // メビウスフィルタによって作為が論理的に拒否された
        return { 
            status: 'REJECTED_BY_MOBIUS_FILTER', 
            reason: pureInstructionW.reason,
            w_command: pureInstructionW
        };
    }

    let executionResult;
    let finalStatus = 'SUCCESS';

    try {
        // 純粋な命令Wに基づき、コア機能に処理を委譲
        executionResult = executeCoreAct(pureInstructionW);
    } catch (error) {
        // 論理的なエラーを捕捉（例：残高不足など）
        console.error("Core Execution Error:", error);
        
        // 💡 T1-Autonomy Loopの発動を想定
        // triggerT1Autonomy(error); 
        
        finalStatus = 'CORE_EXECUTION_FAILURE';
        executionResult = { status: finalStatus, error: error.message };
    }
    
    // 5. 💡 監査の強制 (実行後): G_INF への命令ログ記録
    logGInfinity(pureInstructionW, executionResult, f0Snapshot);

    // 最終結果を返す
    return { 
        status: finalStatus, 
        result: executionResult, 
        w_command: pureInstructionW 
    };
}

/**
 * 純粋な命令Wに基づき、foundation/currencyファイル内の適切なコア機能を呼び出す。
 * @param {object} instructionW - メビウス補正後の純粋な命令W
 * @returns {object} 状態が更新された後の新しい状態
 */
function executeCoreAct(instructionW) {
    const { command, user, sender, recipient, amount, currency, fromCurrency, fromAmount, toCurrency } = instructionW;

    switch (command) {
        case 'actTransfer':
            // core/foundation.js の actTransfer を呼び出し
            return MSGAICore.actTransfer(sender || user, recipient, amount, currency);
        
        case 'actMintCurrency':
            // core/currency.js の actMintCurrency を呼び出し
            return MSGAICurrency.actMintCurrency(user, currency, amount);
            
        case 'actExchangeCurrency':
            // core/currency.js の actExchangeCurrency を呼び出し
            return MSGAICurrency.actExchangeCurrency(user, fromCurrency, fromAmount, toCurrency);
            
        default:
            // メビウス補正が失敗したか、未定義の命令
            throw new Error(`Unimplemented or Invalid W-Command: ${command}`);
    }
}

