module.exports = (blackList, selector, prop) => blackList.some(item => {
    const selectorValid = module.exports.selector([item.selector], selector);
    const propValid = module.exports.property([item.property], prop);
    if (item.type === 'AND') {
        return selectorValid && propValid;
    }
    if (item.type === 'OR') {
        return selectorValid || propValid;
    }
    return false;
});
module.exports.selector = (blacklist, selector) => {
    const isStr = typeof selector === 'string';
    const isArr = Array.isArray(selector);
    if (!isStr && !isArr) {
        return false;
    }
    return blacklist.some(regex => {
        if (typeof regex === 'string') {
            if (isStr) {
                return ~selector.indexOf(regex);
            }
            if (isArr) {
                return selector.some(s => ~s.indexOf(regex));
            }
            return false;
        }
        if (isStr) {
            return selector.match(regex);
        }
        if (isArr) {
            return selector.some(s => ~s.match(regex));
        }
        return false;
    });
};
module.exports.property = (blacklist, prop) => {
    if (typeof prop !== 'string') {
        return false;
    }
    return blacklist.some(regex => {
        if (typeof regex === 'string') {
            return ~prop.indexOf(regex);
        }
        return prop.match(regex);
    });
};
