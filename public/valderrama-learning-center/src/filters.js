const normalize = (s) => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();

export function filterTutors(tutors, { search = '', level = '', mode = '' } = {}) {
  const term = normalize(search);
  return tutors.filter(t => {
    const haystack = normalize([t.name, t.specialty, ...t.subjects].join(' '));
    return (!term || haystack.includes(term)) && (!level || t.levels.includes(level)) && (!mode || t.modes.includes(mode));
  });
}

export function canRequestClassForMinor(audience, guardianAuthorized) {
  return audience === 'adulto' || (audience === 'menor' && guardianAuthorized === true);
}
