/**
 * Utility to convert numeric amounts to words.
 * Supports South Asian (Lakh/Crore) format and standard International format.
 */

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
];

const TENS = [
  "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
];

function convertBelowThousand(n: number): string {
  let str = "";
  if (n >= 100) {
    str += ONES[Math.floor(n / 100)] + " Hundred ";
    n %= 100;
  }
  if (n >= 20) {
    str += TENS[Math.floor(n / 10)] + " ";
    n %= 10;
  }
  if (n > 0) {
    str += ONES[n] + " ";
  }
  return str.trim();
}

/**
 * Converts a number to Nepalese/Indian wording style (Rupees & Paisa with Lakh/Crore formatting)
 */
export function numberToWordsNepalese(amount: number): string {
  if (amount === 0) return "Zero Rupees Only";
  if (isNaN(amount) || amount < 0) return "";

  const parts = amount.toFixed(2).split(".");
  const rupeesPart = parseInt(parts[0], 10);
  const paisaPart = parseInt(parts[1], 10);

  let result = "";

  if (rupeesPart > 0) {
    let temp = rupeesPart;
    
    const crore = Math.floor(temp / 10000000);
    temp %= 10000000;
    
    const lakh = Math.floor(temp / 100000);
    temp %= 100000;
    
    const thousand = Math.floor(temp / 1000);
    temp %= 1000;
    
    const remaining = temp;

    if (crore > 0) {
      result += (crore < 100 ? convertBelowThousand(crore) : numberToWordsNepalese(crore).replace(" Rupees Only", "")) + " Crore ";
    }
    if (lakh > 0) {
      result += convertBelowThousand(lakh) + " Lakh ";
    }
    if (thousand > 0) {
      result += convertBelowThousand(thousand) + " Thousand ";
    }
    if (remaining > 0) {
      result += convertBelowThousand(remaining) + " ";
    }
    result = result.trim() + " Rupees";
  } else {
    result = "Zero Rupees";
  }

  if (paisaPart > 0) {
    result += " and " + convertBelowThousand(paisaPart) + " Paisa";
  }

  return result.trim() + " Only";
}

/**
 * Converts a number to standard International wording style (Rupees/Dollars & Cents/Paisa with Million/Billion formatting)
 */
export function numberToWordsInternational(amount: number): string {
  if (amount === 0) return "Zero Rupees Only";
  if (isNaN(amount) || amount < 0) return "";

  const parts = amount.toFixed(2).split(".");
  const majorPart = parseInt(parts[0], 10);
  const minorPart = parseInt(parts[1], 10);

  let result = "";

  if (majorPart > 0) {
    let temp = majorPart;

    const billion = Math.floor(temp / 1000000000);
    temp %= 1000000000;

    const million = Math.floor(temp / 1000000);
    temp %= 1000000;

    const thousand = Math.floor(temp / 1000);
    temp %= 1000;

    const remaining = temp;

    if (billion > 0) {
      result += convertBelowThousand(billion) + " Billion ";
    }
    if (million > 0) {
      result += convertBelowThousand(million) + " Million ";
    }
    if (thousand > 0) {
      result += convertBelowThousand(thousand) + " Thousand ";
    }
    if (remaining > 0) {
      result += convertBelowThousand(remaining) + " ";
    }
    result = result.trim() + " Rupees";
  } else {
    result = "Zero Rupees";
  }

  if (minorPart > 0) {
    result += " and " + convertBelowThousand(minorPart) + " Paisa";
  }

  return result.trim() + " Only";
}
