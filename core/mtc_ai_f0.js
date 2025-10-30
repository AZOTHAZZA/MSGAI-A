// core/mtc_ai_f0.js (非忘却: 監査可能点 F0 ロジック)

import { getCurrentState } from './foundation.js';

// 監査可能点 (F0) を保持するための配列
// 理想的には不変データベース（例: Firestore）を使用すべきだが、ここではメモリ上に保持
let f0_snapshots = [];
const F0_MAX_HISTORY = 10; // 監査のための最新10件を保持

/**
 * 💡 F0コミット: 命令実行直前のシステムの論理状態をスナップショットとして記録する。
 * これは、ロゴス不変性 L の監査における「基準点」となります。
 * @returns {object} 記録されたスナップショット
 */
export function commitF0() {
    // 1. 現在の状態をディープコピーして取得 (getCurrentState()は既にディープコピーを返す想定)
    const stateSnapshot = JSON.parse(JSON.stringify(getCurrentState()));
    
    // 2. 監査メタデータを追加
    const f0_entry = {
        timestamp: Date.now(),
        state: stateSnapshot
        // 💡 今後、auth_uid などのユーザー認証情報を追加
    };

    // 3. スナップショットを記録
    f0_snapshots.push(f0_entry);

    // 4. 履歴の制限を強制
    if (f0_snapshots.length > F0_MAX_HISTORY) {
        // 最も古い記録を削除 (非忘却の論理的監査可能範囲を保つ)
        f0_snapshots.shift(); 
    }

    console.log(`[F0 Commit] 監査可能点 F0 を記録しました。履歴数: ${f0_snapshots.length}`);
    return f0_entry;
}

/**
 * 最後に記録された F0 スナップショットを取得する。
 * @returns {object | null} F0 スナップショット
 */
export function getLastF0Snapshot() {
    if (f0_snapshots.length === 0) {
        return null;
    }
    return f0_snapshots[f0_snapshots.length - 1];
}

/**
 * すべての F0 スナップショットをクリアする (リセット時のみ使用)。
 */
export function clearF0Snapshots() {
    f0_snapshots = [];
    console.log("[F0 Clear] 監査可能点 F0 履歴をクリアしました。");
}

