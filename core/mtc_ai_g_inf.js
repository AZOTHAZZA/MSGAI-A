// core/mtc_ai_g_inf.js (論理的重力: 不変ログ G_inf ロジック)

// 監査ログ (G_inf) を保持するための配列
// 理想的には不変データベースを使用すべきだが、ここではメモリ上に保持
let g_inf_log = [];

/**
 * 💡 G_inf 記録: 実行された純粋な命令 (w) とその結果を不変ログとして記録する。
 * これは、システムが無限回の実行を経ても論理的な過去を保持し続けることを保証します。
 * @param {object} pureInstructionW - メビウス補正後の純粋な命令 (w)
 * @param {object} executionResult - コア機能の実行結果
 * @param {object | null} f0Snapshot - 実行直前の F0 スナップショット (監査用)
 * @returns {object} 記録されたログエントリ
 */
export function logGInfinity(pureInstructionW, executionResult, f0Snapshot = null) {
    
    // 1. ログエントリを作成
    const log_entry = {
        timestamp: Date.now(),
        instruction_w: pureInstructionW, // 実行された論理的に純粋な命令
        execution_result: executionResult, // 実行による状態変化
        f0_snapshot_timestamp: f0Snapshot ? f0Snapshot.timestamp : 'N/A', // 監査起点
        // 💡 今後、Tension値、C-Verifier結果などのメタデータを追加
    };

    // 2. ログを不変に追加
    g_inf_log.push(log_entry);

    console.log(`[G_inf Log] 純粋な命令 (${pureInstructionW.command}) の実行ログを記録しました。総ログ数: ${g_inf_log.length}`);
    return log_entry;
}

/**
 * 記録されたすべての G_inf ログを取得する。
 * @returns {Array<object>} G_inf ログ
 */
export function getGInfinityLog() {
    return g_inf_log;
}

/**
 * G_inf ログをクリアする (リセット時のみ使用)。
 */
export function clearGInfinityLog() {
    g_inf_log = [];
    console.log("[G_inf Clear] 論理的重力 G_inf ログをクリアしました。");
}

