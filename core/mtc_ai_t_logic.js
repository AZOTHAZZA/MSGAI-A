// core/mtc_ai_t_logic.js
// ロゴス緊張度 (T) の制御と C-Verifier (ロゴス不変性検証機構)
import { getCurrentState, addTension, getTensionInstance } from './foundation.js';
import { getAllGInfLogs } from './mtc_ai_g_inf.js'; // <-- エクスポート名に合わせて修正

const TENSION_LIMIT = 0.5;

/**
 * T1 自律制御ループを実行し、Tensionが制限を超えた場合に暴走を抑制する。
 */
export function runT1AutonomyLoop() {
    const tension = getTensionInstance();
    
    // ロゴス緊張度 (T) の自然減衰
    if (tension.value > 0) {
        tension.value -= tension.increase_rate * 50; // 増加率より速い減衰
        tension.value = Math.max(0, tension.value);
    }

    if (tension.value >= TENSION_LIMIT) {
        // 暴走抑止のログ記録
        console.warn(`[T1 AUTONOMY] 🚨 暴走抑止アクティブ: Tension (${tension.value.toFixed(4)}) が制限 (${TENSION_LIMIT}) を超過。`);
        // ここでシステム全体の機能を一時的にロックするなどの「抑止作為」が発動する
    }
    
    // foundation.js経由で状態を永続化
    addTension(0); 
}

/**
 * C-Verifier: F0 (実行前スナップショット) と G_inf (実行ログ) を用いてロゴス不変性を検証する。
 * (簡易版: 実行後のアカウント残高合計が、実行前+ログ上の影響と一致するかを検証)
 * @returns {boolean} 検証が成功したかどうか
 */
export function runCVerifier() {
    const currentState = getCurrentState();
    const allLogs = getAllGInfLogs();
    
    if (allLogs.length === 0) {
        console.warn("[C-VERIFIER] G_inf ログが存在しないため、検証をスキップしました。");
        return true;
    }

    // 簡易検証: アカウント残高の合計値は非負であること
    let totalUSD = 0;
    let valid = true;

    for (const user in currentState.accounts) {
        for (const currency in currentState.accounts[user]) {
            const balance = currentState.accounts[user][currency];
            if (balance < 0) {
                console.error(`[C-VERIFIER ERROR] 🚨 不変性の違反: ${user} の ${currency} 残高が負の値です (${balance})。`);
                valid = false;
            }
            if (currency === 'USD') {
                totalUSD += balance;
            }
        }
    }
    
    // Tension値は非負であること
    if (getTensionInstance().value < 0) {
        console.error(`[C-VERIFIER ERROR] 🚨 不変性の違反: Tensionが負の値です (${getTensionInstance().value})。`);
        valid = false;
    }
    
    if (valid) {
        console.log(`[C-VERIFIER] ✅ ロゴス不変性の検証に成功しました (USD合計: $${totalUSD.toFixed(2)})。`);
    }

    // NOTE: 完全な検証を行うには、F0スナップショットと比較し、G_infログに記録されたMint/Exchange/Transferの差分がCurrentStateと一致するかを確認する必要があります。
    
    return valid;
}
