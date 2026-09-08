/**
 * 农历生日日历生成器 - Web 版
 */
(function() {
  'use strict';

  var LUNAR_MONTHS = ['正月', '二月', '三月', '四月', '五月', '六月',
                      '七月', '八月', '九月', '十月', '冬月', '腊月'];
  var LUNAR_DAYS = ['', '初一', '初二', '初三', '初四', '初五', '初六', '初七', '初八', '初九', '初十',
                    '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十',
                    '廿一', '廿二', '廿三', '廿四', '廿五', '廿六', '廿七', '廿八', '廿九', '三十'];
  var STORAGE_KEY = 'lunarday_data';
  var STORAGE_VERSION = 2;

  // ==================== 工具函数 ====================

  function getLunarMonthName(month) {
    return LUNAR_MONTHS[month - 1] || '';
  }

  function getLunarDayName(day) {
    return LUNAR_DAYS[day] || '';
  }

  function escapeICS(str) {
    return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
  }

  function isWeChat() {
    return /MicroMessenger/i.test(navigator.userAgent);
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ==================== 核心逻辑 ====================

  function getSolarLunar() {
    var sl = window.solarLunar;
    if (!sl) return null;
    return sl.lunar2solar || (sl.default && sl.default.lunar2solar);
  }

  function lunar2solar(year, month, day, isLeap) {
    var fn = getSolarLunar();
    if (!fn) throw new Error('农历转换库加载失败');
    return fn(year, month, day, isLeap);
  }

  function getLunarDisplayStr(member) {
    var prefix = member.isLeapMonth ? '闰' : '';
    return prefix + getLunarMonthName(member.lunarMonth) + getLunarDayName(member.lunarDay);
  }

  function generateMemberEvents(member, years, useFallback) {
    var events = [];
    
    for (var i = 0; i < years.length; i++) {
      var year = years[i];
      try {
        var solar;
        var usedFallback = false;
        
        if (member.isLeapMonth) {
          try {
            solar = lunar2solar(year, member.lunarMonth, member.lunarDay, true);
          } catch (e) {
            if (useFallback) {
              solar = lunar2solar(year, member.lunarMonth, member.lunarDay, false);
              usedFallback = true;
            } else {
              throw e;
            }
          }
        } else {
          solar = lunar2solar(year, member.lunarMonth, member.lunarDay, false);
        }
        
        events.push({
          year: year,
          month: solar.cMonth,
          day: solar.cDay,
          age: year - member.birthYear,
          usedFallback: usedFallback
        });
      } catch (e) {
        events.push({
          year: year,
          error: member.isLeapMonth && !useFallback 
            ? '该年无此日期（闰月约每2-3年一次）' 
            : (e.message || '转换失败')
        });
      }
    }
    
    return events;
  }

  function generateICS(birthdays, config) {
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

        events.push('BEGIN:VEVENT\n' +
          'DESCRIPTION:农历' + prefix + getLunarMonthName(member.lunarMonth) + getLunarDayName(member.lunarDay) + '\n' +
          'DTEND;VALUE=DATE:' + (event.year + 1) + pad(event.month) + pad(event.day) + '\n' +
          'DTSTAMP:' + dtstamp + '\n' +
          'DTSTART;VALUE=DATE:' + event.year + pad(event.month) + pad(event.day) + '\n' +
          'LAST-MODIFIED:' + dtstamp + '\n' +
          'SEQUENCE:0\n' +
          'SUMMARY;CHARSET=UTF-8;LANGUAGE=zh_CN:' + escapeICS(member.name) + event.age + '岁生日\n' +
          'TRANSP:TRANSPARENT\n' +
          'UID:' + uid + '\n' +
          'END:VEVENT');
      }
    }

    var ics = 'BEGIN:VCALENDAR\n' +
      'CALSCALE:GREGORIAN\n' +
      'PRODID:-//' + escapeICS(config.calendarName) + '//Lunar Calendar Birthday//CN\n' +
      'VERSION:2.0\n' +
      'X-APPLE-CALENDAR-COLOR:' + config.calendarColor + '\n' +
      'X-WR-CALNAME:' + escapeICS(config.calendarName) + '\n' +
      events.join('\n') + '\n' +
      'END:VCALENDAR';

    return ics.replace(/\n/g, '\r\n');
  }

  // ==================== 数据持久化 ====================

  function saveData(members, settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: STORAGE_VERSION,
        members: members,
        settings: settings
      }));
    } catch (e) {
      console.warn('保存数据失败:', e);
    }
  }

  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (data.version !== STORAGE_VERSION) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  // ==================== 状态 ====================

  var members = [];
  var settings = {
    calendarName: '家庭农历生日',
    calendarColor: '#0088FF',
    useFallback: true
  };

  // ==================== 初始化 ====================

  function init() {
    // 微信检测
    if (isWeChat()) {
      document.getElementById('wechat-tip').style.display = 'flex';
      document.getElementById('copy-link-btn').addEventListener('click', function() {
        var self = this;
        navigator.clipboard.writeText(window.location.href).then(function() {
          self.textContent = '已复制';
          setTimeout(function() { self.textContent = '复制链接'; }, 2000);
        });
      });
    }

    // 填充年份下拉
    var currentYear = new Date().getFullYear();
    var yearStart = document.getElementById('year-start');
    var yearEnd = document.getElementById('year-end');
    for (var y = currentYear - 5; y <= currentYear + 5; y++) {
      yearStart.add(new Option(y, y));
      yearEnd.add(new Option(y, y));
    }
    yearStart.value = currentYear;
    yearEnd.value = currentYear + 1;

    // 填充农历月日下拉
    var monthSelect = document.getElementById('input-month');
    var daySelect = document.getElementById('input-day');
    monthSelect.add(new Option('月', ''));
    LUNAR_MONTHS.forEach(function(name, i) {
      monthSelect.add(new Option(name, i + 1));
    });
    daySelect.add(new Option('日', ''));
    for (var d = 1; d <= 30; d++) {
      daySelect.add(new Option(getLunarDayName(d), d));
    }

    // 加载保存的数据
    var saved = loadData();
    if (saved) {
      members = saved.members || [];
      settings = Object.assign(settings, saved.settings || {});
      document.getElementById('calendar-name').value = settings.calendarName;
      document.getElementById('global-fallback').checked = settings.useFallback;
    }

    renderMembers();
    updatePreview();

    // 闰月复选框变化
    document.getElementById('input-leap').addEventListener('change', function() {
      var hint = document.getElementById('leap-hint');
      var hintText = document.getElementById('leap-hint-text');
      if (this.checked) {
        var monthVal = document.getElementById('input-month').value;
        if (monthVal) {
          var monthName = getLunarMonthName(parseInt(monthVal));
          hintText.textContent = '闰月生日约每2-3年一次，可在设置中选择无闰月时使用普通' + monthName + '月';
        } else {
          hintText.textContent = '请先选择农历月份';
        }
        hint.style.display = 'flex';
      } else {
        hint.style.display = 'none';
      }
    });

    // 月份变化时更新闰月提示
    document.getElementById('input-month').addEventListener('change', function() {
      if (document.getElementById('input-leap').checked && this.value) {
        var monthName = getLunarMonthName(parseInt(this.value));
        document.getElementById('leap-hint-text').textContent = 
          '闰月生日约每2-3年一次，可在设置中选择无闰月时使用普通' + monthName + '月';
      }
    });

    // 添加按钮
    document.getElementById('add-btn').addEventListener('click', addMember);

    // 输入框回车
    document.getElementById('input-name').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') addMember();
    });

    // 设置变化
    document.getElementById('year-start').addEventListener('change', updatePreview);
    document.getElementById('year-end').addEventListener('change', updatePreview);
    document.getElementById('calendar-name').addEventListener('change', function() {
      settings.calendarName = this.value;
      saveData(members, settings);
    });
    document.getElementById('global-fallback').addEventListener('change', function() {
      settings.useFallback = this.checked;
      saveData(members, settings);
      updatePreview();
    });

    // 下载按钮
    document.getElementById('download-btn').addEventListener('click', downloadICS);

    // 模态框
    document.getElementById('close-modal').addEventListener('click', function() {
      document.getElementById('import-modal').style.display = 'none';
    });
    document.getElementById('import-modal').addEventListener('click', function(e) {
      if (e.target === this) this.style.display = 'none';
    });
  }

  function addMember() {
    var name = document.getElementById('input-name').value.trim();
    var year = parseInt(document.getElementById('input-year').value);
    var month = parseInt(document.getElementById('input-month').value);
    var day = parseInt(document.getElementById('input-day').value);
    var isLeap = document.getElementById('input-leap').checked;

    if (!name) { alert('请输入姓名'); return; }
    if (!year) { alert('请输入农历年份'); return; }
    if (!month) { alert('请选择农历月份'); return; }
    if (!day) { alert('请选择农历日期'); return; }

    members.push({
      name: name,
      birthYear: year,
      lunarMonth: month,
      lunarDay: day,
      isLeapMonth: isLeap
    });

    // 清空输入
    document.getElementById('input-name').value = '';
    document.getElementById('input-year').value = '';
    document.getElementById('input-month').value = '';
    document.getElementById('input-day').value = '';
    document.getElementById('input-leap').checked = false;
    document.getElementById('leap-hint').style.display = 'none';

    saveData(members, settings);
    renderMembers();
    updatePreview();

    document.getElementById('input-name').focus();
  }

  function removeMember(index) {
    members.splice(index, 1);
    saveData(members, settings);
    renderMembers();
    updatePreview();
  }

  function renderMembers() {
    var container = document.getElementById('members-list');
    var count = document.getElementById('member-count');
    
    count.textContent = members.length + ' 人';
    
    if (members.length === 0) {
      container.innerHTML = '<p class="empty-state">还没有添加家人</p>';
      return;
    }
    
    var html = '';
    members.forEach(function(m, i) {
      var lunarStr = getLunarDisplayStr(m);
      html += '<div class="member-item">' +
        '<span class="member-info">' + escapeHtml(m.name) + ' · ' + lunarStr + ' · ' + m.birthYear + '年</span>' +
        '<button class="delete-btn" data-index="' + i + '">&times;</button>' +
      '</div>';
    });
    
    container.innerHTML = html;
    
    container.querySelectorAll('.delete-btn').forEach(function(btn) {
      btn.addEventListener('click', function() {
        removeMember(parseInt(this.dataset.index));
      });
    });
  }

  function updatePreview() {
    var container = document.getElementById('preview-container');
    var downloadBtn = document.getElementById('download-btn');
    
    if (members.length === 0) {
      container.innerHTML = '<p class="empty-state">添加家人后，转换结果将在这里显示</p>';
      downloadBtn.disabled = true;
      return;
    }
    
    var yearStart = parseInt(document.getElementById('year-start').value);
    var yearEnd = parseInt(document.getElementById('year-end').value);
    var years = [];
    for (var y = yearStart; y <= yearEnd; y++) years.push(y);
    
    var useFallback = document.getElementById('global-fallback').checked;
    
    var html = '<table class="preview-table"><thead><tr>';
    html += '<th>姓名</th><th>农历生日</th><th>公历日期</th><th>年龄</th>';
    html += '</tr></thead><tbody>';
    
    members.forEach(function(member) {
      var lunarStr = getLunarDisplayStr(member);
      var events = generateMemberEvents(member, years, useFallback);
      
      events.forEach(function(event) {
        if (event.error) {
          html += '<tr><td>' + escapeHtml(member.name) + '</td><td>' + lunarStr + '</td>';
          html += '<td><span class="error">' + event.error + '</span></td><td>-</td></tr>';
        } else {
          var solarStr = event.year + '-' + String(event.month).padStart(2, '0') + '-' + String(event.day).padStart(2, '0');
          var fallbackMark = event.usedFallback ? ' <span class="fallback">※</span>' : '';
          html += '<tr><td>' + escapeHtml(member.name) + '</td><td>' + lunarStr + fallbackMark + '</td>';
          html += '<td>' + solarStr + '</td><td>' + event.age + '岁</td></tr>';
        }
      });
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
    downloadBtn.disabled = false;
  }

  function downloadICS() {
    var yearStart = parseInt(document.getElementById('year-start').value);
    var yearEnd = parseInt(document.getElementById('year-end').value);
    var years = [];
    for (var y = yearStart; y <= yearEnd; y++) years.push(y);
    
    settings.calendarName = document.getElementById('calendar-name').value || '家庭农历生日';
    var useFallback = document.getElementById('global-fallback').checked;
    
    var birthdays = members.map(function(m) {
      return Object.assign({}, m, { events: generateMemberEvents(m, years, useFallback) });
    });
    
    var ics = generateICS(birthdays, settings);
    var blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = settings.calendarName + '.ics';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    document.getElementById('import-modal').style.display = 'flex';
  }

  function waitForSolarLunar(callback, maxAttempts) {
    maxAttempts = maxAttempts || 50;
    var attempts = 0;
    function check() {
      attempts++;
      if (getSolarLunar()) {
        callback();
      } else if (attempts < maxAttempts) {
        setTimeout(check, 100);
      } else {
        console.error('solarLunar library failed to load');
        callback();
      }
    }
    check();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { waitForSolarLunar(init); });
  } else {
    waitForSolarLunar(init);
  }
})();
