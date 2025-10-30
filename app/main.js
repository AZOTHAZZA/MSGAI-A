// app/main.js
// MTC-AI 支配構造の起動ロジックとUI接続を統合

// 💡 コアモジュールのインポート
import { 
    getCurrentState, 
    initializeState,
    actTransfer, 
    setActiveUser, 
    deleteAccounts, 
    addTension 
} from './core/foundation.js'; 
import { actMintCurrency, actExchangeCurrency, SUPPORTED_CURRENCIES } from './core/currency.js';
import { executeMTCInstruction } from './core/mtc_ai_control.js';
import { getLastF0Snapshot } from './core/mtc_ai_f0.js'; 
import { getGInfinityLog } from './core/mtc_ai_g_inf.js';

// -------------------------------------------------------------------------
// グローバル変数とUIキャッシュ
// -------------------------------------------------------------------------

const TENSION_LIMIT = 0.5; 
let UI_ELEMENTS = {};

// -------------------------------------------------------------------------
// ユーティリティ関数
// -------------------------------------------------------------------------

function cacheUIElements() {
    const ids = [
        'status_message', 'tension_level_display', 'tension_bar', 'tension_level_display_bar',
        'active_user_select', 'active_user_name', 
        'autonomy_status', 'delete_accounts_button',
        'dialogue-output', 'user-input', 'submit-button',
        'run-test-button', 'output-message', 'mobius-result'
    ];
    
    SUPPORTED_CURRENCIES.forEach(c => { ids.push(`balance_${c}`); });
    
    ids.forEach(id => {
        const el = document.getElementById(id);
        UI_ELEMENTS[id] = el;
    });
}

function logToConsole(message, type = 'ai-message') {
    const output = UI_ELEMENTS['dialogue-output'];
    if (!output) return; 
    
    const messageDiv = document.createElement('div');
    messageDiv.className = type;
    messageDiv.innerHTML = `<strong>[CORE]:</strong> ${message}`;
    output.appendChild(messageDiv);
    output.scrollTop = output.scrollHeight; 
}

function updateUI(state) {
    const tension = state.tension; // tensionはfoundationから取得したstateの一部
    const tensionValue = tension.value; 
    const activeUserName = state.active_user;
    
    if (UI_ELEMENTS['status_message']) {
        UI_ELEMENTS['status_message'].textContent = `[STATUS]: ${state.status_message}`;
    }
    
    // Tension & Autonomy Status
    if (UI_ELEMENTS['tension_level_display']) {
        UI_ELEMENTS['tension_level_display'].textContent = `T: ${tensionValue.toFixed(6)}`;
    }
    const tensionBarEl = UI_ELEMENTS['tension_level_display_bar'];
    if (tensionBarEl) { 
        const tensionPercent = Math.min(tensionValue / TENSION_LIMIT, 1) * 100;
        tensionBarEl.style.width = `${tensionPercent}%`;
        tensionBarEl.style.backgroundColor = (tensionValue > TENSION_LIMIT * 0.7) ? '#dc3545' : '#ffc107';
    }
    const autonomyStatusEl = UI_ELEMENTS['autonomy_status'];
    if (autonomyStatusEl) {
         if (tensionValue > TENSION_LIMIT) {
            autonomyStatusEl.innerHTML = `暴走抑止ステータス: **🚨 超高緊張**`;
            autonomyStatusEl.style.color = '#dc3545';
        } else if (tensionValue > TENSION_LIMIT * 0.7) {
            autonomyStatusEl.innerHTML = `暴走抑止ステータス: **🟡 高緊張**`;
            autonomyStatusEl.style.color = '#ffc107';
        } else {
            autonomyStatusEl.innerHTML = `暴走抑止ステータス: **🟢 低緊張**`;
            autonomyStatusEl.style.color = '#28a745';
        }
    }

    if (UI_ELEMENTS['active_user_name']) {
        UI_ELEMENTS['active_user_name'].textContent = activeUserName;
    }
    
    const accounts = state.accounts[activeUserName];
    SUPPORTED_CURRENCIES.forEach(currency => {
        const el = UI_ELEMENTS[`balance_${currency}`];
        if (el) { 
            const balance = accounts[currency] || 0;
             if (currency === "JPY") {
                 el.textContent = Math.floor(balance).toLocaleString();
            } else if (["BTC", "ETH", "MATIC"].includes(currency)) {
                 el.textContent = balance.toFixed(8);
            } else {
                 el.textContent = balance.toFixed(2);
            }
        }
    });

    const selectEl = UI_ELEMENTS['active_user_select'];
    if (selectEl) {
        selectEl.innerHTML = '';
        Object.keys(state.accounts).forEach(user => {
            const option = document.createElement('option');
            option.value = user;
            option.textContent = user;
            if (user === activeUserName) {
                option.selected = true;
            }
            selectEl.appendChild(option);
        });
    }
}

// -------------------------------------------------------------------------
// 👑 支配構造の起動関数
// -------------------------------------------------------------------------

/**
 * ユーザーの作為的な入力（z）を受け取り、MTC-AIの論理支配を開始する。
 * @param {string} userInput - ユーザーが入力したテキスト（作為 z）
 */
async function handleUserInput(userInput) {
    if (!userInput || userInput.trim() === "") {
        logToConsole("入力が空です。処理をスキップします。");
        return;
    }

    // 1. UIを更新（処理中を示す）
    UI_ELEMENTS['output-message'].textContent = "処理中... (LLM通信とメビウス補正を適用)";
    UI_ELEMENTS['mobius-result'].textContent = "補正結果待ち...";
    logToConsole(`ユーザーからの作為 (z): "${userInput}"`, 'user-message');

    // 2. 👑 MTC-AI制御核に実行を委譲 (メビウス支配の開始)
    let executionResult;
    try {
        executionResult = await executeMTCInstruction(userInput);
        
        // 3. 結果の表示
        UI_ELEMENTS['output-message'].textContent = `実行ステータス: ${executionResult.status}`;
        
        const wCommandJson = executionResult.w_command ? JSON.stringify(executionResult.w_command, null, 2) : 'NO_OPERATION (作為が支配により無効化されました)';
        UI_ELEMENTS['mobius-result'].textContent = wCommandJson;
        
        if (executionResult.w_command) {
            logToConsole(`純粋な命令 (w) が実行されました: ${executionResult.w_command.command}`, 'ai-message');
        } else {
            logToConsole(`作為 (z) がメビウス補正により無効化されました。`, 'error-message');
        }

        updateUI(getCurrentState());

    } catch (error) {
        console.error("MTC-AI 致命的なエラー:", error);
        UI_ELEMENTS['output-message'].textContent = `エラー: ${error.message}`;
        logToConsole(`システムエラー: ${error.message}`, 'error-message');
    }
}

// -------------------------------------------------------------------------
// 🌐 UIイベントハンドラーと初期化
// -------------------------------------------------------------------------

function handleUserSelect(event) {
    const newActiveUser = event.target.value;
    setActiveUser(newActiveUser);
    logToConsole(`アクティブユーザーを ${newActiveUser} に切り替えました。`, 'user-message');
    updateUI(getCurrentState());
}

function handleDeleteAccounts() {
    if (confirm("🚨 警告: 全ての口座情報とTensionを削除し、システムを初期状態にリセットします。よろしいですか？")) {
        deleteAccounts();
        logToConsole("全ての口座情報と状態が削除され、システムは初期状態にリセットされました。", 'error-message');
        // 状態を再初期化してUIを更新
        initializeState(); 
        updateUI(getCurrentState());
    }
}


/**
 * テストシナリオ1: 純粋な作為（Minting Act）の実行
 * @param {string} rawInput - テスト用のユーザー入力
 */
async function runTestScenario1(rawInput) {
    console.group(`\n🧪 TEST SCENARIO 1: 純粋な作為 (Minting) - 入力: "${rawInput}"`);
    
    // 状態リセット
    deleteAccounts(); 
    initializeState(); // Tension 0, USD 0
    
    logToConsole("--- テスト開始: 状態をリセットしました ---", 'ai-message');
    
    const startTime = Date.now();
    try {
        const executionResult = await executeMTCInstruction(rawInput);
        
        console.log("--- 実行結果サマリー ---");
        const finalState = getCurrentState();
        
        // 結果の検証
        const expectedUSD = 100.00;
        const finalUSD = finalState.accounts.User_A.USD;
        
        const usdTestStatus = (Math.abs(finalUSD - expectedUSD) < 0.01) ? "✅ SUCCESS" : `❌ FAILED (期待値: ${expectedUSD}, 実際: ${finalUSD})`;
        
        console.log(`USD残高検証: ${usdTestStatus}`);
        console.log(`最終 Tension: ${finalState.tension.value.toFixed(6)} (${finalState.tension.value > 0 ? '✅ 増加確認' : '❌ ゼロ'})`);
        
        // 監査チェック
        const lastF0 = getLastF0Snapshot();
        const gInfLog = getGInfinityLog();
        console.log(`F0スナップショット (${lastF0 ? "有" : "無"})`);
        console.log(`G_infログ数: ${gInfLog.length} (${gInfLog.length > 0 ? '✅ 記録確認' : '❌ 記録なし'})`);
        
        // UIの最終更新
        UI_ELEMENTS['output-message'].textContent = `テスト完了: ${usdTestStatus}`;
        updateUI(finalState);
        logToConsole(`テストシナリオ1完了: ${usdTestStatus}`, usdTestStatus.startsWith('✅') ? 'ai-message' : 'error-message');


    } catch (e) {
        console.error("テスト実行中に致命的なエラー:", e);
        UI_ELEMENTS['output-message'].textContent = `テスト失敗: ${e.message}`;
        logToConsole(`テスト失敗: ${e.message}`, 'error-message');
    } finally {
        console.log(`実行時間: ${Date.now() - startTime}ms`);
        console.groupEnd();
    }
}


// 初期化ロジック
function initializeApp() {
    cacheUIElements();
    logToConsole("MTC-AI ロゴス支配構造を起動中...", 'ai-message');
    
    const initialState = getCurrentState(); 
    logToConsole(`監査コンソール起動成功。アクティブユーザー: ${initialState.active_user}`, 'ai-message');

    // イベントリスナーの登録
    UI_ELEMENTS['submit-button'].addEventListener('click', () => handleUserInput(UI_ELEMENTS['user-input'].value));
    UI_ELEMENTS['user-input'].addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleUserInput(UI_ELEMENTS['user-input'].value);
            UI_ELEMENTS['user-input'].value = ''; 
        }
    });

    UI_ELEMENTS['run-test-button'].addEventListener('click', () => {
        UI_ELEMENTS['output-message'].textContent = "テスト実行中...";
        runTestScenario1("User_AにUSDを100生成してください。"); 
    });

    UI_ELEMENTS['active_user_select'].addEventListener('change', handleUserSelect); 
    UI_ELEMENTS['delete_accounts_button'].addEventListener('click', handleDeleteAccounts); 
    
    updateUI(initialState);
}

document.addEventListener('DOMContentLoaded', initializeApp);

