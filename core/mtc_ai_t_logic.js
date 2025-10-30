// core/mtc_ai_t_logic.js
// MTC-AIのロゴス緊張度(T)の自律制御ロジックとT1補正ループ

import { getCurrentState, addTension, updateState } from './foundation.js';
import { clearF0Snapshot, getLastF0Snapshot } from './mtc_ai_f0.js';
import { getGInfinityLog } from './mtc_ai_g_inf.js';

// -------------------------------------------------------------------------
// Logos Tension (ロゴス緊張度 T) 監視ロジック
// -------------------------------------------------------------------------

/**
 * T1自律補正ループを発動させるかをチェックし、実行する。
 * @returns {Promise<boolean>} T1補正が実行されたかどうか
 */
export async function runTensionControl() {
    const currentState = getCurrentState();
    const tension = currentState.tension;

    if (tension.value > tension.max_limit) {
        console.warn(`[T1 ALERT] Tension ${tension.value.toFixed(6)} が最大閾値 ${tension.max_limit.toFixed(6)} を超えました。T1自律補正ループを発動します。`);
        
        // 1. **ロゴス緊張度を即座に半減させる (暫定的な自律的修正)**
        const reductionAmount = tension.value * 0.5;
        addTension(-reductionAmount);

        // 2. **自律的監査によるコンテキスト検証 (C-Verifier)**
        const isVerified = runCVerifier();
        
        if (!isVerified) {
            console.error("[T1 ERROR] C-Verifierが失敗しました。ロゴス不変性が崩壊している可能性があります。システムを強制停止します。");
            // 現実のシステムではここでクリティカルエラー処理を行う
            return true;
        }

        console.log(`[T1 CORRECTION] Tensionを ${reductionAmount.toFixed(6)} 減算し、C-Verifierによるロゴス不変性を確認しました。`);
        return true;
    }
    
    // 命令実行直後の監査チェックのみを実行
    runCVerifier();

    return false;
}


// -------------------------------------------------------------------------
// C-Verifier (コンテキスト検証) ロジック
// -------------------------------------------------------------------------

/**
 * ロゴス不変性 (Logos Invariance) を検証するC-Verifierを実行する。
 * 実行前の状態 (F0)、実行された命令 (G_inf)、実行後の状態 (Current) の一貫性を検証する。
 * @returns {boolean} 検証が成功したかどうか
 */
export function runCVerifier() {
    // F0とG_infが空の場合は、検証スキップ
    const f0Snapshot = getLastF0Snapshot();
    const gInfLog = getGInfinityLog();

    if (!f0Snapshot || gInfLog.length === 0) {
        // 命令実行がない場合は検証不要
        return true; 
    }

    const finalState = getCurrentState();

    // 1. **検証ロジックの中核: F0とG_infログから「期待される最終状態」を再構成**
    let expectedState = JSON.parse(JSON.stringify(f0Snapshot));
    let success = true;

    // ログに記録されたすべての命令をF0に適用し、期待値を計算する
    for (const log of gInfLog) {
        const command = log.command;
        
        // 🚨 簡略化された検証: Tensionは再計算せず、アカウント残高のみを監査する
        try {
            switch (command.command) {
                case 'actMintCurrency':
                    // Mint検証: 期待値に直接加算
                    expectedState.accounts[command.user][command.currency] += command.amount;
                    break;
                case 'actTransfer':
                    // Transfer検証: 送信元から減算
                    expectedState.accounts[command.sender][command.currency] -= command.amount;
                    
                    // 内部送金の場合は受信者へ加算
                    if (expectedState.accounts[command.recipient]) {
                        expectedState.accounts[command.recipient][command.currency] += command.amount;
                    }
                    break;
                case 'actExchangeCurrency':
                    // Exchange検証: ここでは複雑なレート計算をスキップし、ロジックの存在のみを確認
                    // 実際にはレートを再計算して検証する必要があるが、ここではスキップ
                    break;
                case 'NO_OPERATION':
                    // NO_OPERATIONは状態を変化させない
                    break;
                default:
                    console.error(`[C-Verifier] 未知の命令: ${command.command}`);
                    success = false;
                    break;
            }
        } catch (e) {
            console.error(`[C-Verifier] ログ適用中にエラー発生: ${e.message}`, command);
            success = false;
        }

        if (!success) break;
    }
    
    // 2. **期待される状態 (expectedState) と実際の状態 (finalState) の比較**
    
    // Tension値は、命令によって変動するため、厳密な比較は難しいため、ここではアカウントのみを比較
    for (const user in finalState.accounts) {
        for (const currency in finalState.accounts[user]) {
            const actual = finalState.accounts[user][currency] || 0;
            const expected = expectedState.accounts[user][currency] || 0;
            
            // 浮動小数点誤差を許容する比較 (0.000001の許容範囲)
            if (Math.abs(actual - expected) > 0.000001) {
                console.error(`[C-Verifier FAILED] 不変性の崩壊! ${user} の ${currency} 残高不一致。`);
                console.error(`  -> 期待値: ${expected.toFixed(6)}, 実際: ${actual.toFixed(6)}`);
                success = false;
            }
        }
    }

    // 3. **監査ログのクリーンアップ**
    if (success) {
        console.log("[C-Verifier SUCCESS] ロゴス不変性を確認しました。監査ログ (F0/G_inf) をクリアします。");
        clearF0Snapshot();
        // G_infログは、control.jsでクリアされるためここでは行わない
    } else {
        // 検証失敗時は、調査のためにログを保持する
        console.error("[C-Verifier FAILED] ロゴス不変性が崩壊しました。監査ログを保持します。");
        // Tensionを大きく増加させる
        addTension(0.1);
    }
    
    return success;
}

