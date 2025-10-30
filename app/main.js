// app/main.js (新版 MTC-AI 支配構造の起動ロジック)
// 役割: ユーザー入力を受け取り、すべてを core/mtc_ai_control.js に委譲する。

// 支配構造の核となる制御関数と状態関数をインポート
import { executeMTCInstruction } from './core/mtc_ai_control.js';
import { getCurrentState, setActiveUser, deleteAccounts } from './core/foundation.js'; 

// -------------------------------------------------------------------------
// 🚀 支配構造の起動関数
// -------------------------------------------------------------------------

/**
 * ユーザーの作為的な入力（z）を受け取り、MTC-AIの論理支配を開始する。
 * @param {string} userInput - ユーザーが入力したテキスト（作為 z）
 */
async function handleUserInput(userInput) {
    if (!userInput || userInput.trim() === "") {
        updateUIAfterExecution("警告: 入力なし。操作スキップ。", "warning");
        return;
    }

    // 1. UIのロックとメッセージ表示
    document.getElementById('submit-button').disabled = true;
    updateUIAfterExecution("処理中: メビウス支配構造に作為を投入...", "info");

    console.log("--- 支配構造起動: ユーザー作為 (z) 受領 ---");
    
    let executionResult;
    try {
        // 2. 👑 MTC-AI制御核に実行を委譲 (メビウス支配の開始)
        executionResult = await executeMTCInstruction(userInput);
        
        // 3. 結果の処理
        let statusMessage = "実行結果: ";
        let statusType = "success";

        if (executionResult.status === 'SUCCESS') {
            statusMessage += `純粋な命令 (${executionResult.w_command.command}) が実行されました。`;
        } else if (executionResult.status === 'REJECTED_BY_MOBIUS_FILTER') {
            statusMessage = `命令はメビウスフィルタにより論理的に拒否されました。理由: ${executionResult.reason}`;
            statusType = "rejected";
        } else if (executionResult.status === 'CORE_EXECUTION_FAILURE') {
            statusMessage = `コア機能の実行失敗: ${executionResult.error}`;
            statusType = "error";
        } else {
            statusMessage = `不明な実行結果: ${JSON.stringify(executionResult)}`;
            statusType = "error";
        }

        console.log("--- 支配構造完了 ---", executionResult);
        updateUIAfterExecution(statusMessage, statusType);

    } catch (error) {
        // 致命的なエラー
        console.error("MTC-AI FATAL ERROR:", error);
        updateUIAfterExecution("致命的なシステムエラーが発生しました。", "error");
    } finally {
        // 4. UIのアンロック
        document.getElementById('submit-button').disabled = false;
    }
}

// -------------------------------------------------------------------------
// 🌐 UI要素への接続と状態更新ロジック
// -------------------------------------------------------------------------

function updateUIAfterExecution(message = "状態更新完了", type = "default") {
    const state = getCurrentState();
    const accountsDiv = document.getElementById('accounts-display');
    const statusDiv = document.getElementById('status-message');
    
    // ステータスメッセージのスタイリング
    let colorClass = 'text-green-400';
    if (type === 'error' || type === 'rejected') {
        colorClass = 'text-red-400';
    } else if (type === 'info' || type === 'warning') {
        colorClass = 'text-yellow-400';
    }
    
    if (statusDiv) {
        statusDiv.className = `text-lg font-mono ${colorClass} mb-3 border-b border-gray-700 pb-2`;
        statusDiv.textContent = `STATUS: ${message} | TENSION: ${state.tension.value.toFixed(5)} | USER: ${state.active_user}`;
    }

    // アカウント表示の更新
    if (accountsDiv) {
        let html = `
            <div class="account-card bg-gray-700 p-4 rounded-lg shadow-lg mb-4">
                <h3 class="text-xl font-bold text-yellow-300 mb-2">Active User: ${state.active_user}</h3>
            </div>
        `;
        
        for (const user in state.accounts) {
            html += `<div class="account-card bg-gray-800 p-3 rounded-md mb-2 shadow-md">`;
            html += `<p class="font-semibold text-blue-300">${user} Accounts:</p>`;
            for (const currency in state.accounts[user]) {
                const balance = state.accounts[user][currency];
                html += `<span class="text-sm text-gray-200 mr-4">${currency}: ${balance.toFixed(4)}</span>`;
            }
            html += `</div>`;
        }
        accountsDiv.innerHTML = html;
    }
    
    console.log("最新の状態:", state);
}


document.addEventListener('DOMContentLoaded', () => {
    const inputElement = document.getElementById('user-input'); 
    const submitButton = document.getElementById('submit-button'); 
    const userSelect = document.getElementById('user-select');
    const deleteButton = document.getElementById('delete-accounts-button');
    
    if (!inputElement || !submitButton || !userSelect || !deleteButton) {
        console.error("UI要素が見つかりません。index.htmlのIDを確認してください。");
        return;
    }

    // ユーザー選択肢の初期化
    const state = getCurrentState();
    for (const user in state.accounts) {
        const option = document.createElement('option');
        option.value = user;
        option.textContent = user;
        userSelect.appendChild(option);
    }
    userSelect.value = state.active_user;

    // イベントリスナーの設定
    const submitAction = () => {
        const userInput = inputElement.value;
        handleUserInput(userInput);
        inputElement.value = ''; 
    };
    
    userSelect.addEventListener('change', (e) => {
        setActiveUser(e.target.value);
        updateUIAfterExecution("ユーザー切り替え完了");
    });
    
    deleteButton.addEventListener('click', () => {
        // Canvas環境では動作しないが、確認ロジックを保持
        if (confirm("全てのアカウントとTensionデータをリセットしますか？")) { 
            deleteAccounts();
            updateUIAfterExecution("データリセット完了");
            console.log("アカウントデータが初期状態にリセットされました。");
        }
    });

    submitButton.addEventListener('click', submitAction);
    inputElement.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitAction();
        }
    });

    // 初期状態の表示
    updateUIAfterExecution("コア起動完了");
    console.log("MTC-AI 支配構造 Front-End Ready.");
});

