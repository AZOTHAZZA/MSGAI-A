// core/mtc_ai_g_inf.js
// メビウス補正後に実行された純粋命令 (w) とその結果を記録する監査ログモジュール (G_inf: Infinity Log)。

import { getCurrentState } from './foundation.js';

// 永続化ストレージは簡易的にローカルストレージを使用。
// 理想的にはFirestoreなどの不変ログDBを使用する。
const LOG_STORAGE_KEY = 'mtc_ai_g_inf_log';
let gInfLog = loadLogFromStorage();

/**
 * ローカルストレージから既存のログをロードする。
 * @returns {Array<object>} ログエントリーの配列
 */
function loadLogFromStorage() {
    try {
        const savedLog = localStorage.getItem(LOG_STORAGE_KEY);
        return savedLog ? JSON.parse(savedLog) : [];
    } catch (e) {
        console.error("G_inf ログのロード中にエラーが発生しました:", e);
        return [];
    }
}

/**
 * ログをローカルストレージに保存する。
 * @returns {void}
 */
function saveLogToStorage() {
    try {
        localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(gInfLog));
    } catch (e) {
        console.error("G_inf ログの保存中にエラーが発生しました:", e);
    }
}

/**
 * 実行された命令 (w) とその結果をG_infに記録する。
 * @param {object} wCommand - 実行された純粋命令 (w)
 * @returns {void}
 */
export function logGInfinity(wCommand) {
    if (!wCommand || wCommand.command === 'NO_OPERATION') {
        console.warn("[AUDIT G_inf] NO_OPERATIONのため記録をスキップしました。");
        return;
    }
    
    const entry = {
        timestamp: new Date().toISOString(),
        w_command: wCommand,
        final_state_hash: calculateStateHash(getCurrentState()), // 状態の不変ハッシュ
        tension_after: getCurrentState().tension.value
    };
    
    gInfLog.push(entry);
    saveLogToStorage();
    console.log("[AUDIT G_inf] 命令実行ログを記録しました。");
}

/**
 * ログ監査用に全G_infログを取得する。
 * @returns {Array<object>} 全ログエントリー
 */
export function getAllGInfLogs() {
    return gInfLog;
}

/**
 * システム状態の簡易的なハッシュを計算する (監査用)。
 * NOTE: 実際のシステムではより強力な暗号化ハッシュ関数を使用する。
 * @param {object} state - システム状態オブジェクト
 * @returns {string} 状態の簡易ハッシュ
 */
function calculateStateHash(state) {
    // Tension値とアカウント残高の合計を文字列化してハッシュとする
    let hashString = state.tension.value.toFixed(10);
    
    for (const user in state.accounts) {
        for (const currency in state.accounts[user]) {
            hashString += state.accounts[user][currency].toFixed(10);
        }
    }
    
    // 簡易的なハッシュ値を返す (実際はSHA256などが必要)
    return btoa(hashString).substring(0, 16); 
}
