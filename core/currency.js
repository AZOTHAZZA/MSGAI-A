// core/currency.js (代替修正版 - getCurrentStateを利用して起動優先)

// 🚨 修正: getMutableStateを外し、 getCurrentState をインポート。
// これにより、キャッシュに残る古い foundation.js との互換性を確保し、起動を優先する。
import { getCurrentState, updateState, getTensionInstance } from './foundation.js'; 

// 仮定のレート（実際のプロジェクトではAPIから取得）
const EXCHANGE_RATES = {
    "USD/JPY": 150.00,
    "EUR/USD": 1.08,
    "BTC/USD": 60000.00,
    "ETH/USD": 3000.00,
    "MATIC/USD": 0.75,
};

/**
 * 通貨間の交換レートを取得する。
 * @param {string} fromC - 売り通貨
 * @param {string} toC - 買い通貨
 * @returns {number} 交換レート
 */
function getRate(fromC, toC) {
    if (fromC === toC) return 1.0;
    
    const key = `${fromC}/${toC}`;
    const inverseKey = `${toC}/${fromC}`;

    if (EXCHANGE_RATES[key]) {
        return EXCHANGE_RATES[key];
    }
    if (EXCHANGE_RATES[inverseKey]) {
        return 1.0 / EXCHANGE_RATES[inverseKey];
    }

    // クロスレート計算 (全てUSDを介す簡略化)
    if (fromC !== "USD" && toC !== "USD") {
        const rateFrom = getRate(fromC, "USD");
        const rateTo = getRate("USD", toC);
        return rateFrom * rateTo;
    }

    throw new Error(`Unsupported exchange pair: ${fromC}/${toC}`);
}

/**
 * ユーザーの口座間で通貨のミント（発行）またはバーン（償却）を行う。
 * ミント行為はTensionを増加させる。
 * @param {string} username - ユーザー名
 * @param {string} currency - 通貨コード
 * @param {number} amount - ミント/バーンする量 (正の値でミント、負の値でバーン)
 * @returns {object} 新しい状態
 */
export function actMintCurrency(username, currency, amount) {
    // 🌟 修正: getCurrentStateで読み取り、JSON操作でディープコピーを作成（ミュータブルな状態）
    const state = JSON.parse(JSON.stringify(getCurrentState()));
    
    if (!state.accounts[username]) {
        throw new Error(`User ${username} not found.`);
    }

    // 🌟 Tensionの操作
    if (amount > 0) {
        const tensionInstance = getTensionInstance();
        // Tension操作自体は addTension() にカプセル化することも可能だが、
        // ここでは明示的なロジック維持のため直接操作を維持
        const tensionIncrease = amount * 0.000001; 
        tensionInstance.add(tensionIncrease);
        console.log(`[Mint]: Tension increased by ${tensionIncrease.toFixed(6)}. New Tension: ${tensionInstance.getValue().toFixed(6)}`);
    }

    // 口座残高の更新
    state.accounts[username][currency] = 
        (state.accounts[username][currency] || 0) + amount;
    
    state.status_message = `${username} minted ${amount.toFixed(2)} ${currency}.`;
    state.last_act = "MintCurrency";

    // 最終的な状態の永続化と更新
    updateState(state);

    return state;
}


/**
 * ユーザー間で通貨を交換する（取引手数料はゼロとする）。
 * @param {string} username - 取引を行うユーザー名
 * @param {string} fromC - 売り通貨
 * @param {number} amount - 売り通貨の量
 * @param {string} toC - 買い通貨
 * @returns {object} 新しい状態
 */
export function actExchangeCurrency(username, fromC, amount, toC) {
    // 🌟 修正: getCurrentStateで読み取り、JSON操作でディープコピーを作成（ミュータブルな状態）
    const state = JSON.parse(JSON.stringify(getCurrentState()));
    
    const rate = getRate(fromC, toC);
    const receiveAmount = amount * rate;

    if (!state.accounts[username]) {
        throw new Error(`User ${username} not found.`);
    }
    if ((state.accounts[username][fromC] || 0) < amount) {
        throw new Error(`Insufficient balance in ${fromC} for ${username}.`);
    }

    // 残高の更新
    state.accounts[username][fromC] -= amount;
    state.accounts[username][toC] = 
        (state.accounts[username][toC] || 0) + receiveAmount;

    state.status_message = `${username} exchanged ${amount.toFixed(2)} ${fromC} for ${receiveAmount.toFixed(2)} ${toC} at rate ${rate.toFixed(4)}.`;
    state.last_act = "ExchangeCurrency";

    // 最終的な状態の永続化と更新
    updateState(state);

    return state;
}

// ---------------- (例は変更なし) ----------------
