# px2rem-stzhang

According to one stylesheet, generate rem version and @1x, @2x and @3x stylesheet.

[![NPM version][npm-image]][npm-url]
[![Build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![Downloads][downloads-image]][downloads-url]

[npm-image]: https://img.shields.io/npm/v/px2rem.svg?style=flat-square
[npm-url]: https://npmjs.org/package/px2rem
[travis-image]: https://img.shields.io/travis/songsiqi/px2rem.svg?style=flat-square
[travis-url]: https://travis-ci.org/songsiqi/px2rem
[coveralls-image]: https://img.shields.io/coveralls/songsiqi/px2rem.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/songsiqi/px2rem
[downloads-image]: http://img.shields.io/npm/dm/px2rem.svg?style=flat-square
[downloads-url]: https://npmjs.org/package/px2rem

This set of tools contains:

* a CLI tool
* [gulp plugin](https://www.npmjs.com/package/gulp-px3rem)
* [webpack loader](https://www.npmjs.com/package/px2rem-loader-stzhang)
* [postcss plugin](https://www.npmjs.com/package/postcss-px2rem)

## Usage

The raw stylesheet only contains @2x style, and if you

* don't intend to transform the original value, eg: 1px border, add `/*no*/` after the declaration
* intend to use px by force，eg: font-size, add `/*px*/` after the declaration

**Attention: Dealing with SASS or LESS, only `/*...*/` comment can be used, in order to have the comments persisted**

### CLI tool

```
$ npm install -g px2rem-stzhang
```
```
$ px2rem -o build src/*.css
```

```
  Usage: px2rem [options] <file...>

  Options:

    -h, --help                      output usage information
    -V, --version                   output the version number
    -u, --remUnit [value]           set `rem` unit value (default: 75)
    -x, --threeVersion [value]      whether to generate @1x, @2x and @3x version stylesheet (default: false)
    -r, --remVersion [value]        whether to generate rem version stylesheet (default: true)
    -b, --baseDpr [value]           set base device pixel ratio (default: 2)
    -p, --remPrecision [value]      set rem value precision (default: 6)
    -o, --output [path]             the output file dirname
    -m, --minPixelValue [value]     set the minimum pixel value to replace. (default: 0)
```

### API

```javascript
var Px2rem = require('px2rem-stzhang');
var px2remIns = new Px2rem([config]);
var originCssText = '...';
var dpr = 2;
var newCssText = px2remIns.generateRem(originCssText); // generate rem version stylesheet
var newCssText = px2remIns.generateThree(originCssText, dpr); // generate @1x, @2x and @3x version stylesheet
```

### Example

#### Pre processing

One raw stylesheet: `test.css`

```css
.selector {
  width: 150px;
  height: 64px; /*px*/
  font-size: 28px; /*px*/
  border: 1px solid #ddd; /*no*/
}
```

#### After processing

Rem version: `test.debug.css`

```css
.selector {
  width: 2rem;
  border: 1px solid #ddd;
}
[data-dpr="1"] .selector {
  height: 32px;
  font-size: 14px;
}
[data-dpr="2"] .selector {
  height: 64px;
  font-size: 28px;
}
[data-dpr="3"] .selector {
  height: 96px;
  font-size: 42px;
}
```

@1x version: `test1x.debug.css`

```css
.selector {
  width: 75px;
  height: 32px;
  font-size: 14px;
  border: 1px solid #ddd;
}
```

@2x version: `test2x.debug.css`

```css
.selector {
  width: 150px;
  height: 64px;
  font-size: 28px;
  border: 1px solid #ddd;
}
```

@3x version: `test3x.debug.css`

```css
.selector {
  width: 225px;
  height: 96px;
  font-size: 42px;
  border: 1px solid #ddd;
}
```

## Technical proposal

comment hook + css parser

## Change Log

### 1.0.0

* 使用`schema-utils`对被输入的配置对象做数据结构验证。
* 添加新的配置项`minPixelValue`数字类型（缺省值为`0`）。
  * 当样式`px`值小于等于`minPixelValue`时，就绕过`px2rem`处理。
* 添加新配置项`blackList`对象类型
  * 数据结构：
    * `[{selector: string | RegExp; property: string | RegExp; type: 'AND' | 'OR'}, ...]`
    * `selector`与`property`若是字符串类型，遵循被包含匹配规则。也就是说，若被指定的`css selector`片段被包含，就认定为匹配。
    * `type`代表`selector`与`property`之间的逻辑运算关系：与 / 或。
  * 功能：满足【黑清单】过滤条的样式属性皆绕过`px2rem`处理。

全新配置对象如下：

```typescript
new Px2rem({
    baseDpr: 2,           // base device pixel ratio (default: 2)
    remUnit: 75,          // rem unit value (default: 75)
    remPrecision: 6,      // rem value precision (default: 6)
    forcePxComment: 'px', // force px comment (default: `px`)
    keepComment: 'no',    // no transform value comment (default: `no`)
    minPixelValue: 0,     // Set the minimum pixel value to replace.
    blackList: [/* {      The condition to ignore and leave as px.
        selector: string | RegExp,
        property: string | RegExp,
        type: 'AND' | 'OR'
    } */]
})
```

### 0.5.0

* Support Animation keyframes (no `/*px*/` comment).

### 0.4.2

* The generated [data-dpr] rules follow the origin rule, no longer placed at the end of the whole style sheet.
* Optimize 0px, do not generate 3 [data-dpr] rules.

### 0.3.1

* Change default remUnit to 75.
* Delete comment config.
* Don't generate @1x, @2x and @3x version stylesheet by default.

### 0.2.2

* Support media query.

### 0.1.8

* Fix cli option duplication bug.
* Fix regular expression bug.
* Fix common comments bug which affects rem transformation.

## License

MIT
