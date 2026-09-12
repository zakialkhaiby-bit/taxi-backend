"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: Object.getOwnPropertyDescriptor(all, name).get
    });
}
_export(exports, {
    get AddPaytrGateway1706253836308 () {
        return AddPaytrGateway1706253836308;
    },
    get PaymentGatewayType () {
        return PaymentGatewayType;
    }
});
const _typeorm = require("typeorm");
var PaymentGatewayType = /*#__PURE__*/ function(PaymentGatewayType) {
    PaymentGatewayType["Stripe"] = "stripe";
    PaymentGatewayType["BrainTree"] = "braintree";
    PaymentGatewayType["PayPal"] = "paypal";
    PaymentGatewayType["Paytm"] = "paytm";
    PaymentGatewayType["Razorpay"] = "razorpay";
    PaymentGatewayType["Paystack"] = "paystack";
    PaymentGatewayType["PayU"] = "payu";
    PaymentGatewayType["Instamojo"] = "instamojo";
    PaymentGatewayType["Flutterwave"] = "flutterwave";
    PaymentGatewayType["PayGate"] = "paygate";
    PaymentGatewayType["MIPS"] = "mips";
    PaymentGatewayType["MercadoPago"] = "mercadopago";
    PaymentGatewayType["AmazonPaymentServices"] = "amazon";
    PaymentGatewayType["MyTMoney"] = "mytmoney";
    PaymentGatewayType["WayForPay"] = "wayforpay";
    PaymentGatewayType["MyFatoorah"] = "MyFatoorah";
    PaymentGatewayType["SberBank"] = "SberBank";
    PaymentGatewayType["BinancePay"] = "BinancePay";
    PaymentGatewayType["OpenPix"] = "OpenPix";
    PaymentGatewayType["PayTR"] = "PayTR";
    PaymentGatewayType["CustomLink"] = "link";
    return PaymentGatewayType;
}({});
let AddPaytrGateway1706253836308 = class AddPaytrGateway1706253836308 {
    async up(queryRunner) {
        try {
            await queryRunner.changeColumn('payment_gateway', 'type', new _typeorm.TableColumn({
                name: 'type',
                type: 'enum',
                enum: Object.values(PaymentGatewayType)
            }));
        } catch (error) {
            console.error(error);
        }
    }
    async down(queryRunner) {}
};

//# sourceMappingURL=1706253836308-add-paytr-gateway.js.map