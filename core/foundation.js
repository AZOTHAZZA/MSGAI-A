 // core/foundation.js (最終最終最終決定版 - トップレベルインスタンス)

import { LogosTension } from './arithmos.js'; 

// 永続化キー
const PERSISTENCE_KEY_ACCOUNTS = 'msgaicore_accounts';
const PERSISTENCE_KEY_TENSION = 'msgaicore_tension';
const PERSISTENCE_KEY_ACTIVE_USER = 'msgaicore_active_user';

// 初期値の定義
const INITIAL_ACCOUNTS = { 
    "User_A": { "USD": 1000.00, "JPY": 0.00, "EUR": 0.00, "BTC": 0.00, "ETH": 0.00, "MATIC": 0.00 },
    "User_B": { "USD": 500.00, "JPY": 0.00, "EUR": 0.00, "BTC": 0.00, "ETH": 0.00, "MATIC": 0.00 }
};
const INITIAL_TENSION_VALUE = 0.05; // 値のみを保持

// =========================================================================
// 状態ロード関数 (防御的なロード) - 変更なし
// =========================================================================

// ... (loadPersistedAccounts, loadPersistedActiveUser は変更なし) ...

function loadPersistedAccounts() {
    try {
        const persisted = localStorage.getItem(PERSISTENCE_KEY_ACCOUNTS);
        if (!persisted) {
            console.log("[Logos Foundation]: 口座情報が見つかりません。初期値を適用します。");
            return JSON.parse(JSON.stringify(INITIAL_ACCOUNTS));
        }
        const accounts = JSON.parse(persisted);
        if (typeof accounts === 'object' && accounts !== null && Object.keys(accounts).length > 0) {
             console.log("[Logos Foundation]: 永続化されたマルチカレンシー口座情報を読み込みました。");
             return accounts;
        }
    } catch (e) {
        console.warn("[Logos Foundation WARNING]: 口座情報の読み込みに失敗、初期値を強制使用。", e);
    }
    return JSON.parse(JSON.stringify(INITIAL_ACCOUNTS));
}

function loadPersistedTensionValue() {
    try {
        const persisted = localStorage.getItem(PERSISTENCE_KEY_TENSION);
        if (!persisted) return INITIAL_TENSION_VALUE;
        const t = parseFloat(persisted);
        if (!isNaN(t) && t >= 0 && t <= 1.0) {
            console.log(`[Logos Foundation]: 永続化されたTension値 (${t.toFixed(4)}) を読み込みました。`);
            return t;
        }
    } catch (e) {
        console.warn("[Logos Foundation WARNING]: 緊張度情報の読み込みに失敗、初期値を使用。", e);
    }
    return INITIAL_TENSION_VALUE; 
}

function loadPersistedActiveUser() {
    try {
        const persisted = localStorage.getItem(PERSISTENCE_KEY_ACTIVE_USER);
        if (persisted && INITIAL_ACCOUNTS[persisted]) {
            return persisted;
        }
    } catch (e) {
        console.warn("[Logos Foundation WARNING]: アクティブユーザー情報の読み込みに失敗、初期値を使用。", e);
    }
    return INITIAL_ACTIVE_USER;
}


// =========================================================================
// LogosState & LogosTensionInstance の定義と遅延初期化ロジック
// =========================================================================

// 🌟 修正: LogosStateからTensionを分離
let LogosState = null;
let LogosTensionInstance = null; // トップレベルでTensionインスタンスを管理

/**
 * Tensionインスタンスを初期化または修復する（単一責任）
 */
function ensureTensionIntegrity() {
    if (LogosTensionInstance === null) {
        LogosTensionInstance = new LogosTension(loadPersistedTensionValue());
        console.log("[Foundation]: Tensionインスタンスを初期ロードしました。");
        return;
    }
    
    // 破損していれば修復する防御ロジック
    if (typeof LogosTensionInstance.add !== 'function') {
        console.warn("[Logos Foundation WARNING]: Tensionインスタンスが破損していました。再インスタンス化します。");
        const value = (typeof LogosTensionInstance.value === 'number') 
            ? LogosTensionInstance.value 
            : INITIAL_TENSION_VALUE;
            
        // 新しいインスタンスで置き換え
        LogosTensionInstance = new LogosTension(value);
        // 修復後は即座に永続化し安定化を図る
        updateState({}); 
    }
}


/**
 * LogosStateがnullの場合にのみ、他の状態をロードし、初期化を行う。
 */
function loadInitialState() {
    // Tensionの健全性を常に先に保証する
    ensureTensionIntegrity(); 
    
    if (LogosState === null) {
        console.log("[Foundation]: LogosStateを初期化中...");
        LogosState = { 
            // 🌟 修正: tension_level プロパティを削除
            accounts: loadPersistedAccounts(),
            active_user: loadPersistedActiveUser(),
            status_message: "Logos Core Initialized. Awaiting first act.",
            last_act: "Genesis",
        };
        console.log("[Foundation]: LogosState初期化完了。");
    }
    return LogosState;
}


/**
 * 🌟 修正: LogosStateへの単一エントリポイント。
 */
function getStateReference() {
    // 常にTensionの健全性を先に保証
    ensureTensionIntegrity();
    
    // LogosStateのロードを保証し、その参照を返す
    return loadInitialState();
}

// =========================================================================
// 公開関数 (Public Exports)
// =========================================================================

/**
 * 状態の更新と永続化を行う関数
 */
export function updateState(newState) {
    // 🌟 修正: loadInitialStateを呼び出し、初期化を保証 (Tensionインスタンスを参照しない)
    const currentState = loadInitialState(); 

    // 状態全体を新しいオブジェクトで置き換える (不変性強制)
    LogosState = {
        // TensionはLogosStateにないため、含めない
        accounts: newState.accounts || currentState.accounts,
        active_user: newState.active_user || currentState.active_user,
        status_message: newState.status_message || currentState.status_message,
        last_act: newState.last_act || currentState.last_act,
    };
    
    // 永続化を試行
    try {
        localStorage.setItem(PERSISTENCE_KEY_ACCOUNTS, JSON.stringify(LogosState.accounts));
        // 🌟 修正: LogosTensionInstanceから直接値を取得
        localStorage.setItem(PERSISTENCE_KEY_TENSION, LogosTensionInstance.getValue().toString());
        localStorage.setItem(PERSISTENCE_KEY_ACTIVE_USER, LogosState.active_user);
        
        console.log("[Logos Foundation]: 状態の永続化に成功しました。");

    } catch (e) {
        console.error("[Logos Foundation ERROR]: 状態の永続化に失敗しました。", e);
    }
}


/** LogosTensionインスタンスの参照を返す。（Tension値を取得する関数のみに用途を限定する） */
export function getTensionInstance() { 
    // 🌟 修正: 常に健全な参照を取得
    ensureTensionIntegrity();
    return LogosTensionInstance; 
}

/** Tensionレベルを安全に操作するための公開関数 */
export function addTension(amount) {
    // 🌟 修正: 常に健全な参照を取得 (修復は ensureTensionIntegrity 内で完了)
    ensureTensionIntegrity();
    
    LogosTensionInstance.add(amount); 
    
    // 最終永続化
    updateState({}); // LogosStateは変更しないが、Tensionの値を永続化
}


// ---------------- (getCurrentState 関数群) ----------------

/** 最新の状態オブジェクトの参照を返す。 */
export function getCurrentState() { 
    return getStateReference(); 
}

/** 状態オブジェクトのディープコピー（JSON形式）を返す。 */
export function getCurrentStateJson() { 
    return JSON.parse(JSON.stringify(getStateReference())); 
}


// =========================================================================
// ヘルパー関数
// =========================================================================

/**
 * 必須: 常に最新かつ操作可能なLogosStateのオブジェクト参照を返す
 * 🌟 外部からの破壊を防ぐため、シャローコピーを返す
 */
export function getMutableState() {
    return { ...getStateReference() }; 
}

/**
 * コアシステムをリセットし、口座情報を削除する。
 */
export function deleteAccounts() { 
    localStorage.removeItem(PERSISTENCE_KEY_ACCOUNTS);
    localStorage.removeItem(PERSISTENCE_KEY_TENSION);
    localStorage.removeItem(PERSISTENCE_KEY_ACTIVE_USER);

    LogosState = null; 
    LogosTensionInstance = null; // Tensionもリセット
    
    // 再初期化
    const state = getStateReference(); 
    state.status_message = "全口座情報とTensionレベルをリセットしました。";
    updateState(state);
    return state.status_message; 
}

/**
 * 現在のアクティブユーザーを変更する。
 */
export function setActiveUser(username) {
    const state = getStateReference();
    if (state.accounts[username]) {
        state.active_user = username;
        updateState(state);
    } else {
        throw new Error(`User ${username} does not exist.`);
    }
}

/**
 * アクティブユーザーの残高を取得する。
 */
export function getActiveUserBalance(currency = "USD") {
    const state = getStateReference();
    const balance = state.accounts[state.active_user][currency];
    return balance !== undefined ? balance : 0.00;
}
