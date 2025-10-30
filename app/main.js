// app/main.js
// MTC-AI 支配構造の中枢起動モジュール

import { getTensionInstance, getCurrentState, saveState } from '../core/foundation.js'; // パスを修正
import { getExchangeRates } from '../core/currency.js'; // パスを修正
import { executeMTCInstruction } from '../core/mtc_ai_control.js'; // パスを修正
import { recordF0Snapshot } from '../core/mtc_ai_f0.js'; // パスを修正
import { getAllGInfLogs } from '../core/mtc_ai_g_inf.js'; // パスを修正

const userInputElement = document.getElementById('user-input');
const executeButton = document.getElementById('execute-button');
const tensionDisplay = document.getElementById('tension-display');
const mobiusResult = document.getElementById('mobius-result');
const stateDisplay = document.getElementById('state-display');

/**
 * TensionレベルをUIに表示する
 */
function updateTensionDisplay() {
    try {
        const tension = getTensionInstance();
        tensionDisplay.textContent = `T = ${tension.value.toFixed(4)}`;
        
        // Tensionレベルに応じてUIの色を調整
        const card = document.getElementById('tension-card');
        if (tension.value > 0.4) {
            card.className = "bg-red-200 border-l-4 border-red-700 p-4 rounded-lg shadow-md";
        } else if (tension.value > 0.2) {
            card.className = "bg-yellow-100 border-l-4 border-yellow-500 p-4 rounded-lg shadow-md";
        } else {
            card.className = "bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-md";
        }

    } catch (e) {
        // 初期ロード時のエラーハンドリング
        tensionDisplay.textContent = 'T = LOADING...';
        console.error("Tension表示の更新エラー:", e);
    }
}

/**
 * アカウント状態をUIに表示する
 */
function updateStateDisplay() {
    try {
        const state = getCurrentState();
        const rates = getExchangeRates();
        
        let output = "--- Accounts ---\n";
        for (const [user, balances] of Object.entries(state.accounts)) {
            output += `${user}:\n`;
            for (const [currency, amount] of Object.entries(balances)) {
                const usdValue = amount / rates[currency] * rates['USD'];
                output += `  - ${currency}: ${amount.toFixed(2)} (≈ $${usdValue.toFixed(2)} USD)\n`;
            }
        }
        
        output += "\n--- Exchange Rates (USD=1) ---\n";
        for (const [currency, rate] of Object.entries(rates)) {
             output += `  - 1 USD = ${rate.toFixed(4)} ${currency}\n`;
        }

        stateDisplay.textContent = output;
    } catch (e) {
        stateDisplay.textContent = '状態データが見つかりません。';
        console.error("状態表示の更新エラー:", e);
    }
}

/**
 * コマンド実行ボタンのクリックハンドラ
 */
async function handleExecute() {
    const rawUserInput = userInputElement.value.trim();
    if (!rawUserInput) {
        mobiusResult.textContent = '命令を入力してください。';
        return;
    }

    // 実行中はボタンを無効化
    executeButton.disabled = true;
    executeButton.textContent = '🌀 処理中...';
    mobiusResult.textContent = 'メビウス補正を適用中...';

    try {
        // MTC-AI制御中枢に命令を委譲
        const result = await executeMTCInstruction(rawUserInput);

        if (result.success) {
            mobiusResult.textContent = JSON.stringify(result.wCommand, null, 2);
        } else {
            mobiusResult.textContent = `実行失敗: ${result.error}`;
        }
    } catch (error) {
        mobiusResult.textContent = `致命的な制御エラー: ${error.message}`;
        console.error("致命的な制御エラー:", error);
    } finally {
        // UIを更新
        updateTensionDisplay();
        updateStateDisplay();
        
        // ボタンを元に戻す
        executeButton.disabled = false;
        executeButton.innerHTML = '<span class="mr-2">🌀</span> メビウス補正を適用して実行';
    }
}

// 起動時の初期化
document.addEventListener('DOMContentLoaded', () => {
    // ボタンにイベントリスナーを設定
    if (executeButton) {
        executeButton.addEventListener('click', handleExecute);
    }
    
    // 初期状態の表示を更新
    updateTensionDisplay();
    updateStateDisplay();
    
    // 定期的な監査チェック (例として5秒ごと)
    setInterval(() => {
        updateTensionDisplay();
        updateStateDisplay();
    }, 5000);

    console.log("[MAIN] MTC-AI UI初期化完了。支配構造の起動を待機中...");
});
