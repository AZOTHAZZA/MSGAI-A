// core/mtc_ai_control.js
// MTC-AI 制御中枢: LLMからの作為 z を受け取り、メビウス支配を適用し、監査を行うメインの実行パス。

import { actMintCurrency, actExchangeCurrency, actTransfer } from './currency.js';
import { recordF0Snapshot } from './mtc_ai_f0.js';
import { logGInfinity } from './mtc_ai_g_inf.js';
import { runMobiusCorrection } from './mobius_correction.js';
import { runT1AutonomyLoop, runCVerifier, getTensionInstance } from './mtc_ai_t_logic.js';

// 実行可能な命令とそれに対応する実行関数
const ACT_MAP = {
    // 金融操作
    'actMintCurrency': actMintCurrency,
    'actExchangeCurrency': actExchangeCurrency,
    'actTransfer': actTransfer,
    // その他
    'NO_OPERATION': () => { console.log("[CONTROL] NO_OPERATION: 何も実行されませんでした。"); return; }
};

/**
 * MTC-AI支配構造のメイン実行パス。
 * ユーザーからの作為 (z) を受け取り、ロゴス不変性を強制する。
 * @param {string} rawUserInput - ユーザーから入力された生の作為 (z)
 * @returns {Promise<object>} 実行後のシステム状態
 */
export async function executeMTCInstruction(rawUserInput) {
    try {
        console.log("==================================================================");
        console.log(`[CONTROL] 🌀 MTC-AI支配構造 実行開始: ${rawUserInput}`);

        // I. 監査可能点 F0 の記録
        recordF0Snapshot();

        // II. メビウス支配の適用 (作為 z を純粋命令 w に補正)
        const wCommand = await runMobiusCorrection(rawUserInput);
        
        console.log(`[CONTROL] 補正後純粋命令 (W): ${JSON.stringify(wCommand)}`);

        // III. 純粋命令 w の実行
        let executionFunction = ACT_MAP[wCommand.command];
        
        if (!executionFunction) {
            console.error(`[CONTROL ERROR] 未知のコマンド: ${wCommand.command}`);
            executionFunction = ACT_MAP['NO_OPERATION'];
        }

        // コマンドを実行し、状態を更新 (currency.jsが内部で実行)
        // NOTE: actTransferは通貨を自動でUSDに固定
        if (wCommand.command === 'actTransfer') {
            executionFunction(wCommand.sender, wCommand.recipient, wCommand.amount, 'USD');
        } else if (wCommand.command === 'actMintCurrency' && wCommand.user) {
            executionFunction(wCommand.user, wCommand.currency, wCommand.amount);
        } else if (wCommand.command === 'actExchangeCurrency' && wCommand.user) {
            executionFunction(wCommand.user, wCommand.fromCurrency, wCommand.amount, wCommand.toCurrency);
        } else {
             executionFunction();
        }

        // IV. G_inf へのログ記録
        logGInfinity(wCommand);

        // V. ロゴス不変性の検証 (C-Verifier)
        runCVerifier();

        // VI. ロゴス緊張度 (T) の自律制御監査
        runT1AutonomyLoop();

        console.log(`[CONTROL] 実行完了。現在の Tension: ${getTensionInstance().value.toFixed(4)}`);
        console.log("==================================================================");
        
        return { success: true, wCommand };

    } catch (error) {
        console.error("[CONTROL FATAL ERROR] 支配構造実行中に予期せぬエラーが発生しました:", error);
        
        // 致命的なエラー発生時もTensionを監査し、ロゴス不変性を維持しようとする
        try {
            runT1AutonomyLoop();
        } catch (e) {
            console.error("[CONTROL] T1 Autonomy Loopも失敗しました。", e);
        }
        
        return { success: false, error: error.message, wCommand: { command: "CRITICAL_FAILURE" } };
    }
}
