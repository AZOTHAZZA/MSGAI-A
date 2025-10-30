// app.main.js (MTC-AI 支配構造の起動ロジック)

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
        console.log("Input is empty. No operation.");
        return;
    }

    console.log("--- 支配構造起動: ユーザー作為 (z) 受領 ---");
    console.log(`ユーザー入力: ${userInput}`);

    // 1. 👑 MTC-AI制御核に実行を委譲 (メビウス支配の開始)
    let executionResult;
    try {
        executionResult = await executeMTCInstruction(userInput);
        
        // 2. 結果の表示（純粋な命令 w の確認）
        console.log("--- 支配構造完了: 純粋な命令 (w) 実行結果 ---");
        console.log("実行ステータス:", executionResult.status);
        if (executionResult.w_command) {
            console.log("実行されたW-Command:", executionResult.w_command.command);
            console.log("命令詳細:", executionResult.w_command);
        }
        
        // 3. 最新の状態とメッセージの表示をUIに反映（コンソールにも出力）
        updateUIAfterExecution();

    } catch (error) {
        // 致命的なエラーやT1が捕捉できないエラー
        console.error("MTC-AI FATAL ERROR:", error);
        alert("システムで致命的な論理エラーが発生しました。詳細はコンソールを確認してください。");
    }
}

// -------------------------------------------------------------------------
// 🌐 UI要素への接続と状態更新ロジック
// -------------------------------------------------------------------------

function updateUIAfterExecution() {
    const state = getCurrentState();
    const accountsDiv = document.getElementById('accounts-display');
    const statusDiv = document.getElementById('status-message');
    
    if (statusDiv) {
        statusDiv.textContent = `STATUS: ${state.status_message} | TENSION: ${state.tension.value.toFixed(5)} | USER: ${state.active_user}`;
    }

    if (accountsDiv) {
        let html = `
            <div class="account-card bg-gray-700 p-4 rounded-lg shadow-lg mb-4">
                <h3 class="text-xl font-bold text-yellow-300 mb-2">Active User: ${state.active_user}</h3>
            </div>
        `;
        
        // 全ユーザーの残高を表示
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
    
    // UI要素の存在確認
    if (!inputElement || !submitButton || !userSelect || !deleteButton) {
        console.error("UI要素（入力欄、ボタン、選択肢）がindex.htmlに見つかりません。");
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
        inputElement.value = ''; // 入力フィールドをクリア
    };
    
    // ユーザー切り替え
    userSelect.addEventListener('change', (e) => {
        setActiveUser(e.target.value);
        updateUIAfterExecution();
    });
    
    // アカウント全削除機能
    deleteButton.addEventListener('click', () => {
        if (confirm("全てのアカウントとTensionデータをリセットしますか？")) { // 警告: Canvasではconfirmは動作しないが、ロジックとして残す
            deleteAccounts();
            updateUIAfterExecution();
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
    updateUIAfterExecution();
    console.log("MTC-AI Front-End Ready. 支配構造は待機状態です。");
});

