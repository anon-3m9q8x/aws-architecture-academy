// All learning modules wait for the authenticated account snapshot before reading.
// Guest keys are preserved; account records never replace the guest's originals.
await window.AcademyAccount.ready;

const copy = value => value == null ? value : JSON.parse(JSON.stringify(value));
function warning() {
  const node = document.getElementById('storage-warning');
  if (node) node.hidden = false;
}
export const store = {
  get(key, fallback) {
    if (window.AcademyAccount.isLearningKey(key)) return window.AcademyAccount.get(key, copy(fallback));
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? copy(fallback); }
    catch { warning(); return copy(fallback); }
  },
  set(key, value) {
    try {
      if (window.AcademyAccount.isLearningKey(key)) window.AcademyAccount.set(key, value);
      else localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch { warning(); return false; }
  }
};
