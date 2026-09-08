#!/usr/bin/env node

const { Command } = require('commander');
const path = require('path');
const fs = require('fs');
const solarLunar = require('solarlunar').default;

// Helper: Get lunar month name in Chinese
function getLunarMonthName(month) {
  const months = ['正月', '二月', '三月', '四月', '五月', '六月',
                  '七月', '八月', '九月', '十月', '冬月', '腊月'];
  return months[month - 1];
}

// Helper: Get lunar day name in Chinese
function getLunarDayName(day) {
  const tens = ['初', '十', '廿', '三'];
  const ones = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

  if (day === 10) return '初十';
  if (day === 20) return '二十';
  if (day === 30) return '三十';

  const ten = Math.floor(day / 10);
  const one = day % 10;

  return tens[ten] + (ten === 1 ? '十' : '') + ones[one];
}

// Parse member string: "姓名:YYYYMMDD"
function parseMemberString(str) {
  const cleanStr = str.replace(/^["']|["']$/g, '');

  const parts = cleanStr.split(':');
  if (parts.length !== 2) {
    console.error(`Error: 格式无效 "${str}"`);
    console.error('正确格式: "姓名:YYYYMMDD"');
    console.error('例如: "张三:19950103"');
    process.exit(1);
  }

  const [name, dateStr] = parts;

  if (!/^\d{8}$/.test(dateStr)) {
    console.error(`Error: 日期格式无效 "${dateStr}"`);
    console.error('正确格式: YYYYMMDD（8位数字）');
    console.error('例如: 19950103');
    process.exit(1);
  }

  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6));
  const day = parseInt(dateStr.substring(6, 8));

  if (month < 1 || month > 12) {
    console.error(`Error: 农历月份无效 ${month}`);
    console.error('农历月份范围: 1-12');
    process.exit(1);
  }

  if (day < 1 || day > 30) {
    console.error(`Error: 农历日期无效 ${day}`);
    console.error('农历日期范围: 1-30');
    process.exit(1);
  }

  return { name, lunarMonth: month, lunarDay: day, birthYear: year };
}

// Generate birthday events for a member
function generateMemberEvents(member, years) {
  const events = [];

  for (const year of years) {
    try {
      const solar = solarLunar.lunar2solar(year, member.lunarMonth, member.lunarDay);
      events.push({
        year,
        month: solar.cMonth,
        day: solar.cDay,
        age: year - member.birthYear
      });
    } catch (e) {
      console.error(`Warning: ${member.name} - ${year}年转换失败: ${e.message}`);
    }
  }

  return events;
}

// Generate ICS content
function generateICS(birthdays, config) {
  const dtstamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0] + 'Z';
  const events = [];

  for (const member of birthdays) {
    for (const event of member.events) {
      const pad = (n) => String(n).padStart(2, '0');
      const lunarMonthName = getLunarMonthName(member.lunarMonth);
      const lunarDayName = getLunarDayName(member.lunarDay);
      const uid = `${member.name}-lunar-birthday-${event.year}`;

      events.push(`BEGIN:VEVENT
DESCRIPTION:农历${lunarMonthName}${lunarDayName}
DTEND;VALUE=DATE:${event.year + 1}${pad(event.month)}${pad(event.day)}
DTSTAMP:${dtstamp}
DTSTART;VALUE=DATE:${event.year}${pad(event.month)}${pad(event.day)}
LAST-MODIFIED:${dtstamp}
SEQUENCE:0
SUMMARY;LANGUAGE=zh_CN:${member.name}${event.age}岁生日
TRANSP:TRANSPARENT
UID:${uid}
END:VEVENT`);
    }
  }

  return `BEGIN:VCALENDAR
CALSCALE:GREGORIAN
PRODID:-//${config.calendarName}//Lunar Calendar Birthday//CN
VERSION:2.0
X-APPLE-CALENDAR-COLOR:${config.calendarColor}
X-WR-CALNAME:${config.calendarName}
${events.join('\n')}
END:VCALENDAR`;
}

// Main
const program = new Command();

program
  .name('lcb')
  .description(`农历生日日历生成器 (Lunar Calendar Birthday)

用法:
  $ lcb "成员:农历生日" [选项]

示例:
  $ lcb "张三:19950103"
  $ lcb "张三:19950103" "李四:19920709"
  $ lcb "张三:19950103" -y 2026,2027
  $ lcb "张三:19950103" -o my-birthday.ics
  $ lcb "张三:19950103" -n "我的生日" -c "#FF0000"

成员格式:
  "姓名:YYYYMMDD"
  YYYYMMDD 为农历出生日期，例如 19950103 表示农历1995年1月3日

选项说明:
  -y, --years    指定生成的年份，多个用逗号分隔（默认：当前年和下一年）
  -o, --output   输出文件路径（默认：农历生日日历.ics）
  -n, --name     日历名称（默认：家庭农历生日）
  -c, --color    日历颜色，十六进制（默认：#0088FF）`)
  .version('1.0.0');

program
  .argument('[members...]', 'Members in format "姓名:YYYYMMDD"')
  .option('-y, --years <years>', 'Years to generate (comma-separated)', (val) => val.split(',').map(Number))
  .option('-o, --output <path>', 'Output ICS file path', '农历生日日历.ics')
  .option('-n, --name <name>', 'Calendar name', '家庭农历生日')
  .option('-c, --color <color>', 'Calendar color (hex)', '#0088FF')
  .action((members, options) => {
    if (!members || members.length === 0) {
      console.error('Error: 请提供成员信息');
      console.error('用法: lcb "姓名:YYYYMMDD" [选项]');
      console.error('例如: lcb "张三:19950103" -y 2026');
      process.exit(1);
    }

    const currentYear = new Date().getFullYear();
    const years = options.years || [currentYear, currentYear + 1];

    const config = {
      calendarName: options.name,
      calendarColor: options.color
    };

    const birthdays = members.map(m => parseMemberString(m));

    // Generate events for each member
    const birthdaysWithEvents = birthdays.map(member => ({
      ...member,
      events: generateMemberEvents(member, years)
    }));

    const outputPath = path.resolve(options.output);
    const icsContent = generateICS(birthdaysWithEvents, config);
    fs.writeFileSync(outputPath, icsContent, 'utf8');

    console.log(`✅ Generated: ${outputPath}`);
    console.log(`📅 Years: ${years.join(', ')}`);
    console.log(`👥 Members: ${birthdays.map(m => m.name).join(', ')}`);

    console.log('\n📊 Summary:');
    console.log('─'.repeat(55));
    for (const member of birthdaysWithEvents) {
      const lunarStr = `${member.lunarMonth}月${member.lunarDay}日`;
      for (const event of member.events) {
        const solarStr = `${event.year}-${String(event.month).padStart(2, '0')}-${String(event.day).padStart(2, '0')}`;
        console.log(`  ${member.name}\t${lunarStr}\t${solarStr}\t${event.age}岁`);
      }
    }
    console.log('─'.repeat(55));
  });

program.parse();
