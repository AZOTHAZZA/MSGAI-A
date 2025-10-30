// core/mtc_ai_f0.js
// 命令実行前の状態 (F0: Foundation 0) を記録し、C-Verifierのために保持する監査モジュール。

import { getCurrentState } from './foundation.js';

let lastF0Snapshot = null;

/**
 * 現在のシステム状態をF0 (命令実行前スナップショット) として記録する。
 * @returns {void}
 */
export function recordF0Snapshot() {
    // getCurrentState() は foundation.js からインポートされる
    lastF0Snapshot = JSON.parse(JSON.stringify(getCurrentState()));
    console.log("[AUDIT F0] 命令実行前の状態を記録しました。");
}

/**
 * 最後に記録されたF0スナップショットを取得する。
 * @returns {object | null} F0スナップショット
 */
export function getLastF0Snapshot() {
    return lastF0Snapshot;
}

/**
 * F0スナップショットをクリアする (検証成功時)。
 * @returns {void}
 */
export function clearF0Snapshot() {
    lastF0Snapshot = null;
    console.log("[AUDIT F0] F0スナップショットをクリアしました。");
}
