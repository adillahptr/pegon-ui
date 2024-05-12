export type PlainRule = [string, string];
export type RegexRule = [RegExp, string];

export type Rule = PlainRule | RegexRule;

// like a cartesian product but for tl rules
// https://rosettacode.org/wiki/Cartesian_product_of_two_or_more_lists#Functional
export const ruleProduct = (
  leftRules: PlainRule[],
  rightRules: PlainRule[],
): PlainRule[] =>
  leftRules.flatMap<PlainRule>(([leftKey, leftVal]) =>
    rightRules.map<PlainRule>(([rightKey, rightVal]) => [
      leftKey.concat(rightKey),
      leftVal.concat(rightVal),
    ]),
  );

// from https://stackoverflow.com/a/6969486
// escapes any control sequences
export const escape = (toEscape: string) =>
  toEscape.replace(/[.*+?^${}()|[\]\\\-]/g, "\\$&");

export const isPlain = (rule: Rule): rule is PlainRule =>
  typeof rule[0] === "string";

export const prepareRules = (rules: Rule[]): Rule[] =>
  rules.map<Rule>((rule) =>
    isPlain(rule) ? [escape(rule[0]), rule[1]] : rule,
  );

export const chainRule = <T extends Rule>(...chainOfRules: T[][]): T[] =>
  chainOfRules.reduce<T[]>((acc, rules) => acc.concat(rules), [] as T[]);
export const wordDelimiters: string[] = [
  " ",
  ".",
  ",",
  "?",
  "!",
  '"',
  "(",
  ")",
  "-",
  ":",
  ";",
  "،",
  "؛",
  "؛",
  "؟",
];

export const wordDelimitingPatterns: string = escape(wordDelimiters.join(""));

// \b would fail when the characters are from different
// encoding blocks
export const asWordEnding = (rules: PlainRule[]): RegexRule[] =>
  prepareRules(rules).map<RegexRule>(([key, val]) => [
    new RegExp(`(${key})($|[${wordDelimitingPatterns}])`),
    `${val}$2`,
  ]);

export const asWordBeginning = (rules: PlainRule[]): RegexRule[] =>
  prepareRules(rules).map<RegexRule>(([key, val]) => [
    new RegExp(`(^|[${wordDelimitingPatterns}])(${key})`),
    `$1${val}`,
  ]);

export const asNotWordBeginning = (rules: PlainRule[]): RegexRule[] =>
  prepareRules(rules).map<RegexRule>(([key, val]) => [
    new RegExp(`([^${wordDelimitingPatterns}])(${key})`),
    `$1${val}`,
  ]);

export const asNotWordEnding = (rules: Rule[]): RegexRule[] =>
  prepareRules(rules).map<RegexRule>(([key, val]) => [
    new RegExp(`(${key})([^${wordDelimitingPatterns}])`),
    `${val}$2`,
  ]);

export const asSingleWord = (rules: PlainRule[]): RegexRule[] =>
  prepareRules(rules).map<RegexRule>(([key, val]) => [
    new RegExp(
      `(^|[${wordDelimitingPatterns}])(${key})($|[${wordDelimitingPatterns}])`,
    ),
    `$1${val}$3`,
  ]);

export const patternList = (patterns: Array<string>): RegExp =>
  new RegExp(patterns.join("|"));

export const between = (
  before: RegExp,
  [key, val]: PlainRule,
  after: RegExp,
): RegexRule => [
  new RegExp(`(?<=(${before.source}))${escape(key)}(?=(${after.source}))`),
  val,
];

export const after = (before: RegExp, [key, val]: PlainRule): RegexRule => [
  new RegExp(`(?<=(${before.source}))${escape(key)}`),
  val,
];

export const before = ([key, val]: PlainRule, after: RegExp): RegexRule => [
  new RegExp(`${escape(key)}(?=(${after.source}))`),
  val,
];

export const notAfter = (before: RegExp, [key, val]: PlainRule): RegexRule => [
  new RegExp(`(?<!${before.source})${escape(key)}`),
  val,
];

export const notBefore = ([key, val]: PlainRule, after: RegExp): RegexRule => [
  new RegExp(`${escape(key)}(?!(${after.source}))`),
  val,
];

export const debugTransliterate = (
  stringToTransliterate: string,
  translationMap: Rule[],
): string =>
  translationMap.reduce<string>((acc, [key, val]) => {
    const rule: RegExp = new RegExp(key, "g");
    console.log(
      `acc: ${acc}\nkey: ${key}\nval: ${val}\nmatched: ${rule.test(acc)}\n`,
    );
    return acc.replace(rule, val);
  }, stringToTransliterate.slice());

export const transliterate = (
  stringToTransliterate: string,
  translationMap: Rule[],
): string =>
  translationMap.reduce<string>(
    (acc, [key, val]) => acc.replace(new RegExp(key, "g"), val),
    stringToTransliterate.slice(),
  );

export const asInverse = (rules: PlainRule[]): PlainRule[] =>
  rules.map<PlainRule>(([key, val]) => [val, key]);

/*
  The basic idea for this function is to take several
  lists of transliteration rules and make it so that
  if a tl key on the nth list is the prefix of a key
  on the n+1th list, then the key of the n+1th list
  has that prefix replaced by the value of the
  key from the nth list, and that this propagates
  To see why you would want to do this, take a look at
  github.com/wikimedia/jquery.ime
*/

export const makeTransitive = (
  ...transliterationRules: PlainRule[][]
): PlainRule[] =>
  transliterationRules.reduceRight((acc, left) => {
    let newAcc: PlainRule[] = [];
    for (const [rightKey, rightVal] of acc) {
      let foundMatch = false;
      for (const [leftKey, leftVal] of left) {
        if (rightKey.startsWith(leftKey)) {
          foundMatch = true;
          newAcc.push([
            leftVal.concat(rightKey.slice(leftKey.length)),
            rightVal,
          ]);
        }
      }
      if (!foundMatch) newAcc.push([rightKey, rightVal]);
    }
    return newAcc.concat(left);
  });

export interface InputMethodEditor {
  readonly rules: Rule[];
  readonly inputEdit: (inputString: string) => string;
}

export const genericIMEInit = (imeScheme: Rule[]) => (): InputMethodEditor => ({
  rules: imeScheme,
  inputEdit: (inputString: string): string =>
    transliterate(inputString, imeScheme),
});
