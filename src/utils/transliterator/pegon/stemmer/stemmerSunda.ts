import type { StemResult } from "./stemmer";
import { RootWordDictionary } from "./rootWordDictionary";
import { kataDasarSunda } from './data/kataDasarSunda';
import { StemmerCache } from "./stemmerCache";
import { normalizeText } from "./textNormalizer";
import { plainPrefixRule, allomorphRules, plainSuffixRule } from "./sundaStemmingRules";

export class StemmerSunda {
    private sundaDict = new RootWordDictionary(kataDasarSunda)
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
        const context = new Context(word, this.sundaDict)
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
            this.checkInfixAndAllomorph();
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

        for(let i=0; i<3; i++) {
            this.checkInfixAndAllomorph();
            if ( this.wordFound ){
                this.currentRemoved = [...temp, ...this.currentRemoved]
                return     
            }

            [res, removed] = plainPrefixRule(this.currentWord)
            if (removed !== '' && !temp.includes(removed)) {
                this.currentWord = res
                temp.push(removed)
                
                if ( this.dictionary.isRootWord(normalizeText(res)) ) {
                    this.currentRemoved = [...temp, ...this.currentRemoved]
                    this.wordFound = true
                    return              
                }
            }
        }
        this.currentRemoved = [...temp, ...this.currentRemoved]
    }

    private checkAllomorph(word: string): boolean {
        let res: string = word
        let removed: string = ''
        let temp: string[] = []

        for (let ruleArr of allomorphRules) {
            for (let rule of ruleArr) {
                [res, removed] = rule(word)
                if ( this.dictionary.isRootWord(normalizeText(res)) ) {
                    return true
                }
            }
        }
        return false
    }

    private checkInfix(word: string): string {
        var regex = /^([bcdfghjklmnpqrstvwxyz])(al|um|ar|in)([aiueo]|\^e)(.*)$/
        const matches = word.match(regex)
        if (matches) {
            return matches[1] + matches[3] + matches[4]
        }
        return word
    }

    private checkInfixAndAllomorph(): void {
        if (this.wordFound)
            return
        
        var infixlessWord = this.checkInfix(this.currentWord)

        if (this.currentWord !== infixlessWord) {
            this.wordFound = this.checkAllomorph(this.currentWord)
            if (!this.wordFound){
                this.wordFound = this.checkAllomorph(infixlessWord)
            }
        }
        else {
            this.wordFound = this.checkAllomorph(this.currentWord)
        }
    }

    private countSyllable(word: string): number {
        const matches = word.match(/(e_u|[aiueo]){1}/g)
        if (matches)
            return matches.length
        return 0
    }
}
