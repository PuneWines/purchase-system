export const formatINR = (n) =>
  isNaN(n) ? "—" : Number(n).toFixed(2);

export const today = () => {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, '0')}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getFullYear()}`;
};
