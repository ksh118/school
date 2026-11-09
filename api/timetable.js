
let comciganModulePromise;

async function getComciganClass() {
  if (!comciganModulePromise) {
    comciganModulePromise = import('comcigan').then((mod) => {
      const Comcigan =
        mod.Comcigan || mod.default?.Comcigan || mod.default;

      if (!Comcigan) {
        throw new Error('Comcigan 클래스를 찾지 못했습니다.');
      }

      return Comcigan;
    });
  }

  return comciganModulePromise;
}

function pickSchool(schools, name, atptName) {
  if (!Array.isArray(schools) || !schools.length) {
    return null;
  }

  const exact = schools.filter(s =>
    (s.name || s.schoolName || s.SCHUL_NM) === name
  );

  const candidates = exact.length ? exact : schools;

  if (!atptName) return candidates[0];

  return candidates.find(s => {
    const region = s.region || s.regionName || '';
    return region &&
      (atptName.includes(region) || region.includes(atptName));
  }) || candidates[0];
}

function toCell(value) {
  if (value == null || value === '') {
    return {
      subject: '',
      teacher: '',
      changed: false
    };
  }

  if (typeof value === 'string' || typeof value === 'number') {
    return {
      subject: String(value),
      teacher: '',
      changed: false
    };
  }

  return {
    subject:
      value.subject ||
      value.subjectName ||
      value.name ||
      '',
    teacher:
      value.teacher ||
      value.teacherName ||
      '',
    changed: Boolean(value.changed || value.isChanged)
  };
}

function normalizeTimetable(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('시간표 데이터가 비어 있습니다.');
  }

  const result = {};

  const grades = Object.keys(raw).filter(
    key => /^\d+$/.test(key)
  );

  for (const grade of grades) {
    const gradeData = raw[grade];

    if (!gradeData || typeof gradeData !== 'object') {
      continue;
    }

    const classes = Object.keys(gradeData).filter(
      key => /^\d+$/.test(key)
    );

    for (const classNum of classes) {
      const classData = gradeData[classNum];

      if (!classData || typeof classData !== 'object') {
        continue;
      }

      const zeroBasedDays =
        Array.isArray(classData) &&
        classData[0] !== undefined;

      const days = [];

      for (let day = 0; day < 5; day++) {
        const sourceDay =
          classData[zeroBasedDays ? day : day + 1] || [];

        const zeroBasedPeriods =
          Array.isArray(sourceDay) &&
          sourceDay[0] !== undefined;

        const periods = [];

        const count = Array.isArray(sourceDay)
          ? sourceDay.length
          : 0;

        for (let period = 0; period < count; period++) {
          const item =
            sourceDay[
              zeroBasedPeriods ? period : period + 1
            ];

          periods.push(toCell(item));
        }

        while (
          periods.length &&
          !periods[periods.length - 1].subject
        ) {
          periods.pop();
        }

        days.push(periods);
      }

      if (days.some(day => day.length > 0)) {
        if (!result[grade]) {
          result[grade] = {};
        }

        result[grade][classNum] = days;
      }
    }
  }

  if (!Object.keys(result).length) {
    throw new Error(
      '시간표 데이터의 학년·반 형식을 확인하지 못했습니다.'
    );
  }

  return result;
}

module.exports = async (req, res) => {
  const name = String(req.query.name || '').trim();
  const atptName = String(req.query.atptName || '').trim();

  if (!name) {
    return res.status(400).json({
      error: '학교 이름이 필요합니다.'
    });
  }

  try {
    const Comcigan = await getComciganClass();

    // 컴시간 학교 검색
    const schools = await Comcigan.search(name);

    const school = pickSchool(
      schools,
      name,
      atptName
    );

    if (!school) {
      return res.status(404).json({
        error: '컴시간에서 학교를 찾지 못했습니다.'
      });
    }

    const schoolCode =
      school.schoolCode ?? school.code;

    if (schoolCode == null) {
      throw new Error(
        '컴시간 학교 식별 코드를 찾지 못했습니다.'
      );
    }

    // 학교 설정
    const comcigan = new Comcigan();

    await comcigan.init();

    comcigan.setSchoolCode(Number(schoolCode));

    // 전체 시간표 가져오기
    const raw = await comcigan.getTimetable();

    // 기존 사이트 형식으로 변환
    const timetable = normalizeTimetable(raw);

    res.setHeader(
      'Cache-Control',
      's-maxage=600, stale-while-revalidate=300'
    );

    return res.status(200).json(timetable);

  } catch (error) {
    console.error('[timetable api]', error);

    return res.status(500).json({
      error: error?.message ||
        '컴시간 시간표를 불러오지 못했습니다.'
    });
  }
};
