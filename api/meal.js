const neis = require('./_neis');
module.exports = async (req, res) => {
  const { atpt, code, from } = req.query;
  if (!atpt || !code || !from) return res.status(400).json({ error: '파라미터 부족' });
  const y = +from.slice(0, 4), m = +from.slice(4, 6) - 1, d = +from.slice(6, 8);
  const days = [0, 1, 2, 3, 4].map(i => {
    const t = new Date(y, m, d + i);
    return t.getFullYear() + String(t.getMonth() + 1).padStart(2, '0') + String(t.getDate()).padStart(2, '0');
  });
  try {
    const all = await Promise.all(days.map(ymd => neis('mealServiceDietInfo',
      { ATPT_OFCDC_SC_CODE: atpt, SD_SCHUL_CODE: code, MLSV_YMD: ymd }).catch(() => [])));
    const meals = all.flat().map(r => ({
      date: r.MLSV_YMD, type: r.MMEAL_SC_NM,
      dishes: r.DDISH_NM.split(/<br\s*\/?>/i).map(s => s.trim()).filter(Boolean),
      cal: r.CAL_INFO
    }));
    res.setHeader('Cache-Control', 's-maxage=3600');
    res.json(meals);
  } catch (e) { res.status(500).json({ error: String(e) }); }
};
