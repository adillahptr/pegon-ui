import type { StemResult } from "./stemmer/stemmer";
import type { PlainRule, RegexRule, Rule, InputMethodEditor } from "../core"
import { Arab } from "../arab-common"
import { prepareRules,
         chainRule,
         ruleProduct,
         makeTransitive,
         transliterate,
         debugTransliterate,
         escape,
         isPlain,
         wordDelimitingPatterns,
         asWordBeginning,
         asWordEnding,
         asNotWordBeginning,
         asNotWordEnding,
         asSingleWord,
         asInverse
       } from "../core"

const enum Pegon {
    Alif = "\u0627",
    AlifWithHamzaAbove = "\u0623",
    AlifWithHamzaBelow = "\u0625",
    AlifWithMaddaAbove = "\u0622",
    AlifWithHamzaAboveThenWaw = "\u0623\u0648",
    AlifWithHamzaBelowThenYa = "\u0625\u064A",
    AlifWithHamzaAboveThenYa = "\u0623\u064A",
    AlifThenWaw = "\u0627\u0648",
    // Tambahan untuk huruf Arab
    AlefWasla = "\u0671",
    WawHamzaAbove= "\u0624",

    // Harakat
    Fatha = "\u064E",
    CurlyFatha = "\u08E4",
    MaddaAbove = "\u08E4",
    SuperscriptAlif = "\u0670", // khanjariah
    Kasra = "\u0650",
    Damma = "\u064F",
    // Tambahan harakat untuk huruf Arab
    Fathatan = "\u064B",
    Dhammatan = "\u064C",
    Kasratan = "\u064D",
    InvertedDhamma = "\u0657",
    SubAlef = "\u0656",
    OpenFathatan = "\u08F0",
    OpenDhammatan = "\u08F1",
    OpenKasratan= "\u08F2",

    SuperscriptAlifThenYa = "\u0670\u064A",
    FathaThenYa = "\u064E\u064A",
    FathaThenWaw = "\u064E\u0648",
    // Consonants
    Ba = "\u0628",
    Ya = "\u064A",
    Ta = "\u062A",
    Ca = "\u0686",
    Dal = "\u062F",
    Waw = "\u0648",
    Ra = "\u0631",
    Zain = "\u0632",
    Sin = "\u0633",
    Ain = "\u0639",
    Jim = "\u062C",
    Fa = "\u0641",
    Qaf = "\u0642",
    Peh = "\u06A4",
    Kaf = "\u0643",
    KafWithOneDotBelow = "\u08B4",
    KafWithThreeDotsBelow = "\u06AE",
    KafWithTwoDotsBelow = "\u{10EC4}",
    KafWithOneDotAbove = "\u06AC",
    KafWithThreeDotsAbove = "\u06AD",
    KehehWithOneDotAbove = "\u0762",
    KehehWithThreeDotsAbove = "\u0763",
    KehehWithTwoDotsBelow = "\u088D",
    KehehWithThreeDotsBelow = "\u063C",
    Lam = "\u0644",
    Mim = "\u0645",
    Nun = "\u0646",
    NunWithThreeDotsAbove = "\u06BD",
    Ha = "\u0647",
    ThaWithThreeDotsAbove = "\u069F",
    ThaWithOneDotBelow = "\u088B",
    ThaWithTwoDotsBelow = "\u{10EC3}",
    ThaWithThreeDotsBelow = "\u088C",
    Tsa = "\u062B",
    Ho = "\u062D",
    Kho = "\u062E",
    DalWithOneDotBelow = "\u068A",
    DalWithTwoDotsBelow = "\u{10EC2}",
    DalWithThreeDotsBelow = "\u08AE",
    DalWithThreeDotsAbove = "\u068E",
    Dzal = "\u0630",
    Syin = "\u0634",
    Shod = "\u0635",
    Dho = "\u0636",
    Tha = "\u0637",
    Zha = "\u0638",
    Ghain = "\u063A",
    Nga = "\u06A0",
    Nya = "\u06D1",
    FathaThenWawThenKasra = "\u064E\u0648\u0650",
    FathaThenYaThenKasra = "\u064E\u064A\u0650",
    TaMarbuta = "\u0629",
    YaWithHamzaAbove = "\u0626",
    WawWithHamzaAbove= "\u0624",
    FathaThenYaWithHamzaAbove = "\u064E\u0678",
    Maksura = "\u0649",
    Comma = "\u060C",
    Sukun = "\u0652",
    Sukun2 = "\u06E1",
    Tatwil = "\u0640",
    // Tambahan consonant Arab
    Hamza = "\u0621",
    //Tambahan
    Pepet = "\u08e4",
    Shadda = "\u0651",              //  ّ

    Space = " "
}

const punctuationRules: PlainRule[] = [
    [",", Pegon.Comma]
]
const marbutahRules: PlainRule[] = [
    ["t-", Pegon.TaMarbuta]
]

const sukunRules: PlainRule[] = [
    ["^.", Pegon.Sukun2],
    [".", Pegon.Sukun]
]

const pepetRules: PlainRule[] = [
    ["^e", Pegon.Pepet],
]

const monographVowelRules: PlainRule[] = [
    ["a", Pegon.Fatha + Pegon.Alif],
    // asumsi semua e tanpa diakritik taling
	["e", Pegon.Fatha + Pegon.Ya],
	["o", Pegon.Fatha + Pegon.Waw],
	["i", Pegon.Kasra + Pegon.Ya],
	["u", Pegon.Damma + Pegon.Waw],
    //second options of rules 4, 5, 6
    ['W', Pegon.Waw],
    ['A', Pegon.Alif],
    ['Y', Pegon.Ya],
]

const digraphVowelRules: PlainRule[] = [
    ["-a", Pegon.Alif],
    ["-i", Pegon.Ya],
    ["-u", Pegon.Waw],
    ["^e", Pegon.MaddaAbove],
    ["`a", Pegon.YaWithHamzaAbove + Pegon.Alif],
    ["`U", Pegon.WawHamzaAbove + Pegon.Damma],
    ["-^i", Pegon.Maksura],
    ["^i", Pegon.Kasra + Pegon.Maksura]
]

const monographVowelHarakatAtFirstAbjadRules: PlainRule[] = [
    ["e", Pegon.Alif + Pegon.Fatha + Pegon.Ya],
    ["o", Pegon.Alif + Pegon.Fatha + Pegon.Waw],
    ["a", Pegon.Alif + Pegon.Fatha],
    ["i", Pegon.Alif + Pegon.Kasra],
    ["u", Pegon.Alif + Pegon.Damma],    
]
    
const singleVowelRules: PlainRule[] =
    chainRule(
        digraphVowelRules,
        monographVowelHarakatAtFirstAbjadRules)

const singleEndingVowelRules: PlainRule[] = [
    ["-i", Pegon.Ya],
    ["i", Pegon.Kasra + Pegon.Ya]
]

const singleVowelAsWordEndingRules: RegexRule[] =
    asWordEnding(singleEndingVowelRules);

const longEndingAlifWawYaMaksuraRules: PlainRule[] = [
    ["u-a", Pegon.Damma + Pegon.Waw + Pegon.Alif],
    ["uW", Pegon.Damma + Pegon.Waw],
    ["^iY", Pegon.Kasra + Pegon.Maksura],
    ["i-a", Pegon.Kasra + Pegon.Ya + Pegon.Alif],
    ["i-u", Pegon.Kasra + Pegon.Ya + Pegon.Waw],
    ["iY", Pegon.Kasra + Pegon.Ya],
    ["a-O", Pegon.Fatha + Pegon.Alif + Pegon.Fatha + Pegon.Waw],
    ["aA", Pegon.Fatha + Pegon.Alif],
    ["e^i", Pegon.Fatha + Pegon.Maksura]
]

const beginningDigraphVowelRules: PlainRule[] = [
    ["^e", Pegon.Alif + Pegon.MaddaAbove],
]

const beginningMonographVowelRules: PlainRule[] = [
    ["`a", Pegon.AlifWithHamzaAbove],
    ["o", Pegon.Alif + Pegon.Fatha + Pegon.Waw],
    ["e", Pegon.Alif + Pegon.Fatha + Pegon.Ya],
    ["a", Pegon.Alif + Pegon.Fatha],
    ["i", Pegon.Alif + Pegon.Kasra + Pegon.Ya ],
    ["-i-Y", Pegon.Alif + Pegon.Kasra],
    ["-i", Pegon.Alif + Pegon.Ya ],
    ["-u", Pegon.Alif + Pegon.Waw],
    ["u", Pegon.Alif + Pegon.Damma + Pegon.Waw],
    ["-a", Pegon.Alif],
]

const beginningIForSoundIngRules: PlainRule[] = [
    ["in_g", Pegon.Alif + Pegon.Kasra + Pegon.Nga],
    ["-in_g", Pegon.Alif + Pegon.Nga],
    ["`in_g", Pegon.AlifWithHamzaBelow + Pegon.Kasra + Pegon.Nga],
    ["`i-n_g", Pegon.AlifWithHamzaBelow + Pegon.Nga],
]

const beginningSingleVowelRules: PlainRule[] =
    chainRule(
        beginningIForSoundIngRules,
        beginningDigraphVowelRules,
        beginningMonographVowelRules)

const beginningIForDeadConsonantRules: PlainRule[] = [
    ["i", Pegon.AlifWithHamzaBelow],
]

const beginningIForOpenConsonantRules: PlainRule[] = [
    ["i", Pegon.Alif + Pegon.Ya]
]

const doubleDigraphVowelRules: PlainRule[] = [
    ["a^e", Pegon.Fatha + Pegon.Alif +
        Pegon.YaWithHamzaAbove + Pegon.MaddaAbove],
    ["-a^e", Pegon.Alif +
        Pegon.YaWithHamzaAbove + Pegon.MaddaAbove],
    ["^ea", Pegon.MaddaAbove +
        Pegon.Ya + Pegon.Fatha + Pegon.Alif],
    ["^e-a", Pegon.MaddaAbove +
        Pegon.Ya + Pegon.Alif],
    ["i^e", Pegon.Kasra + Pegon.Ya +
        Pegon.YaWithHamzaAbove + Pegon.MaddaAbove],
    ["-i^e", Pegon.Ya +
        Pegon.YaWithHamzaAbove + Pegon.MaddaAbove],
    ["u^e", Pegon.Damma + Pegon.Waw +
        Pegon.YaWithHamzaAbove + Pegon.MaddaAbove],
    ["-u^e", Pegon.Waw +
        Pegon.YaWithHamzaAbove + Pegon.MaddaAbove],
    ["e^e", Pegon.Fatha + Pegon.Ya +
        Pegon.YaWithHamzaAbove + Pegon.MaddaAbove],
    ["o^e", Pegon.Fatha + Pegon.Waw +
        Pegon.YaWithHamzaAbove + Pegon.MaddaAbove],

]

const doubleMonographVowelRulesStandard: PlainRule[] = [
    ["aO", Pegon.Fatha + Pegon.Alif +
        Pegon.Alif + Pegon.Fatha + Pegon.Waw],
    ["aa-A", 
        Pegon.Fatha + Pegon.Alif + 
        Pegon.Alif + Pegon.Fatha],
    ["aa", 
        Pegon.Fatha + Pegon.Alif +
        Pegon.AlifWithHamzaAbove + Pegon.Fatha],
    ["-aa", 
        Pegon.Alif +
        Pegon.AlifWithHamzaAbove + Pegon.Fatha],
    ["a-a", 
        Pegon.Fatha + Pegon.Alif +
        Pegon.AlifWithHamzaAbove],
    ["-a-a", 
        Pegon.Alif + 
        Pegon.AlifWithHamzaAbove],
    ["ai", Pegon.Fatha + Pegon.Alif +
        Pegon.Ha + Pegon.Kasra + Pegon.Ya],
    ["a-i", Pegon.Fatha + Pegon.Alif +
        Pegon.Ha + Pegon.Ya],
    ["-ai", Pegon.Alif +
        Pegon.Ha + Pegon.Kasra + Pegon.Ya],
    ["-a-i", Pegon.Alif +
        Pegon.Ha + Pegon.Ya],
    ["-a-`i", Pegon.Alif +
        Pegon.YaWithHamzaAbove + Pegon.Ya],
    ["a`i", Pegon.Fatha + Pegon.Alif +
        Pegon.YaWithHamzaAbove + Pegon.Kasra + Pegon.Ya],
    ["au", Pegon.Fatha + Pegon.Alif +
        Pegon.Ha + Pegon.Damma + Pegon.Waw],
    ["a-u", Pegon.Fatha + Pegon.Alif +
        Pegon.Ha + Pegon.Waw],
    ["-au", Pegon.Alif +
        Pegon.Ha + Pegon.Damma + Pegon.Waw],
    ["-a-u", Pegon.Alif +
        Pegon.Ha + Pegon.Waw],
    ["a`u", Pegon.Fatha + Pegon.Alif +
        Pegon.Hamza + Pegon.Damma + Pegon.Waw],
    ["-a-`u", Pegon.Alif +
        Pegon.Hamza + Pegon.Waw],
    ["-a-U", Pegon.Alif +
        Pegon.Alif + Pegon.Waw],
    ["ae", Pegon.Fatha +
        Pegon.Ha + Pegon.Fatha + Pegon.Ya],
    ["-a`e", Pegon.Alif +
        Pegon.YaWithHamzaAbove + Pegon.Fatha + Pegon.Ya],
    ["-ae", Pegon.Alif +
        Pegon.Ha + Pegon.Fatha + Pegon.Ya],
    ["a`e", Pegon.Fatha + Pegon.Alif +
        Pegon.YaWithHamzaAbove + Pegon.Fatha + Pegon.Ya],
    ["ao", Pegon.Fatha + Pegon.Alif +
        Pegon.Ha + Pegon.Fatha + Pegon.Waw],
    ["-ao", Pegon.Alif +
        Pegon.Ha + Pegon.Fatha + Pegon.Waw],
    ["-aO", Pegon.Alif +
        Pegon.Alif + Pegon.Fatha + Pegon.Waw],
    ["ia", Pegon.Kasra + Pegon.Ya +
        Pegon.Ya + Pegon.Fatha + Pegon.Alif],
    ["i.a", Pegon.Kasra + Pegon.Ya + Pegon.Sukun +
        Pegon.Ya + Pegon.Fatha + Pegon.Alif],
    ["-ia", Pegon.Ya +
        Pegon.Ya + Pegon.Fatha + Pegon.Alif],
    ["i-a", Pegon.Kasra + Pegon.Ya +
        Pegon.Ya + Pegon.Alif],
    ["-i-a", Pegon.Ya +
        Pegon.Ya + Pegon.Alif],
    ["i.`a", Pegon.Kasra + Pegon.Ya + Pegon.Sukun +
        Pegon.YaWithHamzaAbove + Pegon.Alif],
    ["i`a", Pegon.Kasra + Pegon.Ya +
        Pegon.YaWithHamzaAbove + Pegon.Alif],
    ["-i-`a", Pegon.Ya +
        Pegon.YaWithHamzaAbove + Pegon.Alif],
    ["-i`a", Pegon.Ya +
        Pegon.YaWithHamzaAbove + Pegon.Fatha + Pegon.Alif],
    ["iu", Pegon.Kasra + Pegon.Ya +
        Pegon.Ya + Pegon.Damma + Pegon.Waw],
    ["i.u", Pegon.Kasra + Pegon.Ya + Pegon.Sukun +
        Pegon.Ya + Pegon.Damma + Pegon.Waw],
    ["-i-u", Pegon.Ya +
        Pegon.Ya + Pegon.Waw],
    ["i`u", Pegon.Kasra + Pegon.Ya +
        Pegon.YaWithHamzaAbove + Pegon.Waw],
    ["i.`u", Pegon.Kasra + Pegon.Ya + Pegon.Sukun +
        Pegon.YaWithHamzaAbove + Pegon.Damma + Pegon.Waw],
    ["-i-`u", Pegon.Ya +
        Pegon.YaWithHamzaAbove + Pegon.Waw],
    ["-i`u", Pegon.Ya +
        Pegon.YaWithHamzaAbove + Pegon.Damma + Pegon.Waw],
    ["i.o", Pegon.Kasra + Pegon.Ya + Pegon.Sukun +
        Pegon.Ya + Pegon.Fatha + Pegon.Waw],
    ["io", Pegon.Kasra + Pegon.Ya +
        Pegon.Ya + Pegon.Fatha + Pegon.Waw],
    ["-io", Pegon.Ya +
        Pegon.Ya + Pegon.Fatha + Pegon.Waw],
    ["i`o", Pegon.Kasra + Pegon.Ya +
        Pegon.YaWithHamzaAbove + Pegon.Fatha + Pegon.Waw],
    ["-i`o", Pegon.Ya +
        Pegon.YaWithHamzaAbove + Pegon.Fatha + Pegon.Waw],
    ["ua", Pegon.Damma + Pegon.Waw +
        Pegon.Waw + Pegon.Fatha + Pegon.Alif],
    ["u.a", Pegon.Damma + Pegon.Waw + Pegon.Sukun +
        Pegon.Waw + Pegon.Fatha + Pegon.Alif],
    ["-u-a", Pegon.Waw +
        Pegon.Waw + Pegon.Alif],
    ["u`a", Pegon.Damma + Pegon.Waw +
        Pegon.YaWithHamzaAbove + Pegon.Fatha + Pegon.Alif],
    ["u.`a", Pegon.Damma + Pegon.Waw + Pegon.Sukun +
        Pegon.YaWithHamzaAbove + Pegon.Fatha + Pegon.Alif],
    ["-u-`a", Pegon.Waw +
        Pegon.YaWithHamzaAbove + Pegon.Alif],
    ["ui", Pegon.Damma + Pegon.Waw +
        Pegon.Waw + Pegon.Kasra + Pegon.Ya],
    ["u.i", Pegon.Damma + Pegon.Waw + Pegon.Sukun +
        Pegon.Waw + Pegon.Kasra + Pegon.Ya],
    ["-u-i", Pegon.Waw +
        Pegon.Waw + Pegon.Ya],
    ["u`i", Pegon.Damma + Pegon.Waw +
        Pegon.YaWithHamzaAbove + Pegon.Kasra + Pegon.Ya],
    ["u.`i", Pegon.Damma + Pegon.Waw + Pegon.Sukun +
        Pegon.YaWithHamzaAbove + Pegon.Kasra + Pegon.Ya],
    ["-u-`i", Pegon.Waw +
        Pegon.YaWithHamzaAbove + Pegon.Ya],
    ["-uo", Pegon.Waw +
        Pegon.Waw + Pegon.Fatha + Pegon.Waw],
    ["uo", Pegon.Damma + Pegon.Waw +
        Pegon.Waw + Pegon.Fatha + Pegon.Waw],
    ["u.o", Pegon.Damma + Pegon.Waw + Pegon.Sukun +
        Pegon.Waw + Pegon.Fatha + Pegon.Waw],
    ["e-a", Pegon.Fatha + Pegon.Ya +
        Pegon.Ya + Pegon.Alif],
    ["e.-a", Pegon.Fatha + Pegon.Ya + Pegon.Sukun +
        Pegon.Ya + Pegon.Alif],
    ["ea", Pegon.Fatha + Pegon.Ya +
        Pegon.Ya + Pegon.Fatha + Pegon.Alif],
    ["e.a", Pegon.Fatha + Pegon.Ya + Pegon.Sukun +
        Pegon.Ya + Pegon.Fatha + Pegon.Alif],
    ["e-`a", Pegon.Fatha + Pegon.Ya +
        Pegon.YaWithHamzaAbove + Pegon.Alif],
    ["e.-`a", Pegon.Fatha + Pegon.Ya + Pegon.Sukun +
        Pegon.YaWithHamzaAbove + Pegon.Alif],
    ["e`a", Pegon.Fatha + Pegon.Ya +
        Pegon.YaWithHamzaAbove + Pegon.Fatha + Pegon.Alif],
    ["e.`a", Pegon.Fatha + Pegon.Ya + Pegon.Sukun +
        Pegon.YaWithHamzaAbove + Pegon.Fatha + Pegon.Alif],
    ["eo", Pegon.Fatha + Pegon.Ya +
        Pegon.Ya + Pegon.Fatha + Pegon.Waw],
    ["e.o", Pegon.Fatha + Pegon.Ya + Pegon.Sukun +
        Pegon.Ya + Pegon.Fatha + Pegon.Waw],
    ["e`o", Pegon.Fatha + Pegon.Ya +
        Pegon.YaWithHamzaAbove + Pegon.Fatha + Pegon.Waw],
    ["e.`o", Pegon.Fatha + Pegon.Ya + Pegon.Sukun +
        Pegon.YaWithHamzaAbove + Pegon.Fatha + Pegon.Waw],
]

const vowelsHarakatRules: PlainRule[] = [
    ["a-A", Pegon.Fatha],
    ["e", Pegon.Fatha + Pegon.Ya],
    ["i-Y", Pegon.Kasra ],
    ["o", Pegon.Fatha + Pegon.Waw],
    ["u-W", Pegon.Damma],
]

const doubleMonographVowelRulesSunda: PlainRule[] = [
    ...doubleMonographVowelRulesStandard,
    // Pegon Sunda
    ["e_u", Pegon.MaddaAbove +
        Pegon.Waw],
    ["a_i", Pegon.Fatha +
        Pegon.Ya +
        Pegon.Sukun],
    ["a_u", Pegon.Fatha +
        Pegon.Waw +
        Pegon.Sukun],
]
// TODO
var doubleMonographVowelRules: PlainRule[] = doubleMonographVowelRulesStandard;

const initiateDoubleMonographVowelRules = (lang: string) => {
    if(lang === "Sunda"){
        doubleMonographVowelRules = doubleMonographVowelRulesSunda;
    } else {
        doubleMonographVowelRules = doubleMonographVowelRulesStandard;
    }
}

const doubleMonographBeginningSyllableVowelRules: PlainRule[] = [
    ["iu",Pegon.Ya +
        Pegon.Ya +
        Pegon.Waw],
    ["ia", Pegon.Ya + 
        Pegon.Ya +
        Pegon.Alif],
    // ["eo", Pegon.Fatha +
    //     Pegon.Damma + Pegon.Waw + Pegon.Sukun],
    ["ia", Pegon.Kasra +
        Pegon.Ya +
        Pegon.Fatha + Pegon.Alif],
    ["eo", Pegon.Fatha + Pegon.Ya +
        Pegon.YaWithHamzaAbove +
        Pegon.Fatha + Pegon.Waw],
    ["io", Pegon.Ya +
        Pegon.YaWithHamzaAbove +
        Pegon.Fatha + Pegon.Waw],    
]

const alternateDoubleMonographVowelRules: PlainRule[] = [
    ["ae", Pegon.Fatha + Pegon.Alif +
        Pegon.YaWithHamzaAbove +
        Pegon.Fatha + Pegon.Ya + Pegon.Sukun],
    ["ai", Pegon.Alif +
        Pegon.YaWithHamzaAbove +
        Pegon.Ya],
    ["au", Pegon.Alif +
        Pegon.Alif +
        Pegon.Waw],
    ["iu", Pegon.Ya +
        Pegon.YaWithHamzaAbove +
        Pegon.Waw],
    ["ia", Pegon.Kasra + Pegon.Ya + Pegon.Sukun + Pegon.Sukun +
        Pegon.YaWithHamzaAbove +
        Pegon.Fatha + Pegon.Alif],
    ["ao", Pegon.Alif +
        Pegon.Ha +
        Pegon.Fatha + Pegon.Waw],
    ["aO", Pegon.Alif +
        Pegon.Alif +
        Pegon.Fatha + Pegon.Waw],
]

const alternateDoubleMonographBeginningSyllableVowelRules: PlainRule[] = [
    ["iu", Pegon.Kasra +
        Pegon.YaWithHamzaAbove +
        Pegon.Damma + Pegon.Waw + Pegon.Sukun],
    ["ia", Pegon.Kasra +
        Pegon.YaWithHamzaAbove +
        Pegon.Fatha + Pegon.Alif],
]

const doubleVowelRules: PlainRule[] =
    chainRule(
        doubleDigraphVowelRules,
        doubleMonographVowelRules)

const doubleEndingVowelRules: PlainRule[] = [
    ["ae", Pegon.Alif +
        Pegon.Ha +
        Pegon.Fatha + Pegon.Ya],
    ["oa", Pegon.Fatha + Pegon.Waw +
        Pegon.Ha +
        Pegon.Alif],
]

const alternateDoubleEndingVowelRules: PlainRule[] = [
    ["ae", Pegon.Fatha + Pegon.Alif +
        Pegon.YaWithHamzaAbove +
        Pegon.Fatha + Pegon.Maksura + Pegon.Sukun],
    ["ai", Pegon.Fatha + Pegon.Alif +
        Pegon.YaWithHamzaAbove +
        Pegon.Kasra + Pegon.Maksura + Pegon.Sukun],
]

const doubleVowelAsWordEndingRules: RegexRule [] =
    asWordEnding(doubleEndingVowelRules);

const beginningSingleVowelAsWordBeginningRules: RegexRule[] =
    asWordBeginning(beginningSingleVowelRules);

const monographConsonantRules: PlainRule[] = [
    ["b", Pegon.Ba],
    ["t", Pegon.Ta],
    ["c", Pegon.Ca],
    ["d", Pegon.Dal],
    ["r", Pegon.Ra],
    ["z", Pegon.Zain],
    ["s", Pegon.Sin],
    ["'", Pegon.Ain],
    ["j", Pegon.Jim],
    ["f", Pegon.Fa],
    ["q", Pegon.Qaf],
    ["p", Pegon.Peh],
    ["v", Pegon.Peh],
    ["k", Pegon.Kaf],
    ["G", Pegon.KafWithOneDotBelow],
    ["g", Pegon.KafWithThreeDotsBelow],
    ["l", Pegon.Lam],
    ["m", Pegon.Mim],
    ["n", Pegon.Nun],
    ["h", Pegon.Ha],
    ["w", Pegon.Waw],
    ["y", Pegon.Ya],
    // Tambahan konsonan Arab
    ["`", Pegon.Hamza],
    ["`", Pegon.YaWithHamzaAbove],
    ["`", Pegon.WawWithHamzaAbove],
]

const digraphConsonantRules: PlainRule[] = [
    // special combination using diacritics, may drop
    // ["t_h", Pegon.ThaWithOneDotBelow],
    // the one in id.wikipedia/wiki/Abjad_Pegon
    ["t_h", Pegon.ThaWithThreeDotsBelow],
    ["T_h", Pegon.ThaWithOneDotBelow],
    ["t_H", Pegon.ThaWithTwoDotsBelow],
    ["t_s", Pegon.Tsa],
    ["h_h", Pegon.Ho],
    ["k_h", Pegon.Kho],
    ["d_H", Pegon.DalWithOneDotBelow],
    ["d_h", Pegon.DalWithThreeDotsBelow],
    ["D_h", Pegon.DalWithTwoDotsBelow],
    ["d_h", Pegon.DalWithThreeDotsAbove],
    ["d_z", Pegon.Dzal],
    ["s_y", Pegon.Syin],
    ["s_h", Pegon.Shod],
    ["d_H", Pegon.Dho],
    ["t_t", Pegon.Tha],
    ["z_h", Pegon.Zha],
    ["g_h", Pegon.Ghain],
    ["n_g", Pegon.Nga],
    ["n_y", Pegon.Nya],
    ["n_Y", Pegon.NunWithThreeDotsAbove],
    ["g_1", Pegon.KafWithOneDotBelow],
    ["g_2", Pegon.KafWithOneDotAbove],
    ["g_3", Pegon.KafWithThreeDotsAbove],
    ["g_4", Pegon.KafWithTwoDotsBelow],
    ["g_5", Pegon.KehehWithOneDotAbove],
    ["g_6", Pegon.KehehWithThreeDotsAbove],
    ["g_7", Pegon.KehehWithTwoDotsBelow],
    ["g_8", Pegon.KehehWithThreeDotsBelow],
];

//const doubleSameConsonantRules: PlainRule[] = 
//    monographConsonantRules.map<PlainRule>(([key, val]) => [key.concat(key), val.concat(Pegon.Shadda)])

const consonantRules: PlainRule[] = chainRule(
    digraphConsonantRules,
    monographConsonantRules)

const withSukun = (rules: PlainRule[]): PlainRule[] =>
    rules.map<PlainRule>(([key, val]) => [key, val.concat(Pegon.Sukun)])

const deadDigraphConsonantRules: PlainRule[] =
    digraphConsonantRules

const deadMonographConsonantRules: PlainRule[] =
    monographConsonantRules

const deadConsonantRules: PlainRule[] = consonantRules

const doubleSameConsonantRules: PlainRule[] =
    consonantRules.map<PlainRule>(([key, val]) => [key.concat(key), val.concat(Pegon.Shadda)])

const shaddaRules: PlainRule[] =
    chainRule(
        ruleProduct(doubleSameConsonantRules, longEndingAlifWawYaMaksuraRules),
        ruleProduct(doubleSameConsonantRules, digraphVowelRules),
        ruleProduct(doubleSameConsonantRules, vowelsHarakatRules))

// TODO
const ruleProductDoubleMonographConsonant = (
    leftRules: PlainRule[],
    rightRules: PlainRule[],
  ): PlainRule[] =>
    leftRules.flatMap<PlainRule>(([leftKey, leftVal]) =>
      rightRules.map<PlainRule>(([rightKey, rightVal]) => [
        leftKey.concat('a'.concat(rightKey)),
        leftVal.concat(rightVal),
      ]),
    );
const doubleMonographConsonantRules: PlainRule[] = 
    ruleProductDoubleMonographConsonant(consonantRules, consonantRules)

const singleVowelSyllableRules: PlainRule[] =
    chainRule(
        ruleProduct(consonantRules, vowelsHarakatRules),
        ruleProduct(consonantRules, digraphVowelRules),
        ruleProduct(consonantRules, monographVowelRules))

const doubleVowelSyllableRules: PlainRule[] =
        ruleProduct(consonantRules, doubleVowelRules)

const singleVowelSyllableAsWordEndingRules: RegexRule[] =
    asWordEnding(ruleProduct(consonantRules, singleEndingVowelRules))

const doubleVowelSyllableAsWordEndingRules: RegexRule[] = 
    asWordEnding(ruleProduct(consonantRules, doubleEndingVowelRules))

const prefixRules: PlainRule[] = [
    ["dak", Pegon.Dal + Pegon.Fatha + Pegon.Alif + Pegon.Kaf],
    ["d-ak", Pegon.Dal + Pegon.Alif + Pegon.Kaf],
    ["di", Pegon.Dal + Pegon.Kasra + Pegon.Ya],
    ["d-i", Pegon.Dal + Pegon.Ya]
]

const specialPrepositionRules: PlainRule[] = [
    ["di", Pegon.Dal + Pegon.Kasra + Pegon.Maksura + Pegon.Sukun]
]

const prefixWithSpaceRules: PlainRule[] =
    prefixRules.map(([key, val]) => [key, val.concat(Pegon.Space)])

const specialPrepositionAsSingleWordsRule: RegexRule[] =
    asSingleWord(specialPrepositionRules)

const prefixWithBeginningVowelRules: PlainRule[] =
    ruleProduct(prefixWithSpaceRules,
                beginningSingleVowelRules)

const prefixWithBeginningVowelAsWordBeginningRules: RegexRule[] =
    asWordBeginning(prefixWithBeginningVowelRules)

const prefixAsWordBeginningRules: RegexRule[] = asWordBeginning(prefixRules)

const latinConsonants: string[] = consonantRules.map<string>(([key, val]) => key)
const pegonConsonants: string[] = consonantRules.map<string>(([key, val]) => val)
const latinVowels: string[] = singleVowelRules.map<string>(([key, val]) => key)

const consonantExceptions: string[] = []

const asWordBeginningFollowedByOpenConsonant =
    (rules: PlainRule[]): RegexRule[] =>
    rules.map(([key, val]) =>
            [new RegExp(`(^|[${wordDelimitingPatterns}])(${key})($latinConsonants.join("|")($latinVowels.join("|")`),
             `$1${val}$2$3`])

const doubleMonographVowelBeginningSyllableRules: PlainRule[] =
    ruleProduct(consonantRules,
                doubleMonographBeginningSyllableVowelRules)

const alternateDoubleMonographVowelBeginningSyllableRules: PlainRule[] =
    ruleProduct(consonantRules,
                alternateDoubleMonographBeginningSyllableVowelRules)

const doubleMonographVowelAsBeginningSyllableRules: RegexRule[] =
    asWordBeginning(doubleMonographVowelBeginningSyllableRules)

const aForClosedSyllable: PlainRule[] = [
    ["-aA", Pegon.Alif],
    ["-a", ""],
    ["aA", Pegon.Fatha + Pegon.Alif],
    ["a", Pegon.Fatha],
]

const closedSyllable = (rules: PlainRule[]): RegexRule[] =>
    prepareRules(rules).map<RegexRule>(([key, val]) =>
        [new RegExp(`(${key})(?!([_aiueo^\`WAIUEOY]|-a|-u|-i))`), `${val}`])

const consonantForClosedSyllableWithSoundA: PlainRule[] =
    consonantRules.filter(([k,v]) => k !== "w" && k !== "y")

const closedSyllableWithSoundA: RegexRule[] =
    ruleProduct(
        ruleProduct(consonantRules,aForClosedSyllable).filter(([k,v]) => k !== "w-a" && k !== "y-a"), 
        consonantForClosedSyllableWithSoundA)

const closedSyllableWithSoundARules: RegexRule[] =
    closedSyllable(closedSyllableWithSoundA)

const fathaHarakatForWawAndYa: PlainRule[] = [
    ["a-Aw", Pegon.Fatha + Pegon.Waw],
    ["a-Ay", Pegon.Fatha + Pegon.Ya],
]

const fathaHarakatForWawAndYaRules: PlainRule[] = [
    ruleProduct(consonantRules, 
        chainRule(
            ruleProduct(fathaHarakatForWawAndYa, vowelsHarakatRules),
            ruleProduct(fathaHarakatForWawAndYa, digraphVowelRules),
            ruleProduct(fathaHarakatForWawAndYa, monographVowelRules),
        )
    )
]

const indonesianPrefixesRules: PlainRule[] = [
    ["di", Pegon.Dal + Pegon.Kasra + Pegon.Ya],
    ["d-i", Pegon.Dal + Pegon.Ya],
    ["k^e", Pegon.Kaf + Pegon.MaddaAbove],
    ["s^e", Pegon.Sin + Pegon.MaddaAbove],
    ["b^er", Pegon.Ba + Pegon.MaddaAbove + Pegon.Ra],
    ["b^e", Pegon.Ba + Pegon.MaddaAbove],
    ["t^er", Pegon.Ta + Pegon.MaddaAbove + Pegon.Ra],
    ["t^e", Pegon.Ta + Pegon.MaddaAbove],
    ["m^em", Pegon.Mim + Pegon.MaddaAbove + Pegon.Mim],
    ["m^en_g", Pegon.Mim + Pegon.MaddaAbove + Pegon.Nga],
    ["m^en", Pegon.Mim + Pegon.MaddaAbove + Pegon.Nun],
    ["m^e", Pegon.Mim + Pegon.MaddaAbove],
    ["p^er", Pegon.Peh + Pegon.MaddaAbove + Pegon.Ra],
    ["p^em", Pegon.Peh + Pegon.MaddaAbove + Pegon.Mim],
    ["p^en_g", Pegon.Peh + Pegon.MaddaAbove + Pegon.Nga],
    ["p^en", Pegon.Peh + Pegon.MaddaAbove + Pegon.Nun],
    ["p^e", Pegon.Peh + Pegon.MaddaAbove],
]

const indonesianPrefixesRulesAlt: PlainRule[] = [
    ["di", Pegon.Dal + Pegon.Kasra + Pegon.Ya + Pegon.Space],
    ["d-i", Pegon.Dal + Pegon.Ya + Pegon.Space],
]

const transliterateIndonesianPrefixes = (prefix: string, baseWord: string): string => {
    if (baseWord.match(/^[aiu\^eo]/) && prefix.match(/^(d-i|di)/)) {
        return transliterate(prefix, prepareRules(indonesianPrefixesRulesAlt));
    }

    return transliterate(prefix, prepareRules(indonesianPrefixesRules));
}

const indonesianSuffixes: PlainRule[] = [
    ["ku", Pegon.Kaf + Pegon.Waw],
    ["mu", Pegon.Mim + Pegon.Waw],
    ["n_ya", Pegon.Nya + Pegon.Alif],
    ["lah", Pegon.Lam + Pegon.Fatha + Pegon.Ha],
    ["kah", Pegon.Kaf + Pegon.Fatha + Pegon.Ha],
    ["tah", Pegon.Ta + Pegon.Fatha + Pegon.Ha],
    ["pun", Pegon.Peh + Pegon.Waw + Pegon.Nun],
    ["kan", Pegon.Kaf + Pegon.Fatha + Pegon.Nun],
]
const suffixAnForBaseWordWithEndingA: PlainRule[] = [
    
    ["an", Pegon.AlifWithHamzaAbove + Pegon.Nun],
]

const suffixAn: PlainRule[] = [
    ["an", Pegon.Alif + Pegon.Nun],
]

const indonesianSuffixesForBaseWordWithEndingA: PlainRule[] =
    chainRule(indonesianSuffixes, 
        suffixAnForBaseWordWithEndingA)

const indonesianSuffixesForRegularBaseWord: PlainRule[] =
    chainRule(indonesianSuffixes, 
        suffixAn)

const transliterateIndonesianSuffixes =
    (suffix: string, baseWord: string) => 
        baseWord[baseWord.length-1] === 'a' ?
        transliterate(suffix, prepareRules(indonesianSuffixesForBaseWordWithEndingA)) :
        transliterate(suffix, prepareRules(indonesianSuffixesForRegularBaseWord));

const transliterateISuffix = (baseWord: string) => {
        if (baseWord[baseWord.length-1] === 'a')
            return Pegon.Ha + Pegon.Ya
        else if (baseWord[baseWord.length-1].match(/^[iueo]/))
            return Pegon.Alif + Pegon.Ya
        else
            return Pegon.Ya
}

const baseWordLastLetterVowel: PlainRule[] = [
    ["a", ""],
    ["i", ""],
    ["u", ""],
    ["e", ""],
    ["o", ""],
    ["W", ""],
    ["A", ""],
    ["Y", ""],
]

const suffixFirstLetterVowel: PlainRule[] = [
    ["e_u", Pegon.Alif + Pegon.MaddaAbove + Pegon.Waw],
    ["a_i", Pegon.Alif + Pegon.Fatha + Pegon.Ya + Pegon.Sukun],
    ["a_u", Pegon.Alif + Pegon.Fatha + Pegon.Waw + Pegon.Sukun],
    ["a", Pegon.Alif],
    ["i", Pegon.Ya],
    ["e", Pegon.Alif + Pegon.Fatha + Pegon.Ya],
]

const doubleVowelForSuffixRules: PlainRule [] = [
    ["ae", Pegon.Ha + Pegon.Fatha + Pegon.Ya],
    ["ai", Pegon.Ha + Pegon.Ya],
    ["Ya", Pegon.Ya + Pegon.Alif],
    ["aa", Pegon.AlifWithHamzaAbove],
]

const baseWordLastLetterVowelSuffixFirstLetterVowel: PlainRule[] = 
    chainRule(doubleVowelForSuffixRules,
        ruleProduct(baseWordLastLetterVowel, suffixFirstLetterVowel))

const doubleEndingVowelForSuffixRules: PlainRule[] = [
    ["ae", Pegon.Ha + Pegon.Fatha + Pegon.Ya],
    ["ai", Pegon.Ha + Pegon.Ya],
    ["e-a", Pegon.Ya + Pegon.Alif],
    ["ea", Pegon.Ya + Pegon.Fatha + Pegon.Alif],
    ["^ea", Pegon.Ya + Pegon.Ya + Pegon.Alif],
    ["a-a", Pegon.Ha + Pegon.Alif],
    ["aa", Pegon.Ha + Pegon.Fatha + Pegon.Alif],
    ["o-a", Pegon.Ha + Pegon.Alif],
    ["oa", Pegon.Ha + Pegon.Fatha + Pegon.Alif],
    ["u-a", Pegon.Waw + Pegon.Alif],
    ["ua", Pegon.Waw + Pegon.Fatha + Pegon.Alif],
    ["i-a", Pegon.Ya + Pegon.Alif],
    ["ia", Pegon.Ya + Pegon.Fatha + Pegon.Alif],
]

const jawaPrefixesRules: PlainRule[] = [
    ["di", Pegon.Dal + Pegon.Kasra + Pegon.Ya],
    ["d-i", Pegon.Dal + Pegon.Ya],
    ["su", Pegon.Sin + Pegon.Waw],
    ["pri", Pegon.Peh + Pegon.Ra + Pegon.Ya],
    ["wi", Pegon.Waw + Pegon.Ya],
    ["k^e", Pegon.Kaf + Pegon.MaddaAbove],
    ["sa", Pegon.Sin + Pegon.Fatha + Pegon.Alif],
    ["s-a", Pegon.Sin + Pegon.Alif],
    ["dak", Pegon.Dal + Pegon.Fatha + Pegon.Kaf],
    ["d-ak", Pegon.Dal + Pegon.Kaf],
    ["da", Pegon.Dal + Pegon.Fatha + Pegon.Alif],
    ["tar", Pegon.Ta + Pegon.Fatha + Pegon.Ra],
    ["tak", Pegon.Ta + Pegon.Fatha + Pegon.Kaf],
    ["ta", Pegon.Ta + Pegon.Fatha + Pegon.Alif],
    ["kok", Pegon.Kaf + Pegon.Fatha + Pegon.Waw + Pegon.Kaf],
    ["ko", Pegon.Kaf + Pegon.Fatha + Pegon.Waw],
    ["tok", Pegon.Ta + Pegon.Fatha + Pegon.Waw + Pegon.Kaf],
    ["to", Pegon.Ta + Pegon.Fatha + Pegon.Waw],
    ["pi", Pegon.Peh + Pegon.Ya],
    ["kami", Pegon.Kaf + Pegon.Fatha + Pegon.Alif + Pegon.Mim + Pegon.Ya],
    ["kapi", Pegon.Kaf + Pegon.Fatha + Pegon.Alif + Pegon.Peh + Pegon.Ya],
    ["kuma", Pegon.Kaf + Pegon.Waw + Pegon.Mim + Pegon.Fatha],
    ["ka", Pegon.Kaf + Pegon.Fatha + Pegon.Alif],
    ["k-a", Pegon.Kaf + Pegon.Alif],
    ["pra", Pegon.Peh + Pegon.Ra + Pegon.Fatha + Pegon.Alif],
    ["pan_g", Pegon.Peh + Pegon.Fatha + Pegon.Nga],
    ["pan", Pegon.Peh + Pegon.Fatha + Pegon.Nun],
    ["pam", Pegon.Peh + Pegon.Fatha + Pegon.Mim],
    ["pa", Pegon.Peh + Pegon.Fatha + Pegon.Alif],
    ["man_g", Pegon.Mim + Pegon.Fatha + Pegon.Nga],
    ["man", Pegon.Mim + Pegon.Fatha + Pegon.Nun],
    ["mam", Pegon.Mim + Pegon.Fatha + Pegon.Mim],
    ["ma", Pegon.Mim + Pegon.Fatha + Pegon.Alif],
    ["m^en_g", Pegon.Mim + Pegon.MaddaAbove + Pegon.Nga],
    ["m^en", Pegon.Mim + Pegon.MaddaAbove + Pegon.Nun],
    ["m^em", Pegon.Mim + Pegon.MaddaAbove + Pegon.Mim],
    ["m^e", Pegon.Mim + Pegon.MaddaAbove],
    ["an_g", Pegon.Ha + Pegon.Fatha + Pegon.Nga],
    ["-am", Pegon.Ha + Pegon.Mim],
    ["am", Pegon.Ha + Pegon.Fatha + Pegon.Mim],
    ["an", Pegon.Ha + Pegon.Fatha + Pegon.Nun],
    ["a", Pegon.Ha + Pegon.Fatha],
    ["den", Pegon.Dal + Pegon.Fatha + Pegon.Ya + Pegon.Nun + Pegon.Space],
]

const jawaSuffixesRules: PlainRule[] = [
    ["i", Pegon.Ya],
    ["ake", Pegon.Alif + Pegon.Kaf + Pegon.Fatha + Pegon.Ya],
    ["en", Pegon.Fatha + Pegon.Ya + Pegon.Nun],
    ["na", Pegon.Nun + Pegon.Alif],
    ["ana", Pegon.Alif + Pegon.Nun + Pegon.Alif],
    ["an", Pegon.Alif + Pegon.Nun],
    ["e", Pegon.Fatha + Pegon.Ya],
    ["a", Pegon.Alif],
]

const jawaPrefixesRulesAlt: PlainRule[] = [
    ["di", Pegon.Dal + Pegon.Kasra + Pegon.Ya + Pegon.Space],
    ["d-i", Pegon.Dal + Pegon.Ya + Pegon.Space],
    ["dak", Pegon.Dal + Pegon.Fatha + Pegon.Kaf + Pegon.Space],
    ["d-ak", Pegon.Dal + Pegon.Kaf + Pegon.Space],
]

const transliterateJawaPrefixes = (prefix: string, baseWord: string): string => {
    if (baseWord.match(/^[aiu\^eo]/) && prefix.match(/^(d-ak|dak|d-i|di)/)) {
        return transliterate(prefix, prepareRules(jawaPrefixesRulesAlt));
    }

    return transliterate(prefix, prepareRules(jawaPrefixesRules));
}

const transliterateJawaSuffixesVowel = (suffix: string, baseWord: string): string => {
    const jawaSuffixesRulesAlt: PlainRule[] = [
        ["na", Pegon.Nun + Pegon.Alif],
        ["ke", Pegon.Kaf + Pegon.Fatha + Pegon.Ya],
        ["n", Pegon.Nun],
    ]

    const jawaSuffixesVowelRules: Rule[] =
            prepareRules(chainRule(
                ruleProduct(baseWordLastLetterVowelSuffixFirstLetterVowel, jawaSuffixesRulesAlt),
                doubleEndingVowelForSuffixRules,
                baseWordLastLetterVowelSuffixFirstLetterVowel))


    return transliterate(baseWord[baseWord.length-1]+suffix, jawaSuffixesVowelRules)
}

const transliterateJawaSuffixes = (suffix: string, baseWord: string): string => {
    if (baseWord[baseWord.length-1].match(/^[aiueoWAY]/) && suffix[0].match(/^[-aiueo]/)) {
        return transliterateJawaSuffixesVowel(suffix, baseWord)
    }

    return transliterate(suffix, prepareRules(jawaSuffixesRules))
}

const maduraPrefixesRules: PlainRule[] = [
    ["koma", Pegon.Kaf + Pegon.Fatha + Pegon.Waw + Pegon.Mim + Pegon.Fatha + Pegon.Alif],
    ["par", Pegon.Peh + Pegon.Fatha + Pegon.Ra],
    ["pe", Pegon.Peh + Pegon.Fatha + Pegon.Ya],
    ["pan_g", Pegon.Peh + Pegon.Fatha + Pegon.Nga],
    ["pam", Pegon.Peh + Pegon.Fatha + Pegon.Mim],
    ["pan", Pegon.Peh + Pegon.Fatha + Pegon.Nun],
    ["pa", Pegon.Peh + Pegon.Fatha],
    ["sa", Pegon.Sin + Pegon.Fatha + Pegon.Alif],
    ["s-a", Pegon.Sin + Pegon.Alif],
    ["ka", Pegon.Kaf + Pegon.Fatha + Pegon.Alif],
    ["k-a", Pegon.Kaf + Pegon.Alif],
    ["ta", Pegon.Ta + Pegon.Fatha + Pegon.Alif],
    ["e", Pegon.Alif + Pegon.Fatha + Pegon.Ya],
    ["a", Pegon.Ha + Pegon.Fatha]
]

const maduraSuffixesRules: PlainRule[] = [
    ["en", Pegon.Fatha + Pegon.Ya + Pegon.Nun],
    ["ag_hi", Pegon.Alif + Pegon.Ghain + Pegon.Ya],
    ["an", Pegon.Alif + Pegon.Nun],
    ["e", Pegon.Fatha + Pegon.Ya],
    ["a", Pegon.Alif],
]

const transliterateMaduraPrefixes = (prefix: string): string =>
        transliterate(prefix, prepareRules(maduraPrefixesRules))

const transliterateMaduraSuffixesVowel = (suffix: string, baseWord: string): string => {
    const maduraSuffixesRulesAlt: PlainRule[] = [
        ["n", Pegon.Nun],
        ["g_hi", Pegon.Ghain + Pegon.Ya],
    ]

    const maduraSuffixesVowelRules: Rule[] =
            prepareRules(chainRule(
                ruleProduct(baseWordLastLetterVowelSuffixFirstLetterVowel, maduraSuffixesRulesAlt),
                doubleEndingVowelForSuffixRules,
                baseWordLastLetterVowelSuffixFirstLetterVowel))


    return transliterate(baseWord[baseWord.length-1]+suffix, maduraSuffixesVowelRules)
}

const transliterateMaduraSuffixes = (suffix: string, baseWord: string): string => {
    if (baseWord[baseWord.length-1].match(/^[aiueoWAY]/) && suffix[0].match(/^[aiueo]/)) {
        return transliterateMaduraSuffixesVowel(suffix, baseWord)
    }

    return transliterate(suffix, prepareRules(maduraSuffixesRules))
}

const sundaPrefixesRules: PlainRule[] = [
    ["pan_g", Pegon.Peh + Pegon.Fatha + Pegon.Nga],
    ["tin_g", Pegon.Ta + Pegon.Kasra + Pegon.Ya + Pegon.Nga],
    ["ba", Pegon.Ba + Pegon.Fatha + Pegon.Alif],
    ["di", Pegon.Dal + Pegon.Kasra + Pegon.Ya],
    ["d-i", Pegon.Dal + Pegon.Ya],
    ["ka", Pegon.Kaf + Pegon.Fatha + Pegon.Alif],
    ["k-a", Pegon.Kaf + Pegon.Alif],
    ["pa", Pegon.Peh + Pegon.Fatha + Pegon.Alif],
    ["sa", Pegon.Sin + Pegon.Fatha + Pegon.Alif],
    ["s-a", Pegon.Sin + Pegon.Alif],
    ["pika", Pegon.Peh + Pegon.Kasra + Pegon.Ya + Pegon.Kaf + Pegon.Fatha + Pegon.Alif],
    ["pi", Pegon.Peh + Pegon.Kasra + Pegon.Ya],
    ["si", Pegon.Sin + Pegon.Kasra + Pegon.Ya],
    ["ti", Pegon.Ta + Pegon.Kasra + Pegon.Ya],
    ["man_g", Pegon.Mim + Pegon.Fatha + Pegon.Nga],
    ["mika", Pegon.Mim + Pegon.Kasra + Pegon.Ya + Pegon.Kaf + Pegon.Fatha + Pegon.Alif],
    ["mi", Pegon.Mim + Pegon.Kasra + Pegon.Ya],
    ["ma", Pegon.Mim + Pegon.Fatha + Pegon.Alif],
]

const sundaPrefixesRulesAlt: PlainRule[] = [
    ["di", Pegon.Dal + Pegon.Kasra + Pegon.Ya + Pegon.Space],
    ["d-i", Pegon.Dal + Pegon.Ya + Pegon.Space],
]

const transliterateSundaPrefixes = (prefix: string, baseWord: string): string => {
    if (baseWord.match(/^[aiu\^eo]/) && prefix.match(/^(d-i|di)/)) {
        return transliterate(prefix, prepareRules(sundaPrefixesRulesAlt));
    }
    
    return transliterate(prefix, prepareRules(sundaPrefixesRules))
}

const transliterateSundaSuffixesVowel = (suffix: string, baseWord: string): string => {
    const sundaSuffixesRulesAlt: PlainRule[] = [
        ["n", Pegon.Nun],
    ]

    const sundaSuffixesVowelRules: Rule[] =
            prepareRules(chainRule(
                ruleProduct(baseWordLastLetterVowelSuffixFirstLetterVowel, sundaSuffixesRulesAlt),
                doubleEndingVowelForSuffixRules,
                baseWordLastLetterVowelSuffixFirstLetterVowel))


    return transliterate(baseWord[baseWord.length-1]+suffix, sundaSuffixesVowelRules)
}

const sundaSuffixesRules: PlainRule[] = [
    ["ke_un", Pegon.Kaf + Pegon.MaddaAbove + Pegon.Waw + Pegon.Nun],
    ["e_un", Pegon.MaddaAbove + Pegon.Waw + Pegon.Nun],
    ["ana", Pegon.Alif + Pegon.Nun + Pegon.Alif],
    ["an", Pegon.Alif + Pegon.Nun],
    ["na", Pegon.Nun + Pegon.Alif],
]

const transliterateSundaSuffixes = (suffix: string, baseWord: string): string => {
    if (baseWord.match(/(a|i|u|e_u|e|o)$/) && suffix.match(/^(a|i|u|e_u|o|e)(.*)/)) {
        return transliterateSundaSuffixesVowel(suffix, baseWord)
    }

    return transliterate(suffix, prepareRules(sundaSuffixesRules))
}

const transliterateIndonesianAffixes = (affixes: string[], baseWord: string): string[] => {
    let prefixResult = ''
    let suffixResult = ''

    for (let affix of affixes){
        let prefixMatches = affix.match(/(.*)-$/)
        let suffixMatches = affix.match(/^-(.*)/)

        if (prefixMatches) {
            prefixResult += transliterateIndonesianPrefixes(prefixMatches[1], baseWord)
        }

        else if (suffixMatches) {
            if (suffixMatches[1] === 'i')
                suffixResult += transliterateISuffix(baseWord)
            else
                suffixResult += transliterateIndonesianSuffixes(suffixMatches[1], baseWord)
        }
    }

    return [prefixResult, suffixResult]
}

const transliterateJawaAffixes = (affixes: string[], baseWord: string): string[] => {
    let prefixResult = ''
    let suffixResult = ''

    console.log(affixes, baseWord)
    for (let affix of affixes){
        let prefixMatches = affix.match(/(.*)-$/)
        let suffixMatches = affix.match(/^-(.*)/)

        if (prefixMatches) {
            prefixResult += transliterateJawaPrefixes(prefixMatches[1], baseWord)
        }

        else if (suffixMatches) {
            suffixResult += transliterateJawaSuffixes(suffixMatches[1], baseWord)
        }
    }

    return [prefixResult, suffixResult]
}

const transliterateMaduraAffixes = (affixes: string[], baseWord: string): string[] => {
    let prefixResult = ''
    let suffixResult = ''

    for (let affix of affixes){
        let prefixMatches = affix.match(/(.*)-$/)
        let suffixMatches = affix.match(/^-(.*)/)

        if (prefixMatches) {
            prefixResult += transliterateMaduraPrefixes(prefixMatches[1])
        }

        else if (suffixMatches) {
            suffixResult += transliterateMaduraSuffixes(suffixMatches[1], baseWord)
        }
    }

    return [prefixResult, suffixResult]
}

const transliterateSundaAffixes = (affixes: string[], baseWord: string): string[] => {
    let prefixResult = ''
    let suffixResult = ''

    for (let affix of affixes){
        let prefixMatches = affix.match(/(.*)-$/)
        let suffixMatches = affix.match(/^-(.*)/)

        if (prefixMatches) {
            prefixResult += transliterateSundaPrefixes(prefixMatches[1], baseWord)
        }

        else if (suffixMatches) {
            suffixResult += transliterateSundaSuffixes(suffixMatches[1], baseWord)
        }
    }

    return [prefixResult, suffixResult]
}

const firstSyllableWithSoundA = (rules: PlainRule[]): RegexRule[] =>
    prepareRules(rules).map<RegexRule>(([key, val]) =>
        [new RegExp(`(${key})([bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ](_[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ])?(-a|a-A|a))([bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ](_[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ])?(-a|a-A|a))`), `${val}$2$5`])


const firstSyllableWithSoundARules: RegexRule[] =
    firstSyllableWithSoundA(ruleProduct(consonantRules, aForClosedSyllable));

const countSyllable = (word: string): number => {
    const matches = word.match(/(-aA|-a|-i|-u|aA|e_u|a_i|a_u|\^e|`[aiueoAIUEO]|[aiueoAIUEO]){1}/g)
    if (matches)
        return matches.length
    return 0
}

const numbers : PlainRule[] = [
    ["0", Arab.Shifr],
    ["1", Arab.Wahid],
    ["2", Arab.Itsnan],
    ["3", Arab.Tsalatsah],
    ["4", Arab.Arbaah],
    ["5", Arab.Khamsah],
    ["6", Arab.Sittah],
    ["7", Arab.Sabaah],
    ["8", Arab.Tsamaniyah],
    ["9", Arab.Tisah]
]

const latinToPegonScheme: Rule[] =
    prepareRules(chainRule(
        specialPrepositionAsSingleWordsRule,

        closedSyllableWithSoundARules,

        beginningSingleVowelAsWordBeginningRules,

        singleVowelSyllableAsWordEndingRules,
        doubleVowelSyllableRules,

        firstSyllableWithSoundARules,

        singleVowelSyllableRules,

        
        singleVowelRules,
        deadConsonantRules,
        marbutahRules,
        punctuationRules,
        sukunRules,
        pepetRules,
        numbers))

export const transliterateLatinToPegon = (latinString: string): string => {
    return transliterate(latinString, latinToPegonScheme)
}

export const transliterateLatinToPegonStemResult = (stemResult: StemResult, lang: string): string => {
    if (stemResult.affixSequence.length == 0) {
        return transliterateLatinToPegon(stemResult.baseWord);
    }

    // TO-DO: insert transliterate rules for different language
    if (lang === "Jawa") {
        // transliterateStemResultJawa
        let base = transliterateLatinToPegon(stemResult.baseWord)
        let [prefix, suffix] = transliterateJawaAffixes(stemResult.affixSequence, stemResult.baseWord)
        return prefix + base + suffix;
    } else if (lang === "Sunda") {
        // transliterateStemResultSunda
        let base = transliterateLatinToPegon(stemResult.baseWord)
        let [prefix, suffix] = transliterateSundaAffixes(stemResult.affixSequence, stemResult.baseWord)
        return prefix + base + suffix;
    } else if (lang === "Madura") {
        // transliterateStemResultMadura
        let base = transliterateLatinToPegon(stemResult.baseWord)
        let [prefix, suffix] = transliterateMaduraAffixes(stemResult.affixSequence, stemResult.baseWord)
        return prefix + base + suffix;    
    } else {
        // transliterateStemResultIndonesia
        let base = transliterateLatinToPegon(stemResult.baseWord)
        let [prefix, suffix] = transliterateIndonesianAffixes(stemResult.affixSequence, stemResult.baseWord)
        return prefix + base + suffix;
    }
}

const inverseFirstSyllableWithSoundA = (rules: PlainRule[]): RegexRule[] =>
    prepareRules(rules).map<RegexRule>(([key, val]) =>
        [new RegExp(`(${key})([ثحخڊࢮڎذشصضطظغڠۑڽࢴڬڭݢݣؼبتچدرزسعجفقڤڤكࢴڮلمنهويءئؤ](\u0627|\u064E\u0627|\u064E))([ثحخڊࢮڎذشصضطظغڠۑڽࢴڬڭݢݣؼبتچدرزسعجفقڤڤكࢴڮلمنهويءئؤ](\u0627|\u064E\u0627|\u064E))`), `${val}$2$4`])

const inverseFirstSyllableWithSoundARules: RegexRule[] =
    inverseFirstSyllableWithSoundA(asInverse(ruleProduct(consonantRules, aForClosedSyllable)))

const inverseClosedSyllable = (rules: PlainRule[]): RegexRule[] =>
    prepareRules(rules).map<RegexRule>(([key, val]) =>
        [new RegExp(`(${key})(?![اويَُِࣤ])`), `${val}`])

const inverseClosedSyllableWithSoundARules: RegexRule[] =
    inverseClosedSyllable(asInverse(closedSyllableWithSoundA))

const inverseSpecialPrepositionAsSingleWordsRules: RegexRule[] =
    asSingleWord(asInverse(specialPrepositionRules))

const inversePrefixWithSpaceRules: PlainRule[] =
    asInverse(prefixWithSpaceRules)

const inversePrefixWithSpaceAsWordBeginningRules: RegexRule[] =
    asWordBeginning(inversePrefixWithSpaceRules)

const inverseDeadDigraphConsonantRules: PlainRule[] =
    asInverse(deadDigraphConsonantRules)

const inverseDeadMonographConsonantRules: PlainRule[] =
    asInverse(deadMonographConsonantRules)

const inverseDeadConsonantRules: PlainRule[] =
    asInverse(deadConsonantRules)

const inverseDigraphVowelRules: PlainRule[] =
    asInverse(digraphVowelRules)

const inverseMonographVowelRules: PlainRule[] =
    asInverse(monographVowelRules)

const inverseVowelsHarakatRules: PlainRule[] =
    asInverse(vowelsHarakatRules)

const inverseSingleVowelRules: PlainRule[] =
    asInverse(singleVowelRules)

const inverseSingleEndingVowelRules: PlainRule[] =
    asInverse(singleEndingVowelRules)

const inverseSingleEndingVowelAsWordEndingRules: RegexRule[] =
    asWordEnding(inverseSingleEndingVowelRules)

const inverseDoubleEndingVowelRules: PlainRule[] =
    asInverse(doubleVowelRules)

const inverseDoubleEndingVowelAsWordEndingRules: RegexRule[] =
    asWordEnding(inverseDoubleEndingVowelRules)

const inverseEndingVowelAsWordEndingRules: RegexRule[] =
    chainRule(
        inverseDoubleEndingVowelAsWordEndingRules,
        inverseSingleEndingVowelAsWordEndingRules)

const inverseDoubleVowelRules: PlainRule[] =
    asInverse(chainRule(doubleVowelRules,
                        alternateDoubleMonographVowelRules))

const inverseBeginningDigraphVowelRules: PlainRule[] =
    asInverse(beginningDigraphVowelRules)

const inverseBeginningMonographVowelRules: PlainRule[] =
    asInverse(beginningMonographVowelRules)

const inverseBeginningIForSoundIngRules: PlainRule[] =
    asInverse(beginningIForSoundIngRules)

const inverseBeginningVowelAsWordBeginningRules: RegexRule[] =
    asWordBeginning(chainRule(
        inverseBeginningIForSoundIngRules,
        inverseBeginningDigraphVowelRules,
        inverseBeginningMonographVowelRules))

const inverseBeginningIForOpenConsonantRules: PlainRule[] =
    asInverse(beginningIForOpenConsonantRules)

const inverseBeginningIForDeadConsonantRules: PlainRule[] =
    asInverse(beginningIForDeadConsonantRules)

const inversePrefixWithBeginningVowelsRules: PlainRule[] =
    chainRule(
        ruleProduct(inversePrefixWithSpaceRules,
                    inverseBeginningDigraphVowelRules),
        ruleProduct(inversePrefixWithSpaceRules,
                    inverseBeginningMonographVowelRules),
        ruleProduct(inversePrefixWithSpaceRules,
                    inverseBeginningIForDeadConsonantRules))

const inversePrefixWithBeginningVowelsAsWordBeginningRules: RegexRule[] =
    asWordBeginning(inversePrefixWithBeginningVowelsRules)

const inverseMarbutahRules: PlainRule[] =
    asInverse(marbutahRules)

const inverseOpenConsonantRules: PlainRule[] =
    asInverse(consonantRules)

const inverseConsonantRules: PlainRule[] =
    chainRule(
        inverseMarbutahRules,
        inverseDeadDigraphConsonantRules,
        inverseDeadMonographConsonantRules,
        inverseOpenConsonantRules)

const inverseVowelRules: Rule[] =
    chainRule<Rule>(
        inverseBeginningVowelAsWordBeginningRules,
        inverseEndingVowelAsWordEndingRules,
        inverseDoubleVowelRules,
        inverseSingleVowelRules,
        inverseBeginningIForDeadConsonantRules)

const inverseLongEndingAlifWawYaMaksuraRules: PlainRule[] =
    asInverse(longEndingAlifWawYaMaksuraRules)

const inverseShaddaRules: PlainRule[] =
    asInverse(shaddaRules)

const inverseDoubleMonographConsonantRules: PlainRule[] =
    asInverse(doubleMonographConsonantRules)

const inversePunctuationRules: PlainRule[] =
    asInverse(punctuationRules)

const inverseSingleVowelSyllableRules: Rule[] =
    chainRule<Rule>(
        asWordEnding(ruleProduct(inverseOpenConsonantRules,
                                 inverseSingleEndingVowelRules)),
        ruleProduct(inverseOpenConsonantRules, inverseDigraphVowelRules),
        ruleProduct(inverseOpenConsonantRules, inverseMonographVowelRules),
        ruleProduct(inverseOpenConsonantRules, inverseVowelsHarakatRules))

const inverseDoubleVowelSyllableRules: Rule[] =
    chainRule<Rule>(
        asWordEnding(ruleProduct(inverseOpenConsonantRules,
                                 inverseDoubleEndingVowelRules)),
        ruleProduct(inverseOpenConsonantRules,
                    inverseDoubleVowelRules))

const inverseSyllableRules: Rule[] =
    chainRule(
        inverseDoubleVowelSyllableRules,
        inverseSingleVowelSyllableRules)

const inverseDoubleMonographVowelAsBeginningSyllableRules: RegexRule[] =
    asWordBeginning(chainRule(
        asInverse(doubleMonographVowelBeginningSyllableRules),
        asInverse(alternateDoubleMonographVowelBeginningSyllableRules)
    ))

const inverseSukun: PlainRule[] =
    asInverse(sukunRules)

const inversePepet: PlainRule[] =
    asInverse(pepetRules)

const inverseFathaHarakatForWawAndYa: PlainRule[] =
    asInverse(fathaHarakatForWawAndYa)

const inverseFathaHarakatForWawAndYaRules: PlainRule[] =
    ruleProduct(inverseOpenConsonantRules, 
        chainRule(
            ruleProduct(inverseFathaHarakatForWawAndYa, inverseDigraphVowelRules),
            ruleProduct(inverseFathaHarakatForWawAndYa, inverseMonographVowelRules),
            ruleProduct(inverseFathaHarakatForWawAndYa, inverseVowelsHarakatRules),
        )
    )

const initiatePegonToLatinScheme = (): Rule[] => {
    return prepareRules(chainRule<Rule>(
        inverseBeginningVowelAsWordBeginningRules,
        inverseShaddaRules,
        inverseFirstSyllableWithSoundARules,
        inverseSpecialPrepositionAsSingleWordsRules,
        inverseClosedSyllableWithSoundARules,
        inversePrefixWithBeginningVowelsAsWordBeginningRules,
        inversePrefixWithSpaceAsWordBeginningRules,
        //inverseDoubleMonographVowelAsBeginningSyllableRules,
        inverseDoubleEndingVowelAsWordEndingRules,
        inverseFathaHarakatForWawAndYaRules,
        inverseSyllableRules,
        inverseVowelRules,
        inverseConsonantRules,
        inversePunctuationRules,
        inverseSukun,
        inversePepet,
        inverseDoubleMonographConsonantRules,
        asInverse(numbers)))
}

export const transliteratePegonToLatin = (pegonString: string, lang: string = "Indonesia"): string => {
    initiateDoubleMonographVowelRules(lang);
    const pegonToLatinScheme: Rule[] = initiatePegonToLatinScheme();
    return transliterate(pegonString, pegonToLatinScheme)
}
                            
const standardLatinRules: PlainRule[] = [
    ["t_h", "ṭ"],
    ["T_h", "ṭ"],
    ["t_H", "ṭ"],
    ["t_s", "ṫ"],
    ["t-", "t"],
    ["h_h", "ḥ"],
    ["k_h", "ḵ"],
    ["d_h", "ḍ"],
    ["d_H", "ḍ"],
    ["D_h", "ḍ"],
    ["d_l", "ḏ"],
    ["d_z", "ḋ"],
    ["s_y", "ś"],
    ["s_h", "ṣ"],
    ["t_t", "ṯ"],
    ["z_h", "ẕ"],
    ["g_h", "g̣"],
    ["n_g", "ṅ"],
    ["n_y", "ñ"],
    ["n_Y", "ñ"],
    ["e_u", "eu"],
    ["a_i", "ai"],
    ["a_u", "au"],
    ["a_u", "au"],
    ["i^i", "i"],
    ["^iY", "i"],
    ["e^i", "e"],
    ["iY", "i"],
    ["i-Y", "i"],
    ["uW", "u"],
    ["u-W", "u"],
    ["a-A", "a"],
    ["-aA", "a"],
    ["aA", "a"],
    ["^e", "ě"],
    ["^i", "i"],
    ["`a", "a"],
    ["`i", "i"],
    ["`u", "u"],
    ["`e", "e"],
    ["`o", "o"],
    ["I", "i"],
    ["Y", "i"],
    ["O", "o"],
    ["A", "a"],
    ["U", "u"],
    ["G", "g"],
    ["-a", "a"],
    ["-i", "i"],
    ["-u", "u"],
    [".", ""],
    ["^.", ""],
    ["g_1", "g"],
    ["g_2", "g"],
    ["g_3", "g"],
    ["g_4", "g"],
    ["g_5", "g"],
    ["g_6", "g"],
    ["g_7", "g"],
    ["g_8", "g"],
];

const changeFaToP: PlainRule[] = [
    ["f", "p"]
];

export const transliterateReversibleLatinToStandardLatin =
    (reversibleString: string, lang:string): string => {
        if (lang === 'Jawa' || lang === 'Sunda') {
            return transliterate(
                transliterate(reversibleString, prepareRules(standardLatinRules)),
                prepareRules(changeFaToP))
        } else
            return transliterate(reversibleString, prepareRules(standardLatinRules))
}

/*
  Transitive rules necessities:
  monograph vowels -> digraph vowels
  dead consonants -> open consonants + vowels
  i with dead consonants -> i with open consonants
  di/dak -> vowels/consonants
  product(i for dead consonants, transitive syllables)
  -> product(i for open consonants, transitive syllables)
*/

const IMEPrefixRules: Rule[] =
    asWordBeginning(
        makeTransitive(
            prefixRules.map(([key, val]) =>
                [key, val.replace(Pegon.Ya, Pegon.Maksura)]),
            prefixWithBeginningVowelRules
    ))

const IMESyllableRules: Rule[] =
    chainRule<Rule>(
        asWordEnding(makeTransitive(
            deadMonographConsonantRules,
            marbutahRules,
            deadDigraphConsonantRules,
            ruleProduct(consonantRules,
                        chainRule(singleEndingVowelRules,
                                  monographVowelRules
                                      .filter(([key, val]) => key != "i"))),
            ruleProduct(consonantRules,
                        doubleEndingVowelRules))
            .filter(([key, val]) =>
                !(new RegExp(`^(${pegonConsonants.join("|")})${Pegon.Sukun}(${latinVowels.filter(([key, val]) => key != "i").join("|")})$`)
                    .test(key)))),
        asWordBeginning(makeTransitive(
            deadMonographConsonantRules,
            marbutahRules,
            deadDigraphConsonantRules,
            ruleProduct(consonantRules,
                        chainRule(singleEndingVowelRules,
                                  monographVowelRules
                                      .filter(([key, val]) => key != "i"))),
            doubleMonographVowelBeginningSyllableRules)),
        makeTransitive(
            deadMonographConsonantRules,
            marbutahRules,
            deadDigraphConsonantRules,
            chainRule(
                ruleProduct(consonantRules, digraphVowelRules),
                ruleProduct(consonantRules, monographVowelRules)),
            chainRule(
                ruleProduct(consonantRules, doubleDigraphVowelRules),
                ruleProduct(consonantRules, doubleMonographVowelRules)
            )))

const IMEBeginningIRules: Rule[] =
    chainRule(
        asSingleWord(makeTransitive(
            beginningIForDeadConsonantRules,
            ruleProduct(beginningIForDeadConsonantRules,
                        deadMonographConsonantRules),
            ruleProduct(beginningIForDeadConsonantRules,
                        marbutahRules),
            ruleProduct(beginningIForDeadConsonantRules,
                        deadDigraphConsonantRules),
            ruleProduct(beginningIForOpenConsonantRules,
                        ruleProduct(consonantRules, singleEndingVowelRules)),
        )),
        asWordBeginning(makeTransitive(
            beginningIForDeadConsonantRules,
            ruleProduct(beginningIForDeadConsonantRules,
                        deadMonographConsonantRules),
            ruleProduct(beginningIForDeadConsonantRules,
                        marbutahRules),
            ruleProduct(beginningIForDeadConsonantRules,
                        deadDigraphConsonantRules),
            ruleProduct(beginningIForOpenConsonantRules,
                        ruleProduct(consonantRules, monographVowelRules)))))

const IMEVowelRules: Rule[] =
    chainRule<Rule>(
        asWordEnding(makeTransitive(
            chainRule(
                // the only single ending vowel is "i"
                monographVowelRules
                    .filter(([key, val]) => key != "i"),
                singleEndingVowelRules),
            doubleEndingVowelRules)
            .filter(([key, val]) => key.length > 1)),
        asWordBeginning(makeTransitive(
            beginningMonographVowelRules,
            beginningDigraphVowelRules)),
        makeTransitive(
            chainRule(
                monographVowelRules,
                singleEndingVowelRules),
            doubleMonographVowelRules,
            doubleDigraphVowelRules)
            .filter(([key, val]) => key.length > 1),
        digraphVowelRules,
        monographVowelRules)

const IMESpecialAsNotWordEndingRules: RegexRule[] =
    asNotWordEnding([
        // "i"
        [Pegon.Maksura + Pegon.Sukun, Pegon.Ya + Pegon.Sukun],
        // "ae"
        [Pegon.Fatha + Pegon.Alif +
            Pegon.Ha +
            Pegon.Fatha + Pegon.Maksura + Pegon.Sukun,
         Pegon.Fatha + Pegon.Alif +
            Pegon.Ha +
            Pegon.Fatha + Pegon.Ya + Pegon.Sukun],
        // "ai"
        [Pegon.Fatha + Pegon.Alif +
            Pegon.Ha +
            Pegon.Kasra + Pegon.Maksura + Pegon.Sukun,
         Pegon.Fatha + Pegon.Alif +
            Pegon.Ha +
            Pegon.Kasra + Pegon.Ya + Pegon.Sukun],
        // "ea"
        [Pegon.Fatha + Pegon.Ya + Pegon.Sukun +
            Pegon.Ya +
            Pegon.Fatha + Pegon.Alif,
         Pegon.Fatha + Pegon.Ya + Pegon.Sukun +
             Pegon.Alif + Pegon.Fatha],
        // "ia"
        [Pegon.Kasra + Pegon.Ya + Pegon.Sukun + 
            Pegon.Ya +
            Pegon.Fatha + Pegon.Alif,
         Pegon.Kasra +
            Pegon.Ya +
            Pegon.Fatha + Pegon.Alif],
        // "aa"
        [Pegon.Fatha + Pegon.Alif +
            Pegon.Ha +
            Pegon.Fatha + Pegon.Alif,
         Pegon.Fatha + Pegon.Alif + Pegon.AlifWithHamzaAbove],
        // "oa"
        [Pegon.Fatha + Pegon.Waw + Pegon.Sukun +
            Pegon.Ha +
            Pegon.Fatha + Pegon.Alif,
        Pegon.Fatha + Pegon.Waw + Pegon.Sukun +
             Pegon.Alif + Pegon.Fatha,],
        // "ua"
        [Pegon.Damma + Pegon.Waw + Pegon.Sukun +
            Pegon.Waw +
            Pegon.Fatha + Pegon.Alif,
        Pegon.Damma + Pegon.Waw + Pegon.Sukun +
            Pegon.Alif + Pegon.Fatha],
    ])


// TODO: make this pass for the ime tests
// Alternatively, just go ahead and make it all contextual
const IMERules: Rule[] = prepareRules(chainRule<Rule>(
    IMEPrefixRules,
    IMEBeginningIRules,
    beginningSingleVowelAsWordBeginningRules,
    IMESyllableRules,
    IMEVowelRules,
    IMESpecialAsNotWordEndingRules,
    punctuationRules,
))

export function initIME(): InputMethodEditor {
    return {
        "rules": IMERules,
        "inputEdit": (inputString: string): string => 
            transliterate(inputString, IMERules)
    }
}
