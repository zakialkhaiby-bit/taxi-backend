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
    get PahappaSmsProvider1709710026943 () {
        return PahappaSmsProvider1709710026943;
    },
    get SMSProviderType () {
        return SMSProviderType;
    }
});
const _typeorm = require("typeorm");
var SMSProviderType = /*#__PURE__*/ function(SMSProviderType) {
    SMSProviderType["Firebase"] = "Firebase";
    SMSProviderType["Twilio"] = "Twilio";
    SMSProviderType["Plivo"] = "Plivo";
    SMSProviderType["Pahappa"] = "Pahappa";
    SMSProviderType["BroadNet"] = "BroadNet";
    SMSProviderType["Vonage"] = "Vonage";
    SMSProviderType["ClickSend"] = "ClickSend";
    SMSProviderType["Infobip"] = "Infobip";
    SMSProviderType["MessageBird"] = "MessageBird";
    SMSProviderType["VentisSMS"] = "VentisSMS";
    return SMSProviderType;
}({});
let PahappaSmsProvider1709710026943 = class PahappaSmsProvider1709710026943 {
    async up(queryRunner) {
        await queryRunner.changeColumn('sms_provider', 'type', new _typeorm.TableColumn({
            name: 'type',
            type: 'enum',
            enum: Object.values(SMSProviderType)
        }));
    }
    async down(queryRunner) {}
};

//# sourceMappingURL=1709710026943-pahappa-sms-provider.js.map