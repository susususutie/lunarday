#!/usr/bin/env node

import { Command } from 'commander';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { getLunarMonthName, getLunarDayName, generateMemberEvents, generateICS } from '../src/core.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseMemberString(str) {
  const cleanStr = str.replace(/^["']|["']$/g, '');

  const parts = cleanStr.split(':');
  if (parts.length < 2 || parts.length > 3) {
    console.error(`Error: 格式无效 "${str}"`);
    console.error('正确格式: "姓名:YYYYMMDD" 或 "姓名:YYYYMMDD:leap"');
    console.error('例如: "张三:19950103" "李四:19880215:leap"');
    process.exit(1);
  }

  const [name, dateStr, leapFlag] = parts;

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

  const isLeapMonth = leapFlag === 'leap';

  return { name, lunarMonth: month, lunarDay: day, birthYear: year, isLeapMonth };
}

const program = new Command();

program
  .name('lunarday')
  .description(`农历生日日历生成器 (Lunar Calendar Birthday)

用法:
  $ lunarday "成员:农历生日" [选项]

示例:
  $ lunarday "老妈:19710101"
  $ lunarday "老妈:19710101" "老爸:19720202"
  $ lunarday "老妈:19710101" -y 2026,2027
  $ lunarday "老妈:19710101" -o 老妈生日.ics
  $ lunarday "闰月生日:19880215:leap"

成员格式:
  "姓名:YYYYMMDD"         普通农历生日
  "姓名:YYYYMMDD:leap"    闰月生日
  YYYYMMDD 为农历出生日期，例如 19710101 表示农历1971年1月1日

选项说明:
  -y, --years    指定生成的年份，多个用逗号分隔（默认：当前年和下一年）
  -o, --output   输出文件路径（默认：农历生日日历.ics）
  -n, --name     日历名称（默认：家庭农历生日）
  -c, --color    日历颜色，十六进制（默认：#0088FF）
  --no-fallback  闰月不存在时不使用普通月份`)
  .version('1.0.0');

program
  .argument('[members...]', 'Members in format "姓名:YYYYMMDD" or "姓名:YYYYMMDD:leap"')
  .option('-y, --years <years>', 'Years to generate (comma-separated)', (val) => val.split(',').map(Number))
  .option('-o, --output <path>', 'Output ICS file path', '农历生日日历.ics')
  .option('-n, --name <name>', 'Calendar name', '家庭农历生日')
  .option('-c, --color <color>', 'Calendar color (hex)', '#0088FF')
  .option('--no-fallback', 'Do not fallback to regular month when leap month is unavailable')
  .action((members, options) => {
    if (!members || members.length === 0) {
      console.error('Error: 请提供成员信息');
      console.error('用法: lunarday "姓名:YYYYMMDD" [选项]');
      console.error('例如: lunarday "老妈:19710101" -y 2026');
      process.exit(1);
    }

    const currentYear = new Date().getFullYear();
    const years = options.years || [currentYear, currentYear + 1];

    const config = {
      calendarName: options.name,
      calendarColor: options.color
    };

    const birthdays = members.map(m => parseMemberString(m));

    const birthdaysWithEvents = birthdays.map(member => ({
      ...member,
      events: generateMemberEvents(member, years, options.fallback)
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
      const prefix = member.isLeapMonth ? '闰' : '';
      const lunarStr = `${prefix}${member.lunarMonth}月${member.lunarDay}日`;
      for (const event of member.events) {
        if (event.error) {
          console.log(`  ${member.name}\t${lunarStr}\t${event.year}\t❌ ${event.error}`);
        } else {
          const solarStr = `${event.year}-${String(event.month).padStart(2, '0')}-${String(event.day).padStart(2, '0')}`;
          const fallbackMark = event.usedFallback ? ' (fallback)' : '';
          console.log(`  ${member.name}\t${lunarStr}\t${solarStr}\t${event.age}岁${fallbackMark}`);
        }
      }
    }
    console.log('─'.repeat(55));
  });

program.parse();
