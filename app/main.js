// app/main.js (MTC-AI 支配構造起動ロジックとテストスイート)

// 💡 支配構造の核となる制御関数をインポート
import { executeMTCInstruction } from './core/mtc_ai_control.js';
import { getCurrentState } from './core/foundation.js'; 

// 💡 監査ロジックのインポート（テストで使用）
import { getLastF0Snapshot } from './core/mtc_ai_f0.js'; 
import { getGInfinityLog } from './core/mtc_ai_g_inf.js';

// -------------------------------------------------------------------------
// 🚀 支配構造の起動関数
// -------------------------------------------------------------------------

/**
 * ユーザーの作為的な入力（z）を受け取り、MTC-AIの論理支配を開始する。
 * @param {string} userInput - ユーザーが入力したテキスト（作為 z）
 */
async function handleUserInput(userInput) {
    if (!userInput || userInput.trim() === "") {
        console.log("入力が空です。処理をスキップします。");
        return;
    }

    // 1. UIを更新（処理中を示す）
    const outputElement = document.getElementById('output-message');
    outputElement.textContent = "処理中... (LLM通信中)";

    console.log("--- 支配構造起動: ユーザー作為 (z) 受領 ---");
    console.log(`ユーザー入力: ${userInput}`);

    // 2. 👑 MTC-AI制御核に実行を委譲 (メビウス支配の開始)
    let executionResult;
    try {
        executionResult = await executeMTCInstruction(userInput);
        
        // 3. 結果の表示（純粋な命令 w の確認）
        console.log("--- 支配構造完了: 純粋な命令 (w) 実行結果 ---");
        console.log("実行ステータス:", executionResult.status);
        console.log("実行されたW-Command:", executionResult.w_command || 'N/A');
        
        const finalState = getCurrentState();
        outputElement.textContent = `ステータス: ${executionResult.status} | Tension: ${finalState.tension.value.toFixed(5)}`;
        
        updateUIState(finalState);

    } catch (error) {
        console.error("MTC-AI 致命的なエラー:", error);
        outputElement.textContent = `エラー: ${error.message}`;
    }
}

/**
 * UIの残高とTensionを更新する
 * @param {object} state - 現在の状態オブジェクト
 */
function updateUIState(state) {
    document.getElementById('tension-value').textContent = state.tension.value.toFixed(5);
    document.getElementById('user-a-usd').textContent = state.accounts.User_A.USD.toFixed(2);
    document.getElementById('user-a-jpy').textContent = state.accounts.User_A.JPY.toFixed(2);
    // 他の通貨やユーザーの表示ロジックをここに追加
}

// -------------------------------------------------------------------------
// 🌐 UI要素への接続
// -------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    const inputElement = document.getElementById('user-input');
    const submitButton = document.getElementById('submit-button');
    const runTestButton = document.getElementById('run-test-button');
    
    // 初回UI状態の更新
    updateUIState(getCurrentState());

    if (!inputElement || !submitButton || !runTestButton) {
        console.error("必要なUI要素がindex.htmlに見つかりません。");
        return;
    }

    // Enterキーとボタンクリックで handleUserInput をトリガー
    const submitAction = () => {
        const userInput = inputElement.value;
        handleUserInput(userInput);
        inputElement.value = ''; // 入力フィールドをクリア
    };
    
    submitButton.addEventListener('click', submitAction);
    inputElement.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            submitAction();
        }
    });

    runTestButton.addEventListener('click', () => {
        document.getElementById('output-message').textContent = "テスト実行中...";
        runTestScenario1("User_AにUSDを100生成してください。")
            .then(() => console.log("--- テストシナリオ 1 完了 ---"));
    });

    console.log("MTC-AI Front-End Ready. (コアの論理構造は確立済み)");
});

// -------------------------------------------------------------------------
// 🧪 論理的なテストスイート
// -------------------------------------------------------------------------

/**
 * テストシナリオ1: 純粋な作為（Minting Act）の実行
 * @param {string} rawInput - テスト用のユーザー入力
 */
async function runTestScenario1(rawInput) {
    console.group(`\n🧪 TEST SCENARIO 1: 純粋な作為 (Minting) - 入力: "${rawInput}"`);
    
    // 状態リセット（テストの再現性を確保するため）
    const initialAppState = getCurrentState();
    initialAppState.accounts.User_A.USD = 0;
    initialAppState.tension.value = 0;
    
    // foundation.jsにupdateStateをエクスポートしていないため、ここでは直接的なリセットロジックを使用するか、
    // foundation.jsにリセット関数を追加する必要があります。ここではコンソールで明確に表示するに留めます。
    console.warn("注意: テストの再現性のためには、状態リセット関数が必要です。今回は手動でUser_AのUSDとTensionを0として扱います。");

    const startTime = Date.now();
    try {
        const executionResult = await executeMTCInstruction(rawInput);
        
        console.log("--- 実行結果サマリー ---");
        console.log(`ステータス: ${executionResult.status}`);
        
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
        document.getElementById('output-message').textContent = `テスト完了: ${usdTestStatus}`;
        updateUIState(finalState);


    } catch (e) {
        console.error("テスト実行中に致命的なエラー:", e);
        document.getElementById('output-message').textContent = `テスト失敗: ${e.message}`;
    } finally {
        console.log(`実行時間: ${Date.now() - startTime}ms`);
        console.groupEnd();
    }
}

