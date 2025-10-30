// core/currency.js
// 通貨に関連するAct（Mint, Exchange）と為替レートのロジックを提供

import { getCurrentState, updateState, addTension } from './foundation.js';

// -------------------------------------------------------------------------
// 通貨とレートの定義
// -------------------------------------------------------------------------

/**
 * サポートされている通貨コードのリスト
 * @type {string[]}
 */
export const SUPPORTED_CURRENCIES = ["USD", "JPY", "EUR", "BTC", "ETH", "MATIC"];

/**
 * USD基準の為替レート (1単位あたりのUSD換算値, またはUSDが基準)
 * 厳密には、USDを1とした場合の相対的な値。
 * @type {Object<string, number>}
 */
const EXCHANGE_RATES = {
    USD: 1,      // 基準
    JPY: 130,    // 1 USD = 130 JPY (簡略化された表現)
    EUR: 0.9,    // 1 USD = 0.9 EUR
    BTC: 0.00005, // 1 USD = 0.00005 BTC
    ETH: 0.001,  // 1 USD = 0.001 ETH
    MATIC: 1.5   // 1 USD = 1.5 MATIC
};

// -------------------------------------------------------------------------
// Act (行為) ロジック
// -------------------------------------------------------------------------

/**
 * 指定された通貨を指定量生成（Mint）するActを実行する。
 * @param {string} user - 通貨を生成するユーザー
 * @param {string} currency - 通貨コード
 * @param {number} amount - 生成数量
 * @returns {import('./foundation.js').SystemState} - 更新されたシステム状態
 */
export function actMintCurrency(user, currency, amount) {
    const currentState = getCurrentState();

    if (!currentState.accounts[user]) {
        throw new Error(`User ${user} not found.`);
    }
    if (amount <= 0 || isNaN(amount)) {
        throw new Error("生成数量は正の値を指定してください。");
    }

    currentState.accounts[user][currency] = (currentState.accounts[user][currency] || 0) + amount;
    
    // Tension増加を計算: USD換算量に基づく
    // USD換算: amount * (1 / RATE[currency])
    // 例: 130 JPY Minting -> 1 USD 相当 (130 * (1/130))
    const usdEquivalent = amount / (EXCHANGE_RATES[currency] || 1); 
    const tensionIncrease = usdEquivalent * 0.005; // Mintingは比較的高い摩擦を持つ

    addTension(tensionIncrease);
    updateState(currentState);
    return currentState;
}

/**
 * 通貨交換（Exchange）Actを実行する。
 * @param {string} user - 交換を行うユーザー
 * @param {string} fromCurrency - 売却通貨
 * @param {number} fromAmount - 売却数量
 * @param {string} toCurrency - 購入通貨
 * @returns {import('./foundation.js').SystemState} - 更新されたシステム状態
 */
export function actExchangeCurrency(user, fromCurrency, fromAmount, toCurrency) {
    const currentState = getCurrentState();

    if (!currentState.accounts[user]) {
        throw new Error(`User ${user} not found.`);
    }
    if ((currentState.accounts[user][fromCurrency] || 0) < fromAmount) {
        throw new Error(`${fromCurrency} の残高が不足しています。`);
    }
    if (fromCurrency === toCurrency) {
        throw new Error("交換元と交換先は異なる通貨でなければなりません。");
    }

    // USD換算価値を計算
    const rateFromUSD = EXCHANGE_RATES[fromCurrency] || 1;
    const rateToUSD = EXCHANGE_RATES[toCurrency] || 1;
    
    // USD基準: amount / (rate[from]のUSD換算)
    const usdEquivalent = fromCurrency === 'USD' 
        ? fromAmount 
        : (fromAmount / rateFromUSD) * EXCHANGE_RATES.USD; // USDを基準とする

    // 購入数量の計算: usdEquivalent * rate[to]のUSD換算
    const toAmount = toCurrency === 'USD' 
        ? usdEquivalent
        : usdEquivalent * rateToUSD / EXCHANGE_RATES.USD;

    // 残高の更新
    currentState.accounts[user][fromCurrency] -= fromAmount;
    currentState.accounts[user][toCurrency] = (currentState.accounts[user][toCurrency] || 0) + toAmount;

    // Tension増加: ExchangeはMintingより摩擦が低い
    const tensionIncrease = usdEquivalent * 0.001; 
    addTension(tensionIncrease);

    updateState(currentState);
    return currentState;
}

