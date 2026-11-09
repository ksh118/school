const Timetable = require('comcigan-parser');

module.exports = async (req, res) => {
  const { name, atptName = '' } = req.query;
  if (!name) return res.status(400).json({ error: 'name 필요' });
  try {
    const t = new Timetable();
    await t.init({ tableDepth: 3, cache: 1000 * 60 * 10 });
    const found = (await t.search(name)).map(r => ({
      region: r.region || r.지역, name: r.name || r.학교명, code: r.code || r.학교코드
    })).filter(r => r.name === name);
    if (!found.length) return res.status(404).json({ error: '컴시간에서 학교를 찾지 못했어요' });
    const pick = found.find(r => r.region && atptName.includes(r.region.slice(0, 2))) || found[0];
    await t.setSchool(pick.code);
    const raw = await t.getTimetable();
    const out = {};
    raw.forEach((g, gi) => {
      if (!g) return;
      g.forEach((c, ci) => {
        if (!c) return;
        (out[gi] = out[gi] || {})[ci] = [1, 2, 3, 4, 5].map(d =>
          (c[d] || []).map(p => ({ subject: p.subject || '', teacher: p.teacher || '', changed: !!p.changed })));
      });
    });
    res.setHeader('Cache-Control', 's-maxage=600');
    res.json(out);
  } catch (e) { res.status(500).json({ error: String(e) }); }
};
