import { StemmerIndonesia } from './stemmerIndonesia';
import { StemmerJawa } from './stemmerJawa';
import { StemmerMadura } from './stemmerMadura';
import { StemmerSunda } from './stemmerSunda';

export interface StemResult {
    baseWord: string;
    affixSequence: string[];
}

const stemmerIndonesia = new StemmerIndonesia()
const stemmerJawa = new StemmerJawa()
const stemmerSunda = new StemmerSunda()
const stemmerMadura = new StemmerMadura()

export function stem(kataAwal: string, bahasa: string): StemResult {
    const stemResultTemp: StemResult = {
        baseWord: '',
        affixSequence: [],
    };
    if (bahasa === "Jawa") {
        // Function Jawa Stemmer
        return stemmerJawa.stem(kataAwal);
    } else if (bahasa === "Sunda") {
        // Function Sunda Stemmer
        return stemmerSunda.stem(kataAwal);
    } else if (bahasa === "Madura") {
        // Function Madura Stemmer
        return stemmerMadura.stem(kataAwal);
    } else {
        // Function Indonesian Stemmer
        return stemmerIndonesia.stem(kataAwal);
    }
}