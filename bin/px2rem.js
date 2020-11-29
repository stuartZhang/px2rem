#!/usr/bin/env node

const program = require('commander');
const pkg = require('../package.json');
const Px2rem = require('../index');
const chalk = require('chalk');
const path = require('path');
const fs = require('fs-extra');

// string to variables of proper type（thanks to zepto）
function deserializeValue(value){
    let num;
    try {
        return value /* eslint-disable no-nested-ternary, multiline-ternary */
            ? value === 'true' || value === true || (
                value === 'false' || value === false ? false :
                    value === 'null' ? null :
                        !/^0/u.test(value) && !isNaN(num = Number(value)) ? num :
                            /^[[{]/u.test(value) ? JSON.parse(value) :
                                value)
            : value; /* eslint-enable no-nested-ternary, multiline-ternary */
    } catch (e) {
        return value;
    }
}
function saveFile(filePath, content){
    fs.createFileSync(filePath);
    fs.writeFileSync(filePath, content, {encoding: 'utf8'});
    console.log(chalk.green.bold('[Success]: ') + filePath);
}
program.version(pkg.version)
    .option('-u, --remUnit [value]', 'set `rem` unit value (default: 75)', 75)
    .option('-x, --threeVersion [value]', 'whether to generate @1x, @2x and @3x version stylesheet (default: false)', false)
    .option('-r, --remVersion [value]', 'whether to generate rem version stylesheet (default: true)', true)
    .option('-b, --baseDpr [value]', 'set base device pixel ratio (default: 2)', 2)
    .option('-p, --remPrecision [value]', 'set rem value precision (default: 6)', 6)
    .option('-m, --minPixelValue [value]', 'set the minimum pixel value to replace. (default: 0)', 0)
    .option('-o, --output [path]', 'the output file dirname')
    .parse(process.argv);
if (program.args.length) {
    const config = {
        remUnit: deserializeValue(program.remUnit),
        threeVersion: deserializeValue(program.threeVersion),
        remVersion: deserializeValue(program.remVersion),
        baseDpr: deserializeValue(program.baseDpr),
        remPrecision: deserializeValue(program.remPrecision),
        minPixelValue: deserializeValue(program.minPixelValue)
    };
    const px2remIns = new Px2rem(config);
    program.args.forEach(filePath => {
        if (path.extname(filePath) !== '.css') {
            return;
        }
        const cssText = fs.readFileSync(filePath, {encoding: 'utf8'});
        const outputPath = program.output || path.dirname(filePath);
        const fileName = path.basename(filePath);
        // generate @1x, @2x and @3x version stylesheet
        if (config.threeVersion) {
            for (let dpr = 1; dpr <= 3; dpr++) {
                const newCssText = px2remIns.generateThree(cssText, dpr);
                const newFileName = fileName.replace(/(.debug)?.css/u, `${dpr }x.debug.css`);
                const newFilepath = path.join(outputPath, newFileName);
                saveFile(newFilepath, newCssText);
            }
        }
        // generate rem version stylesheet
        if (config.remVersion) {
            const newCssText = px2remIns.generateRem(cssText);
            const newFileName = fileName.replace(/(.debug)?.css/u, '.debug.css');
            const newFilepath = path.join(outputPath, newFileName);
            saveFile(newFilepath, newCssText);
        }
    });
} else {
    console.log(`${chalk.yellow.bold('[Info]: ') }No files to process!`);
}
