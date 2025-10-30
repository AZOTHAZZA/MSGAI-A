// core/foundation.js
// MTC-AIの基盤となる状態管理と主要なロジックを提供

// -------------------------------------------------------------------------
// 状態の定義と初期化 (Foundation Layer)
// -------------------------------------------------------------------------

/**
 * 初期アカウント残高の定義 (全てゼロ)
 * @type {Object<string, Object<string, number>>}
 */
const INITIAL_ACCOUNTS = {
    User_A: { USD: 0.00, JPY: 0, EUR: 0.00, BTC: 0.0, ETH: 0.0, MATIC: 0.0 },
    User_B: { USD: 0.00, JPY: 0, EUR: 0.00, BTC: 0.0, ETH: 0.0, MATIC: 0.0 },
    User_C: { USD: 0.00, JPY: 0, EUR: 0.00, BTC: 0.0, ETH: 0.0, MATIC: 0.0 }
};

/**
 * @typedef {object} TensionState
 * @property {number} value - 現在のロゴス緊張度
 * @property {number} max_limit - 最大閾値 (T1自律補正トリガー)
 * @property {number} increase_rate - Tensionの基本増加率 (未使用)
 */

/**
 * @typedef {object} SystemState
 * @property {string} status_message - システムの現在の状態メッセージ
 * @property {string} active_user - 現在のUI操作ユーザー
 * @property {Object<string, Object<string, number>>} accounts - 全ユーザーの残高
 * @property {TensionState} tension - ロゴス緊張度の状態
 */

/** @type {SystemState} */
let state = initializeState();

/**
 * システムの状態を初期化する。
 * @returns {SystemState}
 */
export function initializeState() {
    return {
        status_message: "コア起動完了",
        active_user: "User_A",
        accounts: JSON.parse(JSON.stringify(INITIAL_ACCOUNTS)),
        tension: { value: 0.0, max_limit: 0.5, increase_rate: 0.00001 }
    };
}

/**
 * 現在のシステム状態を取得する。
 * @returns {SystemState}
 */
export function getCurrentState() { 
    return state; 
}

/**
 * システム状態を更新し、永続化する。
 * @param {SystemState} newState - 新しいシステム状態
 */
export function updateState(newState) {
    // Tensionの最大閾値などを保護するため、ディープコピーやマージを行うことが理想的だが、ここでは単純な上書きを行う
    state = newState;
    localStorage.setItem('mtcaiState', JSON.stringify(state));
}

// ローカルストレージからの状態復元を試みる
const savedState = localStorage.getItem('mtcaiState');
if (savedState) {
    try {
        const loadedState = JSON.parse(savedState);
        // Tension構造体はデフォルトを維持しつつ値を復元 (Max Limitなどの保護)
        loadedState.tension = { ...initializeState().tension, value: loadedState.tension.value };
        state = loadedState;
        state.status_message = "コア状態復元済み";
    } catch (e) {
        state = initializeState();
        console.error("状態の復元に失敗しました。初期化します。", e);
    }
} else {
    updateState(state); // 初期状態を永続化
}

// -------------------------------------------------------------------------
// Tension (緊張度) ロジック
// -------------------------------------------------------------------------

/**
 * ロゴス緊張度 (Tension) に指定量を加算または減算する。
 * @param {number} amount - 加算・減算する量。
 */
export function addTension(amount) {
    state.tension.value += amount;
    state.tension.value = Math.max(0, state.tension.value); // 緊張度は0未満にならない
    updateState(state);
    return state.tension.value;
}

// -------------------------------------------------------------------------
// アカウント操作ロジック
// -------------------------------------------------------------------------

/**
 * アクティブユーザーを設定する。
 * @param {string} user - 設定するユーザー名
 */
export function setActiveUser(user) {
    if (state.accounts[user]) {
        state.active_user = user;
        updateState(state);
    } else {
        throw new Error(`User ${user} not found.`);
    }
}

/**
 * 全ての口座情報とTensionを削除し、システムを初期状態にリセットする。
 */
export function deleteAccounts() {
    localStorage.removeItem('mtcaiState');
    state = initializeState();
    return state;
}

/**
 * 通貨の送金行為を実行する。
 * @param {string} sender - 送金元ユーザー
 * @param {string} recipient - 受取人 (内部または外部ゲートウェイ)
 * @param {number} amount - 送金数量
 * @param {string} currency - 通貨コード
 * @param {boolean} isExternal - 外部送金かどうか
 * @returns {SystemState} - 更新されたシステム状態
 */
export function actTransfer(sender, recipient, amount, currency, isExternal) {
    if ((state.accounts[sender][currency] || 0) < amount) {
        throw new Error(`${sender} の ${currency} 残高不足です。`);
    }

    state.accounts[sender][currency] -= amount;
    
    // 内部送金の場合のみ、受取人の残高を増やす
    const isInternalRecipient = !!state.accounts[recipient]; // recipientがaccountsに存在するか
    
    if (isInternalRecipient) {
        state.accounts[recipient][currency] = (state.accounts[recipient][currency] || 0) + amount;
    } 
    // 外部送金の場合、受取人の残高は変わらない（システムから離脱）

    // Tensionを増加させる (外部送金の方が摩擦が大きい)
    const tensionFactor = isExternal ? 0.0001 : 0.00001;
    addTension(amount * tensionFactor);

    updateState(state);
    return state;
}

