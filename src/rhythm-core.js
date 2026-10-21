export function scoringWindowSeconds(interval) {
  if (!Number.isFinite(interval) || interval <= 0) throw new RangeError('Invalid interval');
  return Math.min(0.23, interval * 0.44);
}
export function nearestBeatIndex(t, first, interval, count) {
  if (![t, first, interval].every(Number.isFinite) || !Number.isInteger(count) || count < 1 || interval <= 0) return -1;
  const index = Math.round((t - first) / interval);
  if (index < 0 || index >= count || Math.abs(t - (first + index * interval)) > scoringWindowSeconds(interval)) return -1;
  return index;
}
export function scoreBeats(errors, bpm, extras = 0, penalty = 2) {
  if (!Array.isArray(errors) || errors.length === 0 || !Number.isFinite(bpm) || bpm <= 0) throw new RangeError('Invalid inputs');
  const windowMs = scoringWindowSeconds(60 / bpm) * 1000;
  const hits = errors.filter(Number.isFinite);
  const total = errors.reduce((sum, t) => sum + (Number.isFinite(t) ? Math.max(0,100 * (1 - Math.abs(t) / windowMs)) : 0),0);
  const score = Math.max(0, Math.min(100, Math.round(total/errors.length - Math.max(0,extras)*penalty)));
  const meanAbs = hits.length ? hits.reduce((sum,t) => sum+Math.abs(t),0)/hits.length : null;
  const meanSigned = hits.length ? hits.reduce((sum,t) => sum+t,0)/hits.length : null;
  return {score,hits:hits.length,meanAbs,meanSigned,windowMs};
}
export function rankResults(history,bpm,limit=5) {
  if (!Array.isArray(history)) return [];
  return history.filter(x=>x && x.bpm===bpm && Number.isFinite(x.score) && x.score>=0 && x.score<=100)
    .sort((a,b)=>b.score-a.score || (Number.isFinite(a.meanAbs)?a.meanAbs:Infinity)-(Number.isFinite(b.meanAbs)?b.meanAbs:Infinity) || (b.time||0)-(a.time||0))
    .slice(0,Math.max(0,limit));
}
