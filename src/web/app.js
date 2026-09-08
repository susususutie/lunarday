/**
 * 农历生日日历生成器 - Web 版
 */
(function() {
  'use strict';

  const LUNAR_MONTHS = ['正月', '二月', '三月', '四月', '五月', '六月',
                        '七月', '八月', '九月', '十月', '冬月', '腊月'];
  const LUNAR_DAYS_TENS = ['初', '十', '廿', '三'];
  const LUNAR_DAYS_ONES = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  const STORAGE_KEY = 'lunarday_data';
  const STORAGE_VERSION = 1;

  // ==================== 工具函数 ====================

  function getLunarMonthName(month) {
    return LUNAR_MONTHS[month - 1] || '';
  }

  function getLunarDayName(day) {
    if (day === 10) return '初十';
    if (day === 20) return '二十';
    if (day === 30) return '三十';
    const ten = Math.floor(day / 10);
    const one = day % 10;
    return LUNAR_DAYS_TENS[ten] + (ten === 1 ? '十' : '') + LUNAR_DAYS_ONES[one];
  }

  function escapeICS(str) {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  function isWeChat() {
    return /MicroMessenger/i.test(navigator.userAgent);
  }

  function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ==================== 核心逻辑 ====================

  function getSolarLunar() {
    var solarLunar = window.solarLunar;
    if (!solarLunar) return null;
    return solarLunar.lunar2solar || (solarLunar.default && solarLunar.default.lunar2solar);
  }

  function lunar2solar(year, lunarMonth, lunarDay, isLeapMonth) {
    var convertFn = getSolarLunar();
    if (!convertFn) {
      throw new Error('农历转换库加载失败');
    }
    return convertFn(year, lunarMonth, lunarDay, isLeapMonth);
  }

  function getLunarDisplayStr(member) {
    var prefix = member.isLeapMonth ? '闰' : '';
    return prefix + getLunarMonthName(member.lunarMonth) + getLunarDayName(member.lunarDay);
  }

  function generateMemberEvents(member, years) {
    var events = [];
    var convertFn = getSolarLunar();
    
    for (var i = 0; i < years.length; i++) {
      var year = years[i];
      try {
        var solar;
        var usedFallback = false;
        
        if (member.isLeapMonth) {
          try {
            solar = lunar2solar(year, member.lunarMonth, member.lunarDay, true);
          } catch (e) {
            if (member.useNormalMonthWhenNoLeap) {
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
          error: member.isLeapMonth && !member.useNormalMonthWhenNoLeap 
            ? '该年无此日期（闰月生日约每2-3年一次）' 
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
        var lunarMonthName = getLunarMonthName(member.lunarMonth);
        var lunarDayName = getLunarDayName(member.lunarDay);
        var prefix = member.isLeapMonth ? '闰' : '';
        var uid = member.name + '-lunar-' + event.year + '-' + Date.now() + '@lunarday';

        events.push('BEGIN:VEVENT\n' +
          'DESCRIPTION:农历' + prefix + lunarMonthName + lunarDayName + '\n' +
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

    var icsContent = 'BEGIN:VCALENDAR\n' +
      'CALSCALE:GREGORIAN\n' +
      'PRODID:-//' + escapeICS(config.calendarName) + '//Lunar Calendar Birthday//CN\n' +
      'VERSION:2.0\n' +
      'X-APPLE-CALENDAR-COLOR:' + config.calendarColor + '\n' +
      'X-WR-CALNAME:' + escapeICS(config.calendarName) + '\n' +
      events.join('\n') + '\n' +
      'END:VCALENDAR';

    return icsContent.replace(/\n/g, '\r\n');
  }

  // ==================== 数据持久化 ====================

  function saveData(members, settings) {
    try {
      var data = { version: STORAGE_VERSION, members: members, settings: settings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('保存数据失败:', e);
      return false;
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
      console.warn('加载数据失败:', e);
      return null;
    }
  }

  // ==================== UI 状态 ====================

  var members = [];
  var settings = { calendarName: '家庭农历生日', calendarColor: '#0088FF' };

  // ==================== DOM 操作 ====================

  function populateYearSelects() {
    var currentYear = new Date().getFullYear();
    var yearStart = document.getElementById('year-start');
    var yearEnd = document.getElementById('year-end');
    
    for (var y = currentYear - 5; y <= currentYear + 5; y++) {
      yearStart.add(new Option(y, y));
      yearEnd.add(new Option(y, y));
    }
    
    yearStart.value = currentYear;
    yearEnd.value = currentYear + 1;
  }

  function createMonthOptions() {
    var options = ['<option value="">月</option>'];
    LUNAR_MONTHS.forEach(function(name, i) {
      options.push('<option value="' + (i + 1) + '">' + name + '</option>');
    });
    return options.join('');
  }

  function createDayOptions() {
    var options = ['<option value="">日</option>'];
    for (var d = 1; d <= 30; d++) {
      options.push('<option value="' + d + '">' + getLunarDayName(d) + '</option>');
    }
    return options.join('');
  }

  function createMemberCard(member, index) {
    var monthOptions = createMonthOptions();
    var dayOptions = createDayOptions();
    var isLeap = member && member.isLeapMonth;
    var monthName = member && member.lunarMonth ? getLunarMonthName(member.lunarMonth) : '';
    var useNormal = member ? member.useNormalMonthWhenNoLeap : true;
    
    return '<div class="member-card" data-index="' + index + '">' +
      '<button class="delete-btn" data-index="' + index + '" title="删除">&times;</button>' +
      '<div class="form-row full">' +
        '<div class="form-group">' +
          '<label>姓名</label>' +
          '<input type="text" class="form-control member-name" value="' + (member ? member.name : '') + '" placeholder="如：老爸、老妈、小明" data-field="name">' +
        '</div>' +
      '</div>' +
      '<div class="form-row">' +
        '<div class="form-group">' +
          '<label>农历年份</label>' +
          '<input type="number" class="form-control member-birth-year" value="' + (member ? member.birthYear : '') + '" placeholder="如：1971" min="1900" max="2100" data-field="birthYear">' +
        '</div>' +
        '<div class="form-group">' +
          '<label>农历月日</label>' +
          '<div style="display: flex; gap: 8px;">' +
            '<select class="form-control member-month" data-field="lunarMonth">' + monthOptions + '</select>' +
            '<select class="form-control member-day" data-field="lunarDay">' + dayOptions + '</select>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="checkbox-group">' +
        '<input type="checkbox" id="leap-' + index + '" class="member-leap" ' + (isLeap ? 'checked' : '') + '>' +
        '<label for="leap-' + index + '">闰月</label>' +
      '</div>' +
      '<div class="leap-options" id="leap-options-' + index + '" style="display: ' + (isLeap ? 'block' : 'none') + ';">' +
        '<div class="leap-hint">' +
          '<svg class="leap-hint-icon" viewBox="0 0 16 16" fill="currentColor"><path d="M8 16A8 8 0 108 0a8 8 0 000 16zm.93-9.412l-1 4.705c-.07.34.029.533.304.533.194 0 .487-.07.686-.246l-.088.416c-.287.346-.92.598-1.465.598-.703 0-1.002-.422-.808-1.319l.738-3.468c.064-.293.006-.399-.287-.399l-.451-.003.082-.381 2.29-.287z"/></svg>' +
          '<span>您的生日是农历' + (isLeap ? '闰' : '') + monthName + getLunarDayName(member ? member.lunarDay : 1) + 
          (isLeap ? '。在没有闰' + monthName + '的年份（约每2-3年一次），将使用' + monthName + '作为生日。' : '') + '</span>' +
        '</div>' +
        '<div class="fallback-checkbox">' +
          '<input type="checkbox" id="fallback-' + index + '" class="member-fallback" ' + (useNormal ? 'checked' : '') + '>' +
          '<label for="fallback-' + index + '">无闰月时使用普通' + monthName + '作为生日</label>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function renderMembers() {
    var container = document.getElementById('members-list');
    
    if (members.length === 0) {
      container.innerHTML = '<p class="empty-state">点击"添加家人"开始</p>';
      return;
    }
    
    container.innerHTML = members.map(function(m, i) { return createMemberCard(m, i); }).join('');
    attachMemberEvents();
    
    members.forEach(function(m, i) {
      var monthSelect = document.querySelector('.member-card[data-index="' + i + '"] .member-month');
      var daySelect = document.querySelector('.member-card[data-index="' + i + '"] .member-day');
      if (monthSelect && m.lunarMonth) monthSelect.value = m.lunarMonth;
      if (daySelect && m.lunarDay) daySelect.value = m.lunarDay;
    });
  }

  function readMembersFromDOM() {
    var cards = document.querySelectorAll('.member-card');
    var newMembers = [];
    
    cards.forEach(function(card) {
      var name = card.querySelector('.member-name').value.trim();
      var birthYear = parseInt(card.querySelector('.member-birth-year').value);
      var lunarMonth = parseInt(card.querySelector('.member-month').value);
      var lunarDay = parseInt(card.querySelector('.member-day').value);
      var isLeapMonth = card.querySelector('.member-leap').checked;
      var useNormalMonthWhenNoLeap = card.querySelector('.member-fallback').checked;
      
      if (name && birthYear && lunarMonth && lunarDay) {
        newMembers.push({
          name: name,
          birthYear: birthYear,
          lunarMonth: lunarMonth,
          lunarDay: lunarDay,
          isLeapMonth: isLeapMonth,
          useNormalMonthWhenNoLeap: useNormalMonthWhenNoLeap
        });
      }
    });
    
    members = newMembers;
    saveData(members, settings);
    updatePreview();
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
    
    var birthdaysWithEvents = members.map(function(member) {
      return Object.assign({}, member, { events: generateMemberEvents(member, years) });
    });
    
    var html = '<table class="preview-table"><thead><tr>';
    html += '<th>姓名</th><th>农历生日</th><th>公历日期</th><th>年龄</th>';
    html += '</tr></thead><tbody>';
    
    birthdaysWithEvents.forEach(function(member) {
      var lunarStr = getLunarDisplayStr(member);
      
      member.events.forEach(function(event) {
        if (event.error) {
          html += '<tr><td>' + escapeHtml(member.name) + '</td><td>' + lunarStr + '</td>';
          html += '<td><span class="error">' + event.error + '</span></td><td>-</td></tr>';
        } else {
          var solarStr = event.year + '-' + String(event.month).padStart(2, '0') + '-' + String(event.day).padStart(2, '0');
          var fallbackMark = event.usedFallback ? ' <span class="fallback">(闰月fallback)</span>' : '';
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
    
    var birthdaysWithEvents = members.map(function(member) {
      return Object.assign({}, member, { events: generateMemberEvents(member, years) });
    });
    
    var icsContent = generateICS(birthdaysWithEvents, settings);
    var blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
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

  function updateLeapOptions(index, isLeap, lunarMonth) {
    var optionsDiv = document.getElementById('leap-options-' + index);
    if (!optionsDiv) return;
    
    optionsDiv.style.display = isLeap ? 'block' : 'none';
    
    if (isLeap && lunarMonth) {
      var monthName = getLunarMonthName(lunarMonth);
      var hintSpan = optionsDiv.querySelector('.leap-hint span');
      var labelEl = optionsDiv.querySelector('.member-fallback + label');
      
      if (hintSpan) {
        hintSpan.textContent = '您的生日是农历闰' + monthName + getLunarDayName(members[index].lunarDay) + 
          '。在没有闰' + monthName + '的年份（约每2-3年一次），将使用' + monthName + '作为生日。';
      }
      if (labelEl) {
        labelEl.textContent = '无闰月时使用普通' + monthName + '作为生日';
      }
    }
  }

  function attachMemberEvents() {
    document.querySelectorAll('.delete-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        var index = parseInt(this.dataset.index);
        members.splice(index, 1);
        saveData(members, settings);
        renderMembers();
        updatePreview();
      });
    });
    
    document.querySelectorAll('.member-card').forEach(function(card, index) {
      card.querySelector('.member-leap').addEventListener('change', function() {
        var monthSelect = card.querySelector('.member-month');
        var lunarMonth = parseInt(monthSelect.value);
        updateLeapOptions(index, this.checked, lunarMonth);
        readMembersFromDOM();
      });
      
      card.querySelector('.member-month').addEventListener('change', function() {
        var leapCheckbox = card.querySelector('.member-leap');
        if (leapCheckbox.checked) {
          updateLeapOptions(index, true, parseInt(this.value));
        }
        readMembersFromDOM();
      });
      
      card.querySelectorAll('.member-name, .member-birth-year, .member-day, .member-fallback').forEach(function(el) {
        el.addEventListener('change', readMembersFromDOM);
        el.addEventListener('input', readMembersFromDOM);
      });
    });
  }

  // ==================== 初始化 ====================

  function init() {
    if (isWeChat()) {
      document.getElementById('wechat-tip').style.display = 'flex';
      document.getElementById('copy-link-btn').addEventListener('click', function() {
        navigator.clipboard.writeText(window.location.href).then(function() {
          this.textContent = '已复制';
          setTimeout(function() { this.textContent = '复制链接'; }.bind(this), 2000);
        }.bind(this));
      });
    }
    
    populateYearSelects();
    
    var savedData = loadData();
    if (savedData) {
      members = savedData.members || [];
      settings = savedData.settings || settings;
      document.getElementById('calendar-name').value = settings.calendarName;
    }
    
    renderMembers();
    
    document.getElementById('add-member-btn').addEventListener('click', function() {
      members.push({
        name: '',
        birthYear: '',
        lunarMonth: '',
        lunarDay: '',
        isLeapMonth: false,
        useNormalMonthWhenNoLeap: true
      });
      renderMembers();
      
      var cards = document.querySelectorAll('.member-card');
      var lastCard = cards[cards.length - 1];
      if (lastCard) {
        lastCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        lastCard.querySelector('.member-name').focus();
      }
    });
    
    document.getElementById('year-start').addEventListener('change', updatePreview);
    document.getElementById('year-end').addEventListener('change', updatePreview);
    document.getElementById('calendar-name').addEventListener('change', function() {
      settings.calendarName = this.value;
      saveData(members, settings);
    });
    
    document.getElementById('download-btn').addEventListener('click', downloadICS);
    document.getElementById('close-modal').addEventListener('click', function() {
      document.getElementById('import-modal').style.display = 'none';
    });
    document.getElementById('import-modal').addEventListener('click', function(e) {
      if (e.target === this) this.style.display = 'none';
    });
    
    updatePreview();
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
