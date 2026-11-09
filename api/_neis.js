module.exports = async (svc, params) => {
  const key = process.env.NEIS_KEY;
  const p = new URLSearchParams({ Type: 'json', pIndex: '1', pSize: key ? '100' : '5', ...params });
  if (key) p.set('KEY', key);
  const j = await (await fetch(`https://open.neis.go.kr/hub/${svc}?${p}`)).json();
  return (j[svc] && j[svc][1] && j[svc][1].row) || [];
};
