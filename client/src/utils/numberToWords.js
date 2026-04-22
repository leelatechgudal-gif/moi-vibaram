// Number to words converter (supports English and basic Tamil logic)

const a = ['', 'one ', 'two ', 'three ', 'four ', 'five ', 'six ', 'seven ', 'eight ', 'nine ', 'ten ', 'eleven ', 'twelve ', 'thirteen ', 'fourteen ', 'fifteen ', 'sixteen ', 'seventeen ', 'eighteen ', 'nineteen '];
const b = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

const taA = ['', 'ஒன்று', 'இரண்டு', 'மூன்று', 'நான்கு', 'ஐந்து', 'ஆறு', 'ஏழு', 'எட்டு', 'ஒன்பது', 'பத்து', 'பதினொன்று', 'பன்னிரண்டு', 'பதிமூன்று', 'பதினான்கு', 'பதினைந்து', 'பதினாறு', 'பதினேழு', 'பதினெட்டு', 'பத்தொன்பது'];
const taB = ['', '', 'இருபது', 'முப்பது', 'நாற்பது', 'ஐம்பது', 'அறுபது', 'எழுபது', 'எண்பது', 'தொண்ணூறு'];
const taC = ['', 'நூறு', 'இருநூறு', 'முன்னூறு', 'நாநூறு', 'ஐநூறு', 'அறுநூறு', 'எழுநூறு', 'எண்ணூறு', 'தொள்ளாயிரம்'];

export function numberToWords(num, lang = 'en') {
    if (!num || isNaN(num) || num === 0) return '';
    num = parseInt(num, 10);
    
    if (lang === 'ta') {
        if (num > 9999999) return 'மிகப்பெரிய தொகை'; // Simplified Tamil for demo
        let str = '';
        if (num >= 100000) {
            let lakh = Math.floor(num / 100000);
            str += convertTamilBelowThousand(lakh) + ' லட்சம் ';
            num %= 100000;
        }
        if (num >= 1000) {
            let thousand = Math.floor(num / 1000);
            if (thousand === 1) str += 'ஓராயிரம் ';
            else str += convertTamilBelowThousand(thousand) + ' ஆயிரம் ';
            num %= 1000;
        }
        str += convertTamilBelowThousand(num);
        return str.trim() + ' ரூபாய் மட்டும்';
    } else {
        if (num.toString().length > 9) return 'overflow';
        let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
        if (!n) return; let str = '';
        str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'crore ' : '';
        str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'lakh ' : '';
        str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'thousand ' : '';
        str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'hundred ' : '';
        str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
        return str.trim() + ' rupees only';
    }
}

function convertTamilBelowThousand(num) {
    if (num === 0) return '';
    let str = '';
    if (num >= 100) {
        let h = Math.floor(num / 100);
        str += taC[h] + ' ';
        num %= 100;
    }
    if (num > 0) {
        if (num < 20) {
            str += taA[num] + ' ';
        } else {
            let t = Math.floor(num / 10);
            let u = num % 10;
            str += taB[t] + ' ';
            if (u > 0) str += taA[u] + ' ';
        }
    }
    return str.trim();
}
