export function pluralize(n, forms, lang) {
  if (lang === 'uk') {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return forms.one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms.few;
    return forms.many;
  }
  return n === 1 ? forms.one : (forms.other || forms.many);
}

export function formatStreakDays(n, lang) {
  const labels = {
    uk: { one: 'день', few: 'дні', many: 'днів' },
    en: { one: 'day', other: 'days' },
    no: { one: 'dag', other: 'dager' }
  };
  const word = pluralize(n, labels[lang] || labels.en, lang);
  return `${n} ${word}`;
}
