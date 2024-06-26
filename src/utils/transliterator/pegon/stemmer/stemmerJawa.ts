import type { StemResult } from "./stemmer";
import { RootWordDictionary } from "./rootWordDictionary";
import { kataDasarJawa } from './data/kataDasarJawa';
import { StemmerCache } from "./stemmerCache";
import { normalizeText } from "./textNormalizer";
import { plainPrefixRule, allomorphRules, plainSuffixRule } from "./jawaStemmingRules";

export class StemmerJawa {
    private jawaDict = new RootWordDictionary(kataDasarJawa)
    private cache = new StemmerCache()

    public stem(word: string): StemResult {
        return this.getData(word)
    }

    private getData(word: string): StemResult  {
        const dataFromCache = this.cache.get(word)
        if (!!dataFromCache) {
            return dataFromCache.result
        }

        return this.setData(word)
    }

    private setData(word: string): StemResult {
        const context = new Context(word, this.jawaDict)
        const result = context.execute()
      
        this.cache.set(word, result)

        return result
    }
}

class Context {
    private originalWord: string
    private currentWord: string
    private currentRemoved: string[]
    private result: StemResult
    private dictionary: RootWordDictionary
    private allomorphIndex = 0;
    private wordFound = false;

    constructor(originalWord: string, dictionary: RootWordDictionary) {
        this.originalWord = originalWord
        this.currentWord = originalWord
        this.result = {
            baseWord: originalWord,
            affixSequence: []
        }
        this.dictionary = dictionary
        this.currentRemoved = []
    }


        public execute(): StemResult {
        if (this.countSyllable(this.currentWord) <= 2) {
            return this.result
        }

        this.stem()
        if ( !this.wordFound ) 
            return this.result

        this.removeAllomorphFromSequence()
        this.recodeAffixes()
        this.result.baseWord = this.currentWord
        this.result.affixSequence = this.currentRemoved
        return this.result
    }

    private stem(): void {
        if ( this.dictionary.isRootWord(normalizeText(this.currentWord)) ){
            this.wordFound = true
            return
        }

        this.removeSuffixes()

        if ( this.wordFound )
            return

        if (this.countSyllable(this.currentWord) <= 2) {
            if (this.wordFound)
                return

            this.currentWord = this.originalWord
            this.currentRemoved = []
        }

        this.removePrefixes()

        if ( !this.wordFound ) {
            this.currentWord = this.originalWord
            this.currentRemoved = []
            this.allomorphIndex = 0

            this.removePrefixes()

            if ( this.wordFound )
                return

            this.removeSuffixes()
        }
        return
        
    }

    private removeSuffixes(): void {
        let res: string = this.currentWord
        let removed: string = ''
        let temp: string[] = []

        for(let i=0; i<3; i++) {
            this.checkAllomorph();
            if ( this.wordFound ){
                this.currentRemoved = [...this.currentRemoved, ...temp]
                return     
            }

            [res, removed] = plainSuffixRule(this.currentWord)
            if (removed !== '' && !temp.includes(removed)) {
                this.currentWord = res
                temp.unshift(removed)
                if ( this.dictionary.isRootWord(normalizeText(res)) ) {
                    this.currentRemoved = [...this.currentRemoved, ...temp]
                    this.wordFound = true
                    return              
                }
            }
        }
        this.currentRemoved = [...this.currentRemoved, ...temp]
    }


    private removePrefixes(): void {
        let res: string = this.currentWord
        let removed: string = ''
        let temp: string[] = []
        let allomorphIndexTemp = this.allomorphIndex

        for(let i=0; i<3; i++) {
            this.checkAllomorph();
            if ( this.wordFound ){
                this.currentRemoved = [...temp, ...this.currentRemoved]
                this.allomorphIndex = allomorphIndexTemp
                return     
            }

            [res, removed] = plainPrefixRule(this.currentWord)
            if (removed !== '' && !temp.includes(removed)) {
                this.currentWord = res
                temp.push(removed)
                allomorphIndexTemp += 1
                
                if ( this.dictionary.isRootWord(normalizeText(res)) ) {
                    this.currentRemoved = [...temp, ...this.currentRemoved]
                    this.allomorphIndex = allomorphIndexTemp
                    this.wordFound = true
                    return              
                }
            }
        }
        this.currentRemoved = [...temp, ...this.currentRemoved]
    }

    private checkAllomorph(): void {
        let res: string = this.currentWord
        let removed: string = ''
        let temp: string[] = []

        for (let ruleArr of allomorphRules) {
            if ( this.dictionary.isRootWord(normalizeText(this.currentWord))){
                return
            }

            for (let rule of ruleArr) {
                [res, removed] = rule(this.currentWord)
                if ( this.dictionary.isRootWord(normalizeText(res)) ) {
                    this.currentWord = res
                    this.currentRemoved.splice(this.allomorphIndex, 0, removed)
                    this.wordFound = true
                    return              
                }
            }
        }
    }

    private removeAllomorphFromSequence(): void {
        if (this.currentRemoved.length > this.allomorphIndex) {
            const matches = this.currentRemoved[this.allomorphIndex].match(/^(n_g\^e|n_g|n_y|n|m)-$/)
            if(matches) {
                if (matches[1] === 'n_g') {
                    if (this.currentWord[0].match(/[glwry]/)) {
                        if (this.allomorphIndex > 0)
                            this.currentRemoved[this.allomorphIndex-1] = this.currentRemoved[this.allomorphIndex-1].replace(/-$/, matches[0])
                        else
                            this.currentWord = matches[1]+this.currentWord
                    }

                    else if (this.currentWord[0] === 'k')
                        this.currentWord = matches[1]+this.currentWord.substring(1)

                    else if (this.currentWord[0].match(/([aiueo]|\^e)/))
                        this.currentWord = matches[1]+this.currentWord

                    this.currentRemoved.splice(this.allomorphIndex, 1)
                }

                else if (matches[1] === 'n_y') {
                    if (this.currentWord[0].match(/([aiueo]|\^e)/))
                        this.currentWord = matches[1]+this.currentWord
                    else
                        this.currentWord = matches[1]+this.currentWord.substring(1)
                    this.currentRemoved.splice(this.allomorphIndex, 1)
                }

                else if (matches[1] === 'n') {
                    if (this.currentWord[0].match(/(t|t_h|s)/))
                        this.currentWord = matches[1]+this.currentWord.substring(1)
                    else if (this.currentWord[0].match(/(d|d_h|j)/)) {
                        if (this.allomorphIndex > 0)
                            this.currentRemoved[this.allomorphIndex-1] = this.currentRemoved[this.allomorphIndex-1].replace(/-$/, matches[0])
                        else
                            this.currentWord = matches[1]+this.currentWord
                    }
                    else if (this.currentWord[0].match(/([aiueo]|\^e)/))
                        this.currentWord = matches[1]+this.currentWord
                    this.currentRemoved.splice(this.allomorphIndex, 1)
                }

                else if (matches[1] === 'm') {
                    if (this.currentWord[0].match(/(p|w)/))
                        this.currentWord = matches[1]+this.currentWord.substring(1)
                    else if (this.currentWord[0] === 'b') {
                        if (this.allomorphIndex > 0)
                            this.currentRemoved[this.allomorphIndex-1] = this.currentRemoved[this.allomorphIndex-1].replace(/-$/, matches[0])
                        else
                            this.currentWord = matches[1]+this.currentWord
                    }
                    else if (this.currentWord[0].match(/([aiueo]|\^e)/))
                        this.currentWord = matches[1]+this.currentWord

                    this.currentRemoved.splice(this.allomorphIndex, 1)
                }

                else if (matches[1] === 'n_g^e') {
                    this.currentWord = matches[1]+this.currentWord
                    this.currentRemoved.splice(this.allomorphIndex, 1)
                }
            }
        }
    }

    private recodeAffixes(): void {
        if(this.allomorphIndex-1 >= 0) {
            const prefixMatches = this.currentRemoved[this.allomorphIndex-1].match(/^(ta|da|ko|to)(k|r)-$/)
            if(prefixMatches) {
                if (this.currentWord[0].match(/([aiueo]|\^e)/)) {
                    this.currentWord = prefixMatches[2]+this.currentWord
                    this.currentRemoved[this.allomorphIndex-1] = prefixMatches[1]+'-'
                } 
            }
        }
    }

    private countSyllable(word: string): number {
        const matches = word.match(/[aiueo]{1}/g)
        if (matches)
            return matches.length
        return 0
    }
}
