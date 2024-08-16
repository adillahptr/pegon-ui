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
    Ca2 = "\u0758",
    Dyeh = "\u0684",
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
    Nya2 = "\u067E",
    Nya3 = "\u0752",
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
    Ve = "\u06CB",

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
]

const digraphVowelRules: PlainRule[] = [
    ["aA", Pegon.Fatha + Pegon.Alif],
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

const vowelsHarakatRules: PlainRule[] = [
    ["e", Pegon.Fatha + Pegon.Ya],
    ["i-Y", Pegon.Kasra ],
    ["o", Pegon.Fatha + Pegon.Waw],
    ["a-A", Pegon.Fatha],
    ["u-W", Pegon.Damma],
]
    
const singleVowelRules: PlainRule[] =
    chainRule(
        digraphVowelRules,
        monographVowelHarakatAtFirstAbjadRules)

const singleEndingVowelRules: PlainRule[] = [
    ["`a", Pegon.Hamza + Pegon.Sukun],
    ["`i", Pegon.YaWithHamzaAbove + Pegon.Sukun],
    ["`u", Pegon.WawHamzaAbove + Pegon.Sukun],
    ["-i", Pegon.Ya],
    ["i", Pegon.Kasra + Pegon.Ya],
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
    ["a", Pegon.Alif + Pegon.Fatha],
    ["i", Pegon.Alif + Pegon.Kasra + Pegon.Ya ],
    ["-i-Y", Pegon.Alif + Pegon.Kasra],
    ["-i", Pegon.Alif + Pegon.Ya ],
    ["u", Pegon.Alif + Pegon.Damma + Pegon.Waw],
    ["-u-W", Pegon.Alif + Pegon.Damma],
    ["-u", Pegon.Alif + Pegon.Waw],
    ["-a", Pegon.Alif],
]

const BeginningOAndERules: PlainRule[] = [
    ["o", Pegon.Alif + Pegon.Fatha + Pegon.Waw],
    ["e", Pegon.Alif + Pegon.Fatha + Pegon.Ya],
]

const beginningIngForDeadConsonantRules: PlainRule[] = [
    ["in_g", Pegon.Alif + Pegon.Kasra + Pegon.Nga],
    ["-in_g", Pegon.Alif + Pegon.Nga],
    ["`in_g", Pegon.AlifWithHamzaBelow + Pegon.Kasra + Pegon.Nga],
    ["`i-n_g", Pegon.AlifWithHamzaBelow + Pegon.Nga],
]

const beginningIngForOpenConsonant: PlainRule[] = [
    ["in_g", Pegon.Alif + Pegon.Kasra + Pegon.Ya + Pegon.Nga],
    ["-i-Yn_g", Pegon.Alif + Pegon.Kasra + Pegon.Nga],
    ["-in_g", Pegon.Alif + Pegon.Ya + Pegon.Nga],
]

const beginningIngForOpenConsonantRules: PlainRule[] = 
    chainRule(
        ruleProduct(beginningIngForOpenConsonant, digraphVowelRules),
        ruleProduct(beginningIngForOpenConsonant, monographVowelRules),
        ruleProduct(beginningIngForOpenConsonant, vowelsHarakatRules),
    )

const beginningSingleVowelRules: PlainRule[] =
    chainRule(
        beginningIngForOpenConsonantRules,
        beginningIngForDeadConsonantRules,
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
    ["u-Wa", Pegon.Damma +
        Pegon.Waw + Pegon.Fatha + Pegon.Alif],
    ["u-W-a", Pegon.Damma +
        Pegon.Waw + Pegon.Alif],
    ["aE", Pegon.Fatha + Pegon.Alif +
        Pegon.Alif + Pegon.Fatha + Pegon.Ya],
    ["a-AE", Pegon.Fatha +
        Pegon.Alif + Pegon.Fatha + Pegon.Ya],
    ["aa-A", 
        Pegon.Fatha + Pegon.Alif + 
        Pegon.Alif + Pegon.Fatha],
    ["aa", 
        Pegon.Fatha + Pegon.Alif +
        Pegon.AlifWithHamzaAbove + Pegon.Fatha],
    ["a-Aa-A", 
        Pegon.Fatha +
        Pegon.Alif + Pegon.Fatha],
    ["a-Aa", 
        Pegon.Fatha +
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
    ["a-Ai", Pegon.Fatha +
        Pegon.Ha + Pegon.Kasra + Pegon.Ya],
    ["a-A-i", Pegon.Fatha +
        Pegon.Ha + Pegon.Ya],
    ["ai", Pegon.Fatha + Pegon.Alif +
        Pegon.Ha + Pegon.Kasra + Pegon.Ya],
    ["a-i", Pegon.Fatha + Pegon.Alif +
        Pegon.Ha + Pegon.Ya],
    ["-ai", Pegon.Alif +
        Pegon.Ha + Pegon.Kasra + Pegon.Ya],
    ["-a-i", Pegon.Alif +
        Pegon.Ha + Pegon.Ya],
    ["a-Au", Pegon.Fatha +
        Pegon.Ha + Pegon.Damma + Pegon.Waw],
    ["a-A-u", Pegon.Fatha +
        Pegon.Ha + Pegon.Waw],
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
    ["a-A`u", Pegon.Fatha +
        Pegon.Hamza + Pegon.Damma + Pegon.Waw],
    ["-a-`u", Pegon.Alif +
        Pegon.Hamza + Pegon.Waw],
    ["-a-U", Pegon.Alif +
        Pegon.Alif + Pegon.Waw],
    ["a-Ae", Pegon.Fatha +
        Pegon.Ha + Pegon.Fatha + Pegon.Ya],
    ["ae", Pegon.Fatha + Pegon.Alif +
        Pegon.Ha + Pegon.Fatha + Pegon.Ya],
    ["a-Ao", Pegon.Fatha +
        Pegon.Ha + Pegon.Fatha + Pegon.Waw],
    ["a-AO", Pegon.Fatha +
        Pegon.Alif + Pegon.Fatha + Pegon.Waw],
    ["ao", Pegon.Fatha + Pegon.Alif +
        Pegon.Ha + Pegon.Fatha + Pegon.Waw],
    ["-ao", Pegon.Alif +
        Pegon.Ha + Pegon.Fatha + Pegon.Waw],
    ["-aO", Pegon.Alif +
        Pegon.Alif + Pegon.Fatha + Pegon.Waw],
    ["e-a", Pegon.Fatha + Pegon.Ya +
        Pegon.Ya + Pegon.Alif],
    ["e^.-a", Pegon.Fatha + Pegon.Ya + Pegon.Sukun2 +
        Pegon.Ya + Pegon.Alif],
    ["e.-a", Pegon.Fatha + Pegon.Ya + Pegon.Sukun +
        Pegon.Ya + Pegon.Alif],
    ["ea", Pegon.Fatha + Pegon.Ya +
        Pegon.Ya + Pegon.Fatha + Pegon.Alif],
    ["e^.a", Pegon.Fatha + Pegon.Ya + Pegon.Sukun2 +
        Pegon.Ya + Pegon.Fatha + Pegon.Alif],
    ["e.a", Pegon.Fatha + Pegon.Ya + Pegon.Sukun +
        Pegon.Ya + Pegon.Fatha + Pegon.Alif],
    ["i-Ya", Pegon.Kasra +
        Pegon.Ya + Pegon.Fatha + Pegon.Alif],
    ["i-Y-a", Pegon.Kasra +
        Pegon.Ya + Pegon.Alif],
    ["ia", Pegon.Kasra + Pegon.Ya +
        Pegon.Ya + Pegon.Fatha + Pegon.Alif],
    ["i^.a", Pegon.Kasra + Pegon.Ya + Pegon.Sukun2 +
        Pegon.Ya + Pegon.Fatha + Pegon.Alif],
    ["i.a", Pegon.Kasra + Pegon.Ya + Pegon.Sukun +
        Pegon.Ya + Pegon.Fatha + Pegon.Alif],
    ["-ia", Pegon.Ya +
        Pegon.Ya + Pegon.Fatha + Pegon.Alif],
    ["i-a", Pegon.Kasra + Pegon.Ya +
        Pegon.Ya + Pegon.Alif],
    ["-i-a", Pegon.Ya +
        Pegon.Ya + Pegon.Alif],
    ["i-Yu", Pegon.Kasra +
        Pegon.Ya + Pegon.Damma + Pegon.Waw],
    ["i-Y-u", Pegon.Kasra +
        Pegon.Ya + Pegon.Waw],
    ["iu", Pegon.Kasra + Pegon.Ya +
        Pegon.Ya + Pegon.Damma + Pegon.Waw],
    ["i^.u", Pegon.Kasra + Pegon.Ya + Pegon.Sukun2 +
        Pegon.Ya + Pegon.Damma + Pegon.Waw],
    ["i.u", Pegon.Kasra + Pegon.Ya + Pegon.Sukun +
        Pegon.Ya + Pegon.Damma + Pegon.Waw],
    ["-i-u", Pegon.Ya +
        Pegon.Ya + Pegon.Waw],
    ["i-Yo", Pegon.Kasra +
        Pegon.Ya + Pegon.Fatha + Pegon.Waw],
    ["i^.o", Pegon.Kasra + Pegon.Ya + Pegon.Sukun2 +
        Pegon.Ya + Pegon.Fatha + Pegon.Waw],
    ["i.o", Pegon.Kasra + Pegon.Ya + Pegon.Sukun +
        Pegon.Ya + Pegon.Fatha + Pegon.Waw],
    ["io", Pegon.Kasra + Pegon.Ya +
        Pegon.Ya + Pegon.Fatha + Pegon.Waw],
    ["-io", Pegon.Ya +
        Pegon.Ya + Pegon.Fatha + Pegon.Waw],
    ["u-Wwe", Pegon.Damma +
        Pegon.Waw + Pegon.Fatha + Pegon.Ya],
    ["ua", Pegon.Damma + Pegon.Waw +
        Pegon.Waw + Pegon.Fatha + Pegon.Alif],
    ["u^.a", Pegon.Damma + Pegon.Waw + Pegon.Sukun2 +
        Pegon.Waw + Pegon.Fatha + Pegon.Alif],
    ["u.a", Pegon.Damma + Pegon.Waw + Pegon.Sukun +
        Pegon.Waw + Pegon.Fatha + Pegon.Alif],
    ["-u-a", Pegon.Waw +
        Pegon.Waw + Pegon.Alif],
    ["u-Wi", Pegon.Damma +
        Pegon.Waw + Pegon.Kasra + Pegon.Ya],
    ["u-W-i", Pegon.Damma +
        Pegon.Waw + Pegon.Ya],
    ["ui", Pegon.Damma + Pegon.Waw +
        Pegon.Waw + Pegon.Kasra + Pegon.Ya],
    ["u^.i", Pegon.Damma + Pegon.Waw + Pegon.Sukun2 +
        Pegon.Waw + Pegon.Kasra + Pegon.Ya],
    ["u.i", Pegon.Damma + Pegon.Waw + Pegon.Sukun +
        Pegon.Waw + Pegon.Kasra + Pegon.Ya],
    ["-u-i", Pegon.Waw +
        Pegon.Waw + Pegon.Ya],
    ["u-Wo", Pegon.Damma +
        Pegon.Waw + Pegon.Fatha + Pegon.Waw],
    ["-uo", Pegon.Waw +
        Pegon.Waw + Pegon.Fatha + Pegon.Waw],
    ["uo", Pegon.Damma + Pegon.Waw +
        Pegon.Waw + Pegon.Fatha + Pegon.Waw],
    ["u^.o", Pegon.Damma + Pegon.Waw + Pegon.Sukun2 +
        Pegon.Waw + Pegon.Fatha + Pegon.Waw],
    ["u.o", Pegon.Damma + Pegon.Waw + Pegon.Sukun +
        Pegon.Waw + Pegon.Fatha + Pegon.Waw],
    ["eo", Pegon.Fatha + Pegon.Ya +
        Pegon.Ya + Pegon.Fatha + Pegon.Waw],
    ["e^.o", Pegon.Fatha + Pegon.Ya + Pegon.Sukun2 +
        Pegon.Ya + Pegon.Fatha + Pegon.Waw],
    ["e.o", Pegon.Fatha + Pegon.Ya + Pegon.Sukun +
        Pegon.Ya + Pegon.Fatha + Pegon.Waw],
    ["^e^e", Pegon.MaddaAbove + 
        Pegon.Alif + Pegon.MaddaAbove],
    ["ie", Pegon.Kasra + Pegon.Ya +
        Pegon.Ya + Pegon.Fatha + Pegon.Ya],
    ["i^.e", Pegon.Kasra + Pegon.Ya + Pegon.Sukun2 +
        Pegon.Ya + Pegon.Fatha + Pegon.Ya],
    ["i.e", Pegon.Kasra + Pegon.Ya + Pegon.Sukun +
        Pegon.Ya + Pegon.Fatha + Pegon.Ya],
    ["i-Ye", Pegon.Kasra +
        Pegon.Ya + Pegon.Fatha + Pegon.Ya],
]

const doubleMonographVowelRulesSunda: PlainRule[] = [
    ...doubleMonographVowelRulesStandard,
    ["e_u", Pegon.MaddaAbove +
        Pegon.Waw],
    ["a_i", Pegon.MaddaAbove +
        Pegon.Ya +
        Pegon.Sukun],
    ["a_u", Pegon.MaddaAbove +
        Pegon.Waw +
        Pegon.Sukun],
]

const doubleMonographVowelForIOAndIE: PlainRule[] = [
    ["i^.o", Pegon.Kasra + Pegon.Ya + Pegon.Sukun2 +
        Pegon.Ya + Pegon.Fatha + Pegon.Waw],
    ["i.o", Pegon.Kasra + Pegon.Ya + Pegon.Sukun +
        Pegon.Ya + Pegon.Fatha + Pegon.Waw],
    ["io", Pegon.Kasra + Pegon.Ya +
        Pegon.Ya + Pegon.Fatha + Pegon.Waw],
    ["-io", Pegon.Ya +
        Pegon.Ya + Pegon.Fatha + Pegon.Waw],
    ["i-Yo", Pegon.Kasra +
        Pegon.Ya + Pegon.Fatha + Pegon.Waw],
    ["ie", Pegon.Kasra + Pegon.Ya +
        Pegon.Ya + Pegon.Fatha + Pegon.Ya],
    ["i^.e", Pegon.Kasra + Pegon.Ya + Pegon.Sukun2 +
        Pegon.Ya + Pegon.Fatha + Pegon.Ya],
    ["i.e", Pegon.Kasra + Pegon.Ya + Pegon.Sukun +
        Pegon.Ya + Pegon.Fatha + Pegon.Ya],
    ["i-Ye", Pegon.Kasra +
        Pegon.Ya + Pegon.Fatha + Pegon.Ya],
]

var doubleMonographVowelRules: PlainRule[] = doubleMonographVowelRulesSunda;

const initiateDoubleMonographVowelRules = (lang: string) => {
    if(lang === "Sunda"){
        doubleMonographVowelRules = doubleMonographVowelRulesSunda;
    } else {
        doubleMonographVowelRules = doubleMonographVowelRulesStandard;
    }
}

const vowelHamzaEndingWithoutSukunRules: PlainRule[] = [
    ["a`a", Pegon.Fatha + Pegon.Alif + Pegon.Hamza],
    ["a-A`a", Pegon.Fatha + Pegon.AlifWithHamzaAbove],
    ["a-A`a", Pegon.Fatha + Pegon.Hamza],
    ["i.`i", Pegon.Kasra + Pegon.Ya + Pegon.Sukun + Pegon.YaWithHamzaAbove],
    ["i^.`i", Pegon.Kasra + Pegon.Ya + Pegon.Sukun2 + Pegon.YaWithHamzaAbove],
    ["i`i", Pegon.Kasra + Pegon.Ya + Pegon.YaWithHamzaAbove],
    ["i-Y`i", Pegon.Kasra + Pegon.YaWithHamzaAbove],
    ["u`u", Pegon.Damma + Pegon.Waw + Pegon.WawHamzaAbove],
    ["u-W`u", Pegon.Damma + Pegon.WawHamzaAbove],
    ["u.`U", Pegon.Damma + Pegon.Waw + Pegon.Sukun + Pegon.Hamza],
    ["u^.`U", Pegon.Damma + Pegon.Waw + Pegon.Sukun2 + Pegon.Hamza],
    ["u`U", Pegon.Damma + Pegon.Waw + Pegon.Hamza],
]

const vowelHamzaEndingWithSukunRules: PlainRule[] = 
    ruleProduct(vowelHamzaEndingWithoutSukunRules, sukunRules)

const vowelHamzaEndingRules: PlainRule[] = 
    chainRule(vowelHamzaEndingWithSukunRules, vowelHamzaEndingWithoutSukunRules)

const vowelHamzaAsWordEndingRules: RegexRule[] =
    asWordEnding(vowelHamzaEndingRules);

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

const doubleVowelAsWordBeginningRules: RegexRule[] =
    asWordBeginning(
        ruleProduct([["", Pegon.Alif]], doubleVowelRules)
    )

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
    ["c_2", Pegon.Ca2],
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
    ["v", Pegon.Ve],
    // Tambahan konsonan Arab
    ["`_1", Pegon.Hamza],
    ["`", Pegon.YaWithHamzaAbove],
]

const digraphConsonantRules: PlainRule[] = [
    // special combination using diacritics, may drop
    // ["t_h", Pegon.ThaWithOneDotBelow],
    // the one in id.wikipedia/wiki/Abjad_Pegon
    ["t-", Pegon.TaMarbuta],
    ["t_h", Pegon.ThaWithThreeDotsBelow],
    ["T_h", Pegon.ThaWithOneDotBelow],
    ["t_H", Pegon.ThaWithTwoDotsBelow],
    ["T_H", Pegon.ThaWithThreeDotsAbove],
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
    ["N_y", Pegon.Nya2],
    ["N_Y", Pegon.Nya3],
    ["n_Y", Pegon.NunWithThreeDotsAbove],
    ["g_1", Pegon.KafWithOneDotBelow],
    ["g_2", Pegon.KafWithOneDotAbove],
    ["g_3", Pegon.KafWithThreeDotsAbove],
    ["g_4", Pegon.KafWithTwoDotsBelow],
    ["g_5", Pegon.KehehWithOneDotAbove],
    ["g_6", Pegon.KehehWithThreeDotsAbove],
    ["g_7", Pegon.KehehWithTwoDotsBelow],
    ["g_8", Pegon.KehehWithThreeDotsBelow],
    ["^c", Pegon.Dyeh],
    ["^A_1", Pegon.AlifWithMaddaAbove],
];

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
    consonantRules.map<PlainRule>(([key, val]) => [key.concat("+" + key), val.concat(Pegon.Shadda)])

const shaddaRules: PlainRule[] =
    chainRule(
        ruleProduct(doubleSameConsonantRules, vowelsHarakatRules),
        ruleProduct(doubleSameConsonantRules, digraphVowelRules),
        ruleProduct(doubleSameConsonantRules, monographVowelRules),
        doubleSameConsonantRules)

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
        [new RegExp(`(${key})(?!([_aiueo\`WAIUEOY]|^e|-a|-u|-i))`), `${val}`])

const consonantForClosedSyllableWithSoundA: PlainRule[] =
    consonantRules.filter(([k,v]) => k !== "w" && k !== "y")

const closedSyllableWithSoundA: PlainRule[] =
    ruleProduct(
        ruleProduct(consonantRules,aForClosedSyllable).filter(([k,v]) => k !== "w-a" && k !== "y-a"), 
        consonantForClosedSyllableWithSoundA)

const closedSyllableWithSoundARules: RegexRule[] =
    closedSyllable(closedSyllableWithSoundA)

const fathaHarakatForWawAndYa: PlainRule[] = [
    ["a-Aw", Pegon.Fatha + Pegon.Waw],
    ["a-Ay", Pegon.Fatha + Pegon.Ya],
]

const fathaHarakatForWawAndYaRules: PlainRule[] =
    ruleProduct(consonantRules, 
        chainRule(
            ruleProduct(fathaHarakatForWawAndYa, vowelsHarakatRules),
            ruleProduct(fathaHarakatForWawAndYa, digraphVowelRules),
            ruleProduct(fathaHarakatForWawAndYa, monographVowelRules),
        )
    )

const vowelAForOneSyllable: PlainRule[] = [
    ["a", ""]
]

const oneSyllableWithSoundARules: PlainRule[] =
    ruleProduct(
        ruleProduct(consonantRules, vowelAForOneSyllable), consonantRules)

const oneSyllableWithSoundAAsSingleSyllableRules: RegexRule[] = 
    asSingleWord(oneSyllableWithSoundARules)

const doubleVowelForClosedSyllableLeftSideMonograph: PlainRule[] = [
    ["i", Pegon.Kasra + Pegon.Ya + Pegon.Ya],
    ["u", Pegon.Damma + Pegon.Waw + Pegon.Waw],
    ["e", Pegon.Fatha + Pegon.Ya + Pegon.Ya],
    ["o", Pegon.Fatha + Pegon.Waw + Pegon.Waw],
    ["i^.", Pegon.Kasra + Pegon.Ya + Pegon.Sukun2 + Pegon.Ya],
    ["u^.", Pegon.Damma + Pegon.Waw + Pegon.Sukun2 + Pegon.Waw],
    ["e^.", Pegon.Fatha + Pegon.Ya + Pegon.Sukun2 + Pegon.Ya],
    ["o^.", Pegon.Fatha + Pegon.Waw + Pegon.Sukun2 + Pegon.Waw],
    ["i.", Pegon.Kasra + Pegon.Ya + Pegon.Sukun + Pegon.Ya],
    ["u.", Pegon.Damma + Pegon.Waw + Pegon.Sukun + Pegon.Waw],
    ["e.", Pegon.Fatha + Pegon.Ya + Pegon.Sukun + Pegon.Ya],
    ["o.", Pegon.Fatha + Pegon.Waw + Pegon.Sukun + Pegon.Waw],
]

const doubleVowelForClosedSyllableLeftSideDigraph: PlainRule[] = [
    ["-i", Pegon.Ya + Pegon.Ya],
    ["-u", Pegon.Waw + Pegon.Waw],
    ["^e", Pegon.MaddaAbove + Pegon.Waw],
    ["-i^.", Pegon.Ya + Pegon.Sukun2 + Pegon.Ya],
    ["-u^.", Pegon.Waw + Pegon.Sukun2 + Pegon.Waw],
    ["-i.", Pegon.Ya + Pegon.Sukun + Pegon.Ya],
    ["-u.", Pegon.Waw + Pegon.Sukun + Pegon.Waw],
]

const doubleVowelForClosedSyllableLeftSideHarakat: PlainRule[] = [
    ["i-Y", Pegon.Kasra + Pegon.Ya],
    ["u-W", Pegon.Damma + Pegon.Waw],
]

const aForClosedSyllable2: PlainRule[] = [
    ["-aA", Pegon.Alif],
    ["aA", Pegon.Fatha + Pegon.Alif],
    ["a", Pegon.Fatha],
]

const doubleVowelClosedSyllableRules: PlainRule[] = (
    ruleProduct(
        chainRule(
            ruleProduct(doubleVowelForClosedSyllableLeftSideDigraph, aForClosedSyllable2),
            ruleProduct(doubleVowelForClosedSyllableLeftSideMonograph, aForClosedSyllable2),
            ruleProduct(doubleVowelForClosedSyllableLeftSideHarakat, aForClosedSyllable2),
        ),
        consonantRules
    )
)

const closedSyllableAsNotBeginning = (rules: PlainRule[]): RegexRule[] =>
    prepareRules(rules).map<RegexRule>(([key, val]) =>
        [new RegExp(`(.)(${key})(?!([_aiueo\`WAIUEOY]|^e|-a|-u|-i))`), `$1${val}`])

const closedSyllableAsWordBeginning = (rules: PlainRule[]): RegexRule[] =>
    prepareRules(rules).map<RegexRule>(([key, val]) =>
        [new RegExp(`(^|[${wordDelimitingPatterns}])(${key})(?!([_aiueo\`WAIUEOY]|^e|-a|-u|-i))`), `$1${val}`])

const doubleVowelClosedSyllableAsNotBeginningRules: RegexRule[] = (
    closedSyllableAsNotBeginning(doubleVowelClosedSyllableRules)
)

const doubleVowelClosedSyllableAsWordBeginningRules: RegexRule[] = (
    closedSyllableAsWordBeginning(
        ruleProduct([["", Pegon.Alif]], doubleVowelClosedSyllableRules)
    )
)

const indonesianPrefixesRules: PlainRule[] = [
    ["di-Y", Pegon.Dal + Pegon.Kasra],
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
    ["di-Y", Pegon.Dal + Pegon.Kasra + Pegon.Space],
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
    ["-ana", Pegon.AlifWithHamzaAbove + Pegon.Nun + Pegon.Fatha + Pegon.Alif],
    ["ana", Pegon.AlifWithHamzaAbove + Pegon.Fatha + Pegon.Nun + Pegon.Fatha + Pegon.Alif],
    ["-an", Pegon.AlifWithHamzaAbove + Pegon.Nun],
    ["an", Pegon.AlifWithHamzaAbove + Pegon.Fatha + Pegon.Nun],
]

const suffixAnForOpenSyllable: PlainRule[] = [
    ["-ana", Pegon.Alif + Pegon.Nun + Pegon.Fatha + Pegon.Alif],
    ["ana", Pegon.Alif + Pegon.Fatha + Pegon.Nun + Pegon.Fatha + Pegon.Alif],
    ["-an", Pegon.Alif + Pegon.Nun],
    ["an", Pegon.Alif + Pegon.Fatha + Pegon.Nun],
]

const suffixAnForClosedSyllable: PlainRule[] = [
    ["-ana", Pegon.Alif + Pegon.Nun + Pegon.Fatha + Pegon.Alif],
    ["ana", Pegon.Fatha + Pegon.Alif + Pegon.Nun + Pegon.Fatha + Pegon.Alif],
    ["-an", Pegon.Alif + Pegon.Nun],
    ["an", Pegon.Fatha + Pegon.Alif + Pegon.Nun],
]

const transliterateIndonesianSuffixes = (suffix: string, baseWord: string) => {
    if (suffix.match(/^(-an|an)/)) {
        if (baseWord[baseWord.length-1].match(/[iueo]/)) {
            return transliterate(suffix, prepareRules(suffixAnForOpenSyllable))
        } else if (baseWord[baseWord.length-1].match(/a/)) {
            return transliterate(suffix, prepareRules(suffixAnForBaseWordWithEndingA))
        } else{
            return transliterate(suffix, prepareRules(suffixAnForClosedSyllable))
        }
    } 

    return transliterate(suffix, prepareRules(indonesianSuffixes))
}

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
    ["a_i", Pegon.Alif + Pegon.MaddaAbove + Pegon.Ya + Pegon.Sukun],
    ["a_u", Pegon.Alif + Pegon.MaddaAbove + Pegon.Waw + Pegon.Sukun],
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
    ["pri", Pegon.Peh + Pegon.Ra + Pegon.Kasra + Pegon.Ya],
    ["wi", Pegon.Waw + Pegon.Kasra + Pegon.Ya],
    ["k^e", Pegon.Kaf + Pegon.MaddaAbove],
    ["sa+A", Pegon.Sin + Pegon.Fatha + Pegon.Alif],
    ["sa", Pegon.Sin + Pegon.Fatha],
    ["s-a", Pegon.Sin + Pegon.Alif],
    ["dak", Pegon.Dal + Pegon.Fatha + Pegon.Kaf],
    ["d-ak", Pegon.Dal + Pegon.Kaf],
    ["da", Pegon.Dal + Pegon.Fatha],
    ["tar", Pegon.Ta + Pegon.Fatha + Pegon.Ra],
    ["tak", Pegon.Ta + Pegon.Fatha + Pegon.Kaf],
    ["ta", Pegon.Ta + Pegon.Fatha],
    ["kok", Pegon.Kaf + Pegon.Fatha + Pegon.Waw + Pegon.Kaf],
    ["ko", Pegon.Kaf + Pegon.Fatha + Pegon.Waw],
    ["tok", Pegon.Ta + Pegon.Fatha + Pegon.Waw + Pegon.Kaf],
    ["to", Pegon.Ta + Pegon.Fatha + Pegon.Waw],
    ["pi", Pegon.Peh + Pegon.Kasra + Pegon.Ya],
    ["kami", Pegon.Kaf + Pegon.Fatha + Pegon.Mim + Pegon.Kasra + Pegon.Ya],
    ["kapi", Pegon.Kaf + Pegon.Fatha + Pegon.Peh + Pegon.Kasra + Pegon.Ya],
    ["kuma", Pegon.Kaf + Pegon.Waw + Pegon.Mim + Pegon.Fatha],
    ["ka+A", Pegon.Kaf + Pegon.Fatha + Pegon.Alif],
    ["ka", Pegon.Kaf + Pegon.Fatha],
    ["k-a", Pegon.Kaf + Pegon.Alif],
    ["pra", Pegon.Peh + Pegon.Ra + Pegon.Fatha],
    ["pan_g", Pegon.Peh + Pegon.Fatha + Pegon.Nga],
    ["pan", Pegon.Peh + Pegon.Fatha + Pegon.Nun],
    ["pam", Pegon.Peh + Pegon.Fatha + Pegon.Mim],
    ["pa", Pegon.Peh + Pegon.Fatha],
    ["man_g", Pegon.Mim + Pegon.Fatha + Pegon.Nga],
    ["man", Pegon.Mim + Pegon.Fatha + Pegon.Nun],
    ["mam", Pegon.Mim + Pegon.Fatha + Pegon.Mim],
    ["ma", Pegon.Mim + Pegon.Fatha],
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
    ["m", Pegon.Mim],
    ["n_g", Pegon.Nga],
    ["n", Pegon.Nun],
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
    if (baseWord.match(/^[aiu\^eo]/) && prefix.match(/^(d-ak|dak|d-i|di)$/)) {
        return transliterate(prefix, prepareRules(jawaPrefixesRulesAlt));
    }

    return transliterate(prefix, prepareRules(jawaPrefixesRules));
}

const transliterateJawaSuffixesVowel = (suffix: string, baseWord: string): string => {
    const jawaSuffixesRulesAlt: PlainRule[] = [
        ["na", Pegon.Nun + Pegon.Fatha + Pegon.Alif],
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
    if (suffix.match(/^(-an|an)/)) {
        if (baseWord[baseWord.length-1].match(/[iueo]/)) {
            return transliterate(suffix, prepareRules(suffixAnForOpenSyllable))
        } else if (baseWord[baseWord.length-1].match(/a/)) {
            return transliterate(suffix, prepareRules(suffixAnForBaseWordWithEndingA))
        } else{
            return transliterate(suffix, prepareRules(suffixAnForClosedSyllable))
        }
    } 

    if (baseWord[baseWord.length-1].match(/^[aiueoWAY]/) && suffix[0].match(/^[-aiueo]/)) {
        return transliterateJawaSuffixesVowel(suffix, baseWord)
    }

    return transliterate(suffix, prepareRules(jawaSuffixesRules))
}

const maduraPrefixesRules: PlainRule[] = [
    ["koma", Pegon.Kaf + Pegon.Fatha + Pegon.Waw + Pegon.Mim + Pegon.Fatha],
    ["par", Pegon.Peh + Pegon.Fatha + Pegon.Ra],
    ["pe", Pegon.Peh + Pegon.Fatha + Pegon.Ya],
    ["pan_g", Pegon.Peh + Pegon.Fatha + Pegon.Nga],
    ["pam", Pegon.Peh + Pegon.Fatha + Pegon.Mim],
    ["pan", Pegon.Peh + Pegon.Fatha + Pegon.Nun],
    ["pa", Pegon.Peh + Pegon.Fatha],
    ["sa+A", Pegon.Sin + Pegon.Fatha + Pegon.Alif],
    ["sa", Pegon.Sin + Pegon.Fatha],
    ["s-a", Pegon.Sin + Pegon.Alif],
    ["ka+A", Pegon.Kaf + Pegon.Fatha + Pegon.Alif],
    ["ka", Pegon.Kaf + Pegon.Fatha],
    ["k-a", Pegon.Kaf + Pegon.Alif],
    ["ta", Pegon.Ta + Pegon.Fatha],
    ["e", Pegon.Alif + Pegon.Fatha + Pegon.Ya],
    ["a", Pegon.Ha + Pegon.Fatha]
]

const maduraSuffixesRules: PlainRule[] = [
    ["en", Pegon.Fatha + Pegon.Ya + Pegon.Nun],
    ["ag_hi", Pegon.Alif + Pegon.Ghain + Pegon.Kasra + Pegon.Ya],
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
    if (suffix.match(/^(-an|an)/)) {
        if (baseWord[baseWord.length-1].match(/[iueo]/)) {
            return transliterate(suffix, prepareRules(suffixAnForOpenSyllable))
        } else if (baseWord[baseWord.length-1].match(/a/)) {
            return transliterate(suffix, prepareRules(suffixAnForBaseWordWithEndingA))
        } else{
            return transliterate(suffix, prepareRules(suffixAnForClosedSyllable))
        }
    } 

    if (baseWord[baseWord.length-1].match(/^[aiueoWAY]/) && suffix[0].match(/^[aiueo]/)) {
        return transliterateMaduraSuffixesVowel(suffix, baseWord)
    }

    return transliterate(suffix, prepareRules(maduraSuffixesRules))
}

const sundaPrefixesRules: PlainRule[] = [
    ["pan_g", Pegon.Peh + Pegon.Fatha + Pegon.Nga],
    ["tin_g", Pegon.Ta + Pegon.Kasra + Pegon.Ya + Pegon.Nga],
    ["ba", Pegon.Ba + Pegon.Fatha],
    ["di", Pegon.Dal + Pegon.Kasra + Pegon.Ya],
    ["d-i", Pegon.Dal + Pegon.Ya],
    ["ka+A", Pegon.Kaf + Pegon.Fatha + Pegon.Alif],
    ["ka", Pegon.Kaf + Pegon.Fatha],
    ["k-a", Pegon.Kaf + Pegon.Alif],
    ["pa", Pegon.Peh + Pegon.Fatha],
    ["sa+A", Pegon.Sin + Pegon.Fatha + Pegon.Alif],
    ["sa", Pegon.Sin + Pegon.Fatha],
    ["s-a", Pegon.Sin + Pegon.Alif],
    ["pika", Pegon.Peh + Pegon.Kasra + Pegon.Ya + Pegon.Kaf + Pegon.Fatha],
    ["pi", Pegon.Peh + Pegon.Kasra + Pegon.Ya],
    ["si", Pegon.Sin + Pegon.Kasra + Pegon.Ya],
    ["ti", Pegon.Ta + Pegon.Kasra + Pegon.Ya],
    ["man_g", Pegon.Mim + Pegon.Fatha + Pegon.Nga],
    ["mika", Pegon.Mim + Pegon.Kasra + Pegon.Ya + Pegon.Kaf + Pegon.Fatha],
    ["mi", Pegon.Mim + Pegon.Kasra + Pegon.Ya],
    ["ma", Pegon.Mim + Pegon.Fatha],
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
    if (suffix.match(/^(-an|an)/)) {
        if (baseWord[baseWord.length-1].match(/[iueo]/)) {
            return transliterate(suffix, prepareRules(suffixAnForOpenSyllable))
        } else if (baseWord[baseWord.length-1].match(/a/)) {
            return transliterate(suffix, prepareRules(suffixAnForBaseWordWithEndingA))
        } else{
            return transliterate(suffix, prepareRules(suffixAnForClosedSyllable))
        }
    } 

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
        [new RegExp(`(${key})([bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ](_[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ12345678])?(.|^.)?)?([bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ](_[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ12345678])?(-a|a-A|a))([bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ](_[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ])?(.|^.)?)?([bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ](_[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ12345678])?(-a|a-A|a))([bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ](_[bcdfghjklmnpqrstvwxyzBCDFGHJKLMNPQRSTVWXYZ12345678])?(.|^.)?)?`), `${val}$2$5$8$11$14`])


const firstSyllableWithSoundARules: RegexRule[] =
    firstSyllableWithSoundA(ruleProduct(consonantRules, aForClosedSyllable));

const countSyllable = (word: string): number => {
    const matches = word.match(/(a-A|-aA|-a|-i|-u|aA|e_u|a_i|a_u|\^e|\`[aiueoAIUEO]|[aiueoAIUEO]){1}/g)
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
    prepareRules(chainRule<Rule>(
        firstSyllableWithSoundARules,
        vowelHamzaAsWordEndingRules,
        shaddaRules,
        specialPrepositionAsSingleWordsRule,

        oneSyllableWithSoundAAsSingleSyllableRules,

        closedSyllableWithSoundARules,
        doubleVowelClosedSyllableAsNotBeginningRules,

        doubleVowelClosedSyllableAsWordBeginningRules,
        doubleVowelAsWordBeginningRules,
        beginningSingleVowelAsWordBeginningRules,

        singleVowelSyllableAsWordEndingRules,

        doubleVowelSyllableRules,


        singleVowelSyllableRules,

        
        singleVowelRules,
        deadConsonantRules,
        marbutahRules,
        punctuationRules,
        sukunRules,
        pepetRules,
        numbers
    ))

export const transliterateLatinToPegon = (latinString: string, lang: string = "Indonesia"): string => {
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
const digraphVowelRules2: PlainRule[] = [
    ["^e", Pegon.MaddaAbove],
    ["`a", Pegon.YaWithHamzaAbove + Pegon.Alif],
    ["`U", Pegon.WawHamzaAbove + Pegon.Damma],
    ["-^i", Pegon.Maksura],
    ["^i", Pegon.Kasra + Pegon.Maksura]
]

const inverseAForClosedSyllable2: PlainRule[] =
    asInverse(aForClosedSyllable2)

const inverseOneSyllableWithSoundAAsSingleSyllableRules: RegexRule[] =
    asSingleWord(asInverse(oneSyllableWithSoundARules))

const inverseFirstSyllableWithSoundA = (rules: PlainRule[]): RegexRule[] =>
    prepareRules(rules).map<RegexRule>(([key, val]) =>
        [new RegExp(`(${key})([ثحخڊࢮڎذشصضطظغڠۑڽࢴڬڭݢݣؼبتچدرزسعجفقپڤڤكࢴڮلمنهءئؤݒݘ]?[\u0652|\u06E1]?)([ثحخڊࢮڎذشصضطظغڠۑڽࢴڬڭݢݣؼبتچدرزسعجفقڤڤكࢴپڮلمنهويءئؤݒݘ](\u0627|\u064E\u0627|\u064E))([ثحخڊࢮڎذشصضطظغڠۑڽࢴڬڭݢݣؼبتچدرزسعجفقڤڤكࢴڮپلمنهءئݒݘؤ]?[\u0652|\u06E1]?)([ثحخڊࢮڎذشصضطظغڠۑڽࢴڬڭݢݣؼبتچدݒݘرپزسعجفقڤڤكࢴڮلمنهويءئؤ](\u0627|\u064E\u0627|\u064E))([ثحخڊࢮڎذشصضطظغڠۑڽࢴپڬڭݢݣؼبتچدرزݒݘسعجفقڤڤكࢴڮلمنهءئؤ]?[\u0652|\u06E1]?)`), `${val}$2$3$5$6$8`])

const inverseFirstSyllableWithSoundARules: RegexRule[] =
    inverseFirstSyllableWithSoundA(asInverse(ruleProduct(consonantRules, aForClosedSyllable2)))

const inverseClosedSyllable = (rules: PlainRule[]): RegexRule[] =>
    prepareRules(rules).map<RegexRule>(([key, val]) =>
        [new RegExp(`(${key})(?![اويَُِّࣤ])`), `${val}`])

const inverseClosedSyllableAsNotBeginning = (rules: PlainRule[]): RegexRule[] =>
    prepareRules(rules).map<RegexRule>(([key, val]) =>
        [new RegExp(`(.)(${key})(?![اويَُِّࣤ])`), `$1${val}`])

const inverseClosedSyllableAsWordBeginning = (rules: PlainRule[]): RegexRule[] =>
    prepareRules(rules).map<RegexRule>(([key, val]) =>
        [new RegExp(`(^|[${wordDelimitingPatterns}])(${key})(?![اويَُِّࣤ])`), `$1${val}`])

const inverseClosedSyllableWithSoundARules: RegexRule[] =
    inverseClosedSyllable(asInverse(closedSyllableWithSoundA))

const inverseDoubleVowelForClosedSyllableLeftSideDigraph: PlainRule[] =
    asInverse(doubleVowelForClosedSyllableLeftSideDigraph)

const inverseDoubleVowelForClosedSyllableLeftSideMonograph: PlainRule[] =
    asInverse(doubleVowelForClosedSyllableLeftSideMonograph)

const inverseDoubleVowelForClosedSyllableLeftSideHarakat: PlainRule[] =
    asInverse(doubleVowelForClosedSyllableLeftSideHarakat)

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

const inverseBeginningIngForDeadConsonantRules: PlainRule[] =
    asInverse(beginningIngForDeadConsonantRules)

const inverseBeginningIngForOpenConsonant: PlainRule[] =
    asInverse(beginningIngForOpenConsonant)

const inverseBeginningIngForOpenConsonantRules: PlainRule[] =
    chainRule(
        ruleProduct(inverseBeginningIngForOpenConsonant, inverseMonographVowelRules),
        ruleProduct(inverseBeginningIngForOpenConsonant, inverseDigraphVowelRules),
        ruleProduct(inverseBeginningIngForOpenConsonant, inverseVowelsHarakatRules)
    )

const inverseBeginningVowelAsWordBeginningRules: RegexRule[] =
    asWordBeginning(chainRule(
        inverseBeginningIngForOpenConsonantRules,
        inverseBeginningIngForDeadConsonantRules,
        inverseBeginningDigraphVowelRules,
        inverseBeginningMonographVowelRules))

const inverseBeginningOAndERules = (rules: PlainRule[]): RegexRule[] =>
    prepareRules(rules).map<RegexRule>(([key, val]) =>
        [new RegExp(`(^|[${wordDelimitingPatterns}])(${key})(?![اَُِّࣤ]|ي?![اويَُِّࣤ]|و?![اويَُِّࣤ])`), `$1${val}`])

const inverseBeginningOAndEAsWordBeginningRules: RegexRule[] =
    inverseBeginningOAndERules(asInverse(BeginningOAndERules))

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

const inverseDoubleSameConsonantRules: PlainRule[] =
    asInverse(doubleSameConsonantRules)

const inverseShaddaRules: PlainRule[] =
    chainRule(
        ruleProduct(inverseDoubleSameConsonantRules, inverseMonographVowelRules),
        ruleProduct(inverseDoubleSameConsonantRules, inverseDigraphVowelRules),
        ruleProduct(inverseDoubleSameConsonantRules, inverseVowelsHarakatRules),
        inverseDoubleSameConsonantRules)

const inverseDoubleMonographConsonantRules: PlainRule[] =
    asInverse(doubleMonographConsonantRules)

const inversePunctuationRules: PlainRule[] =
    asInverse(punctuationRules)

const inverseSingleVowelSyllableRules: Rule[] =
    chainRule<Rule>(
        asWordEnding(ruleProduct(inverseOpenConsonantRules,
                                 inverseSingleEndingVowelRules)),
        ruleProduct(inverseOpenConsonantRules, inverseMonographVowelRules),
        ruleProduct(inverseOpenConsonantRules, inverseDigraphVowelRules),
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

const inverseDigraphVowelRules2: PlainRule[] =
    asInverse(digraphVowelRules2)

const inverseFathaHarakatForWawAndYa: PlainRule[] =
    asInverse(fathaHarakatForWawAndYa)

const inverseFathaHarakatForWawAndYaRules: PlainRule[] =
    ruleProduct(inverseOpenConsonantRules, 
        chainRule(
            ruleProduct(inverseFathaHarakatForWawAndYa, inverseDigraphVowelRules2),
            ruleProduct(inverseFathaHarakatForWawAndYa, inverseMonographVowelRules),
            ruleProduct(inverseFathaHarakatForWawAndYa, inverseVowelsHarakatRules),
        )
    )

const inverseVowelHamzaAsWordEndingRules: RegexRule[] =
    asWordEnding(asInverse(vowelHamzaEndingRules))

const inverseDoubleVowelClosedSyllableRules: PlainRule[] =
    ruleProduct(
        chainRule(
            ruleProduct(inverseDoubleVowelForClosedSyllableLeftSideHarakat, inverseAForClosedSyllable2),
            ruleProduct(inverseDoubleVowelForClosedSyllableLeftSideMonograph, inverseAForClosedSyllable2),
            ruleProduct(inverseDoubleVowelForClosedSyllableLeftSideDigraph, inverseAForClosedSyllable2),
        ),
        inverseOpenConsonantRules
    )

const inverseDoubleVowelForClosedSyllablAsNotBeginningeRules: RegexRule[] =
    inverseClosedSyllableAsNotBeginning(inverseDoubleVowelClosedSyllableRules)

const inverseDoubleVowelForClosedSyllablAsWordBeginningeRules: RegexRule[] =
    inverseClosedSyllableAsWordBeginning(
        ruleProduct([[Pegon.Alif, ""]], inverseDoubleVowelClosedSyllableRules)
    )

const inverseDoubleVowelAsWordBeginningRules: RegexRule[] =
    asWordBeginning(asInverse(
        ruleProduct([["", Pegon.Alif]], doubleVowelRules)
    ))

const inverseDoubleMonographVowelForIOAndIE: PlainRule[] =
    asInverse(doubleMonographVowelForIOAndIE)

const initiatePegonToLatinScheme = (): Rule[] => {
    return prepareRules(chainRule<Rule>(
        inverseDoubleMonographVowelForIOAndIE,
        inverseDoubleVowelForClosedSyllablAsWordBeginningeRules,
        inverseDoubleVowelAsWordBeginningRules,
        inverseBeginningOAndEAsWordBeginningRules,
        inverseBeginningVowelAsWordBeginningRules,
        inverseFirstSyllableWithSoundARules,
        inverseSpecialPrepositionAsSingleWordsRules,
        inverseVowelHamzaAsWordEndingRules,
        inverseOneSyllableWithSoundAAsSingleSyllableRules,
        inverseDoubleVowelForClosedSyllablAsNotBeginningeRules,
        inverseClosedSyllableWithSoundARules,
        inversePrefixWithBeginningVowelsAsWordBeginningRules,
        inversePrefixWithSpaceAsWordBeginningRules,
        //inverseDoubleMonographVowelAsBeginningSyllableRules,
        inverseDoubleEndingVowelAsWordEndingRules,
        inverseFathaHarakatForWawAndYaRules,
        inverseShaddaRules,
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
    ["T_H", "ṭ"],
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
    ["N_y", "ñ"],
    ["N_Y", "ñ"],
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
    ["a+A", "a"],
    ["-aA", "a"],
    ["aA", "a"],
    ["`_1", "`"],
    ["`-", "`"],
    ["`^e", "ě"],
    ["^e", "ě"],
    ["^i", "i"],
    ["^y", "y"],
    ["^c", "c"],
    ["`a", "a"],
    ["`i", "i"],
    ["`u", "u"],
    ["`e", "e"],
    ["`o", "o"],
    ["I", "i"],
    ["Y", "i"],
    ["O", "o"],
    ["E", "e"],
    ["A", "a"],
    ["U", "u"],
    ["G", "g"],
    ["-a", "a"],
    ["-i", "i"],
    ["-u", "u"],
    ["^.", ""],
    [".", ""],
    ["c_2", "c"],
    ["g_1", "g"],
    ["g_2", "g"],
    ["g_3", "g"],
    ["g_4", "g"],
    ["g_5", "g"],
    ["g_6", "g"],
    ["g_7", "g"],
    ["g_8", "g"],
    ["^A_1", "ā"],
    ["+", ""],
];

const vowelHamzaStandardLatinEndingRules: PlainRule[] = [
    ["a`a", "ak"],
    ["-a`a", "ak"],
    ["a-A`a", "ak"],
    ["i`i", "ik"],
    ["i.`i", "ik"],
    ["-i`i", "ik"],
    ["i-Y`i", "ik"],
    ["u`u", "uk"],
    ["u.`u", "uk"],
    ["-u`u", "uk"],
    ["u-W`u", "uk"],
    ["u`U", "uk"],
    ["u.`U", "uk"],
]

const changeFaToP: PlainRule[] = [
    ["f", "p"]
];

const convertToDoubleVowels: PlainRule[] = [
    ["uwa", "ua"],
    ["iya", "ia"],
    ["eya", "ea"],
];

const soundAAndMaksuraRules: PlainRule[] = [
    ["-a^i", "e"],
    ["a^i", "e"],
    ["a-A^i", "e"],
    ["-a-^i", "e"],
    ["a-^i", "e"],
    ["a-A-^i", "e"],
];

const sukunStandardLatinRules: PlainRule[] = [
    ["^.", ""],
    [".", ""],
];

const vowelHamzaStandardLatinAsWordEndingRules: RegexRule[] =
    asWordEnding(vowelHamzaStandardLatinEndingRules)

const sukunStandardLatinAsWordEndingRules: RegexRule[] =
    asWordEnding(sukunStandardLatinRules)

const reversibleToStandardLatinScheme: Rule[] =
    prepareRules(chainRule<Rule>(
        sukunStandardLatinAsWordEndingRules,
        vowelHamzaStandardLatinAsWordEndingRules,
        soundAAndMaksuraRules,
        standardLatinRules
))

export const transliterateReversibleLatinToStandardLatin =
    (reversibleString: string, lang:string): string => {
        if (lang === 'Jawa' || lang === 'Sunda') {
            var firstResult = transliterate(
                transliterate(reversibleString, reversibleToStandardLatinScheme),
                prepareRules(changeFaToP))
        } else
            var firstResult = transliterate(reversibleString, reversibleToStandardLatinScheme)

        return transliterate(firstResult, convertToDoubleVowels)
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
