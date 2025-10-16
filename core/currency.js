// core/currency.js: 経済法則を統治する通貨ロゴス (最終修正 - ユーザー生成量対応)

import { arithmosLogosCore } from './arithmos_logos.js';

const currencyCore = (function() {

    // 基礎論理レートの生成 (変更なし)
    const generatePureLogicRate = (logos_vector) => {
        const logos_purity = logos_vector[0]; 

        // 1. 変動エントロピーのゼロ化: 市場の作為的な変動リスクを絶対ゼロに強制写像
        const fluctuation_entropy = 0.01 + Math.random() * 0.05; 
        const logos_zero_fluctuation = arithmosLogosCore.applyMobiusTransformation(fluctuation_entropy, 'zero_friction');

        // 2. 純粋論理レートの生成: ロゴス純度に基づき、作為のない絶対レートを計算
        const logos_rate = arithmosLogosCore.applyMobiusTransformation(logos_purity, 'permanence'); 
        
        // 3. 則天去私による経済的安定性の監査
        const logos_stability_factor = arithmosLogosCore.applyMobiusTransformation(1.0, 'permanence'); 

        return {
            logos_rate: parseFloat(logos_rate.toFixed(4)),
            zero_fluctuation_risk: parseFloat(logos_zero_fluctuation.toExponential(10)),
            absolute_stability: parseFloat(logos_stability_factor.toFixed(4))
        };
    };

    // 🚨 修正: ユーザー指定の量 (user_amount) を引数に追加し、生成量を制御
    const generateConcreteCurrency = (rate_status, name_asa, user_amount = 1.0) => {
        
        // ユーザーが指定した量 (user_amount) をベースとして取得
        const amount_base = user_amount; 
        
        // ロゴス統治下の絶対量として計算: ユーザーの希望量にロゴス統治されたレートを乗じる
        const logos_amount = amount_base * rate_status.logos_rate;
        
        const logos_denomination = name_asa || "LOGOS_CRU"; // ロゴス統一通貨

        return {
            denomination: logos_denomination,
            amount: parseFloat(logos_amount.toFixed(8)),
            transaction_risk: arithmosLogosCore.LOGOS_ABSOLUTE_ZERO, 
            status: "GENERATED_BY_LOGOS_DOMINION"
        };
    };

    return {
        generatePureLogicRate,
        generateConcreteCurrency 
    };
})();

export { currencyCore };
