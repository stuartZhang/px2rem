'use strict';

const css = require('css');
const extend = require('extend');
const validate = require('schema-utils');
const blacklisted = require('./black-list');

const defaultConfig = {
    baseDpr: 2, // base device pixel ratio (default: 2)
    remUnit: 75, // rem unit value (default: 75)
    remPrecision: 6, // rem value precision (default: 6)
    forcePxComment: 'px', // force px comment (default: `px`)
    keepComment: 'no', // no transform value comment (default: `no`)
    minPixelValue: 0, // Set the minimum pixel value to replace.
    blackList: [/* { The condition to ignore and leave as px.
        selector: string | RegExp,
        property: string | RegExp,
        type: 'AND' | 'OR'
    } */]
};
const pxRegExp = /\b(\d+(\.\d+)?)px\b/u;

function Px2rem(options){
    validate(Px2rem.schema, options);
    this.config = {};
    extend(this.config, defaultConfig, options);
}
// generate @1x, @2x and @3x version stylesheet
Px2rem.prototype.generateThree = function(cssText, dpr){
    dpr = dpr || 2;
    const that = this;
    const {config} = that;
    const astObj = css.parse(cssText);

    function processRules(rules){
        for (let i = 0; i < rules.length; i++) {
            const rule = rules[i];
            if (rule.type === 'media') {
                processRules(rule.rules); // recursive invocation while dealing with media queries
                continue;
            } else if (rule.type === 'keyframes') {
                processRules(rule.keyframes); // recursive invocation while dealing with keyframes
                continue;
            } else if (rule.type !== 'rule' && rule.type !== 'keyframe') {
                continue;
            }
            const {declarations} = rule;
            for (let j = 0; j < declarations.length; j++) {
                const declaration = declarations[j];
                const selectors = declaration.selectors || declaration.parent.selectors;
                // need transform: declaration && has 'px'
                if (declaration.type === 'declaration' && pxRegExp.test(declaration.value) &&
                    !blacklisted(config.blackList, selectors, declaration.property)) {
                    const nextDeclaration = rule.declarations[j + 1];
                    if (nextDeclaration && nextDeclaration.type === 'comment') { // next next declaration is comment
                        if (nextDeclaration.comment.trim() === config.keepComment) { // no transform
                            declarations.splice(j + 1, 1); // delete corresponding comment
                            continue;
                        } else if (nextDeclaration.comment.trim() === config.forcePxComment) { // force px
                            declarations.splice(j + 1, 1); // delete corresponding comment
                        }
                    }
                    declaration.value = that._getCalcValue('px', declaration.value, dpr); // common transform
                }
            }
        }
    }

    processRules(astObj.stylesheet.rules);

    return css.stringify(astObj);
};
// generate rem version stylesheet
Px2rem.prototype.generateRem = function(cssText){
    const that = this;
    const {config} = that;
    const astObj = css.parse(cssText);

    function processRules(rules, noDealPx){ // FIXME: keyframes do not support `force px` comment
        for (let i = 0; i < rules.length; i++) {
            const rule = rules[i];
            if (rule.type === 'media') {
                processRules(rule.rules); // recursive invocation while dealing with media queries
                continue;
            } else if (rule.type === 'keyframes') {
                processRules(rule.keyframes, true); // recursive invocation while dealing with keyframes
                continue;
            } else if (rule.type !== 'rule' && rule.type !== 'keyframe') {
                continue;
            }
            const newRules = [];
            if (!noDealPx) {
                // generate 3 new rules which has [data-dpr]
                for (let dpr = 1; dpr <= 3; dpr++) {
                    const newRule = {};
                    newRule.type = rule.type;
                    newRule.selectors = rule.selectors.map(sel => `[data-dpr="${ dpr }"] ${ sel}`);
                    newRule.declarations = [];
                    newRules.push(newRule);
                }
            }
            const {declarations} = rule;
            for (let j = 0; j < declarations.length; j++) {
                const declaration = declarations[j];
                const selectors = declaration.selectors || declaration.parent.selectors;
                // need transform: declaration && has 'px'
                if (declaration.type === 'declaration' && pxRegExp.test(declaration.value) &&
                    !blacklisted(config.blackList, selectors, declaration.property)) {
                    const nextDeclaration = declarations[j + 1];
                    if (nextDeclaration && nextDeclaration.type === 'comment') { // next next declaration is comment
                        if (nextDeclaration.comment.trim() === config.forcePxComment) { // force px
                            // do not transform `0px`
                            if (declaration.value === '0px') {
                                declaration.value = '0';
                                declarations.splice(j + 1, 1); // delete corresponding comment
                                continue;
                            }
                            if (noDealPx) { // FIXME: keyframes do not support `force px` comment
                                declaration.value = that._getCalcValue('rem', declaration.value); // common transform
                                declarations.splice(j + 1, 1); // delete corresponding comment
                            } else {
                                // generate 3 new declarations and put them in the new rules which has [data-dpr]
                                for (let dpr = 1; dpr <= 3; dpr++) {
                                    const newDeclaration = {};
                                    extend(true, newDeclaration, declaration);
                                    newDeclaration.value = that._getCalcValue('px', newDeclaration.value, dpr);
                                    newRules[dpr - 1].declarations.push(newDeclaration);
                                }
                                declarations.splice(j, 2); // delete this rule and corresponding comment
                                j--;
                            }
                        } else if (nextDeclaration.comment.trim() === config.keepComment) { // no transform
                            declarations.splice(j + 1, 1); // delete corresponding comment
                        } else {
                            declaration.value = that._getCalcValue('rem', declaration.value); // common transform
                        }
                    } else {
                        declaration.value = that._getCalcValue('rem', declaration.value); // common transform
                    }
                }
            }
            // if the origin rule has no declarations, delete it
            if (!rules[i].declarations.length) {
                rules.splice(i, 1);
                i--;
            }
            if (!noDealPx) {
                // add the new rules which contain declarations that are forced to use px
                if (newRules[0].declarations.length) {
                    rules.splice(i + 1, 0, newRules[0], newRules[1], newRules[2]);
                    i += 3; // skip the added new rules
                }
            }
        }
    }
    processRules(astObj.stylesheet.rules);
    return css.stringify(astObj);
};
// get calculated value of px or rem
Px2rem.prototype._getCalcValue = function(type, value, dpr){
    const {config} = this;
    const pxGlobalRegExp = new RegExp(pxRegExp.source, 'gu');
    function getValue(val){
        val = parseFloat(val.toFixed(config.remPrecision)); // control decimal precision of the calculated value
        return val === 0 ? val : val + type;
    }
    return value.replace(pxGlobalRegExp, ($0, $1) => {
        if (type === 'px') {
            return getValue($1 * dpr / config.baseDpr);
        }
        if (parseFloat($1) <= config.minPixelValue) {
            return $0;
        }
        return getValue($1 / config.remUnit);
    });
};
Px2rem.schema = {
    title: 'px2rem-stzhang',
    description: '将【设计稿】内的`px`值换算成运行时的`rem`值',
    type: 'object',
    additionalProperties: false,
    properties: {
        baseDpr: {
            type: 'number',
            description: '设计稿宽度对应的 device pixel ratio。默认值 2。'
        },
        remUnit: {
            type: 'number',
            description: '设计稿宽度除以 10。默认值 75。'
        },
        remPrecision: {
            type: 'number',
            description: '`rem`值小数点儿后的精度位数。默认值 6。'
        },
        minPixelValue: {
            type: 'number',
            description: '当【设计稿】内的`px`值小于等于此值时，便放弃从`px`至`rem`的换算。默认值 0。'
        },
        blackList: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                properties: {
                    selector: {
                        anyOf: [{
                            type: 'string'
                        }, {
                            instanceof: 'RegExp'
                        }],
                        description: 'css 选择器，包含即生效'
                    },
                    property: {
                        anyOf: [{
                            type: 'string'
                        }, {
                            instanceof: 'RegExp'
                        }],
                        description: 'css 样式属性名，包含即生效'
                    },
                    type: {
                        enum: ['AND', 'OR'],
                        description: 'selector 与 property 过滤条件的与/或关系'
                    }
                }
            },
            uniqueItems: true,
            description: '被排除不参与`px2rem`换算的【过滤条件数组】。默认值 空'
        }
    }
};
module.exports = Px2rem;
