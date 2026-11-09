const neis = require('./_neis');
module.exports = async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.status(400).json({ error: 'q 필요' });
  try {
    const [mid, high] = await Promise.all(
      ['중학교', '고등학교'].map(k => neis('schoolInfo', { SCHUL_NM: q, SCHUL_KND_SC_NM: k })));
    const list = [...mid, ...high].map(r => ({
      name: r.SCHUL_NM, kind: r.SCHUL_KND_SC_NM,
      atpt: r.ATPT_OFCDC_SC_CODE, atptName: r.ATPT_OFCDC_SC_NM,
      code: r.SD_SCHUL_CODE, addr: r.ORG_RDNMA
    }));
    res.setHeader('Cache-Control', 's-maxage=86400');
    res.json(list);
  } catch (e) { res.status(500).json({ error: String(e) }); }
};
