import solarLunar from 'solarlunar';

export const LUNAR_MONTHS = ['正月', '二月', '三月', '四月', '五月', '六月',
  '七月', '八月', '九月', '十月', '冬月', '腊月'];

export const LUNAR_DAYS = ['', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
  '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
  '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];

export function getLunarMonthName(month) {
  return LUNAR_MONTHS[month - 1] || '';
}

export function getLunarDayName(day) {
  return LUNAR_DAYS[day] || '';
}

export function escapeICS(str) {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

export function getLunarDisplayStr(member) {
  return (member.isLeapMonth ? '闰' : '') + getLunarMonthName(member.lunarMonth) + getLunarDayName(member.lunarDay);
}

export function generateMemberEvents(member, years, useFallback) {
  var events = [];
  for (var i = 0; i < years.length; i++) {
    var year = years[i];
    try {
      var solar, usedFallback = false;
      if (member.isLeapMonth) {
        var leapResult = solarLunar.lunar2solar(year, member.lunarMonth, member.lunarDay, true);
        if (leapResult && leapResult !== -1) {
          solar = leapResult;
        } else if (useFallback) {
          solar = solarLunar.lunar2solar(year, member.lunarMonth, member.lunarDay, false);
          if (!solar || solar === -1) throw new Error('转换失败');
          usedFallback = true;
        } else {
          throw new Error('该年无此闰月日期（闰月约每2-3年一次）');
        }
      } else {
        solar = solarLunar.lunar2solar(year, member.lunarMonth, member.lunarDay, false);
        if (!solar || solar === -1) throw new Error('转换失败');
      }
      events.push({ year: year, month: solar.cMonth, day: solar.cDay, age: year - member.birthYear, usedFallback: usedFallback });
    } catch (e) {
      events.push({ year: year, error: e.message || '转换失败' });
    }
  }
  return events;
}

export function generateICS(birthdays, config) {
  var dtstamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0] + 'Z';
  var events = [];
  for (var i = 0; i < birthdays.length; i++) {
    var member = birthdays[i];
    for (var j = 0; j < member.events.length; j++) {
      var event = member.events[j];
      if (event.error) continue;
      var pad = function(n) { return String(n).padStart(2, '0'); };
      var prefix = member.isLeapMonth ? '闰' : '';
      var uid = member.name + '-lunar-' + event.year + '-' + Date.now() + '@lunarday';
      events.push('BEGIN:VEVENT\nDESCRIPTION:农历' + prefix + getLunarMonthName(member.lunarMonth) + getLunarDayName(member.lunarDay) + '\nDTEND;VALUE=DATE:' + (event.year + 1) + pad(event.month) + pad(event.day) + '\nDTSTAMP:' + dtstamp + '\nDTSTART;VALUE=DATE:' + event.year + pad(event.month) + pad(event.day) + '\nLAST-MODIFIED:' + dtstamp + '\nSEQUENCE:0\nSUMMARY;CHARSET=UTF-8;LANGUAGE=zh_CN:' + escapeICS(member.name) + event.age + '岁生日\nTRANSP:TRANSPARENT\nUID:' + uid + '\nEND:VEVENT');
    }
  }
  return ('BEGIN:VCALENDAR\nCALSCALE:GREGORIAN\nPRODID:-//' + escapeICS(config.calendarName) + '//Lunar Calendar Birthday//CN\nVERSION:2.0\nX-APPLE-CALENDAR-COLOR:' + config.calendarColor + '\nX-WR-CALNAME:' + escapeICS(config.calendarName) + '\n' + events.join('\n') + '\nEND:VCALENDAR').replace(/\n/g, '\r\n');
}
