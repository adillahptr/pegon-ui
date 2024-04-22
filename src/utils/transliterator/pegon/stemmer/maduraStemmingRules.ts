export const plainPrefixRule = (input: string): [string, string] => {
    //Hapus plain prefix
    var regex = /^(pan_g|pam|pan)([bcdfghjklmnpqrstvwxyz])(.*)/
    var matches = input.match(regex)
    if (matches) {
        return [matches[2]+matches[3], matches[1]+'-']
    }

    regex = /^(koma|par|pe|pa|sa|ka|ta|e|a)(.*)/
    matches = input.match(regex)
    if (matches) {
        return [matches[2], matches[1]+'-']
    }
    return [input, '']
}


const allomorphRule1a = (input: string): [string, string] => {
    //ny-sV
    var regex = /^(n_y)([aiueo]|\^e)(.*)/
    const matches = input.match(regex)
    if (matches) {
        return ['s'+matches[2]+matches[3], matches[1]+'-']
    }
    return [input, '']
}

const allomorphRule1b = (input: string): [string, string] => {
    //ny-cV
    var regex = /^(n_y)([aiueo]|\^e)(.*)/
    const matches = input.match(regex)
    if (matches) {
        return ['c'+matches[2]+matches[3], matches[1]+'-']
    }
    return [input, '']
}

const allomorphRule2a = (input: string): [string, string] => {
    //m-pV
    var regex = /^(m)([aiueo]|\^e)(.*)/
    const matches = input.match(regex)
    if (matches) {
        return ['p'+matches[2]+matches[3], matches[1]+'-']
    }
    return [input, '']
}

const allomorphRule2b = (input: string): [string, string] => {
    //m-bV
    var regex = /^(m)([aiueo]|\^e)(.*)/
    const matches = input.match(regex)
    if (matches) {
        return ['b'+matches[2]+matches[3], matches[1]+'-']
    }
    return [input, '']
}

const allomorphRule3 = (input: string): [string, string] => {
    //n-tV
    var regex = /^(n)([aiueo]|\^e)(.*)/
    const matches = input.match(regex)
    if (matches) {
        return ['t'+matches[2]+matches[3], matches[1]+'-']
    }
    return [input, '']
}

const allomorphRule4a = (input: string): [string, string] => {
    //ngV
    var regex = /^(n_g)([aiueo]|\^e)(.*)/
    const matches = input.match(regex)
    if (matches) {
        return [matches[2]+matches[3], matches[1]+'-']
    }
    return [input, '']
}

const allomorphRule4b = (input: string): [string, string] => {
    //ng-kV
    var regex = /^(n_g)([aiueo]|\^e)(.*)/
    const matches = input.match(regex)
    if (matches) {
        return ['k'+matches[2]+matches[3], matches[1]+'-']
    }
    return [input, '']
}

export const allomorphRules = [
        [allomorphRule1a, allomorphRule1b],
        [allomorphRule2a, allomorphRule2b],
        [allomorphRule3],
        [allomorphRule4a, allomorphRule4b]
    ]

export const plainSuffixRule = (input: string): [string, string] => {
    // Hapus plain suffix
    var regex = /(.*)(en|ag_hi|an|e|a)$/
    const matches = input.match(regex)
    if (matches) {
        return [matches[1], '-'+matches[2]]
    }
    return [input, '']
}