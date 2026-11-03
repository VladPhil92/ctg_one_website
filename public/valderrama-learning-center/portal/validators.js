export const MIN_PASSWORD_LENGTH = 12;
export const FILE_LIMIT = 8 * 1024 * 1024;
export const ACCEPTED_MIME = new Map([
  ['application/pdf', 'pdf'],
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
]);
export function normalizeEmail(value) {
  return String(value ?? '').trim().toLocaleLowerCase('en-US');
}
export function validatePassword(value) {
  return typeof value === 'string' && value.length >= MIN_PASSWORD_LENGTH && value.length <= 128;
}
export function validateProfile(type, name) {
  return ['guardian', 'adult_learner', 'tutor'].includes(type) &&
    typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 100;
}
export function validateLearner(nickname, stage, grade) {
  return typeof nickname === 'string' && nickname.trim().length >= 2 &&
    nickname.trim().length <= 50 &&
    ['preschool','primary','secondary','high_school'].includes(stage) &&
    typeof grade === 'string' && grade.trim().length >= 1 && grade.trim().length <= 40;
}
export function validateAttachment(file) {
  if (!file || !ACCEPTED_MIME.has(file.type)) return 'Documento no permitido. Use PDF, JPG o PNG.';
  if (file.size <= 0 || file.size > FILE_LIMIT) return 'El archivo debe pesar entre 1 byte y 8 MB.';
  return '';
}
export function sanitizeSubjects(raw) {
  return [...new Set(String(raw).split(',').map(x => x.trim()).filter(Boolean))]
    .slice(0, 15).map(x => x.slice(0, 65));
}
export function makeObjectPath(userId, file, randomId) {
  const error = validateAttachment(file);
  if (error) throw new Error(error);
  if (!/^[a-f0-9-]{36}$/i.test(userId) || !/^[a-f0-9-]{36}$/i.test(randomId)) throw new Error('Identificador inválido.');
  return userId + '/' + randomId + '.' + ACCEPTED_MIME.get(file.type);
}
