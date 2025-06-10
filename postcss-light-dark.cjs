const postcss = require('postcss');

module.exports = () => {
  return {
    postcssPlugin: 'postcss-light-dark',
    Once(root) {
      const lightRules = new Map();
      const darkRules = new Map();
      const defaultRules = new Map();

      root.walkRules((rule) => {
        const declarationsToLight = [];
        const declarationsToDark = [];
        const declarationsToDefault = [];

        rule.walkDecls((decl) => {
          if (!decl.value.includes('light-dark(')) return;

          const lightDarkRegex = /light-dark\(([^,]+?),\s*([^)]+?)\)/g;
          let lightValue = '';
          let darkValue = '';
          let lastIndex = 0;
          let match;

          while ((match = lightDarkRegex.exec(decl.value)) !== null) {
            lightValue += decl.value.slice(lastIndex, match.index) + match[1].trim();
            darkValue += decl.value.slice(lastIndex, match.index) + match[2].trim();
            lastIndex = match.index + match[0].length;
          }

          lightValue += decl.value.slice(lastIndex);
          darkValue += decl.value.slice(lastIndex);

          lightValue = cleanExtraBrackets(lightValue);
          darkValue = cleanExtraBrackets(darkValue);

          declarationsToLight.push(decl.clone({ value: lightValue }));
          declarationsToDark.push(decl.clone({ value: darkValue }));
          declarationsToDefault.push(decl.clone({ value: lightValue }));

          decl.remove();
        });

        if (declarationsToLight.length > 0) {
          const baseSelector = rule.selector;
          const lightSelector = `[data-theme="light"] ${baseSelector}`;
          const darkSelector = `[data-theme="dark"] ${baseSelector}`;

          if (!defaultRules.has(baseSelector)) {
            defaultRules.set(baseSelector, postcss.rule({ selector: baseSelector }));
          }
          declarationsToDefault.forEach((decl) => defaultRules.get(baseSelector).append(decl));

          if (!lightRules.has(lightSelector)) {
            lightRules.set(lightSelector, postcss.rule({ selector: lightSelector }));
          }
          declarationsToLight.forEach((decl) => lightRules.get(lightSelector).append(decl));

          if (!darkRules.has(darkSelector)) {
            darkRules.set(darkSelector, postcss.rule({ selector: darkSelector }));
          }
          declarationsToDark.forEach((decl) => darkRules.get(darkSelector).append(decl));
        }
      });

      defaultRules.forEach((rule) => root.append(rule));
      lightRules.forEach((rule) => root.append(rule));
      darkRules.forEach((rule) => root.append(rule));
    },
  };
};

module.exports.postcss = true;

function cleanExtraBrackets(value) {
  let cleaned = '';
  let stack = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (char === '(') {
      stack++;
    } else if (char === ')') {
      if (stack > 0) {
        stack--;
      } else {
        continue;
      }
    }
    cleaned += char;
  }
  return cleaned;
}
