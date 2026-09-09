/**
 * 农历生日日历生成器 - Web 版
 */
import { LUNAR_MONTHS, getLunarMonthName, getLunarDayName, getLunarDisplayStr, generateMemberEvents, generateICS } from './core.js';

(function() {
  'use strict';

  var STORAGE_KEY = 'lunarday_data';
  var STORAGE_VERSION = 2;

  function isWeChat() { return /MicroMessenger/i.test(navigator.userAgent); }
  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function saveData(members, settings) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STORAGE_VERSION, members: members, settings: settings }));
    } catch (e) {}
  }

  function loadData() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      return data.version === STORAGE_VERSION ? data : null;
    } catch (e) { return null; }
  }

  var members = [];
  var settings = { calendarName: '家庭农历生日', calendarColor: '#2563EB', useFallback: true };

  function init() {
    if (isWeChat()) {
      document.getElementById('wechat-tip').style.display = 'flex';
      document.getElementById('copy-link-btn').addEventListener('click', function() {
        var self = this;
        navigator.clipboard.writeText(window.location.href).then(function() { self.textContent = '已复制'; setTimeout(function() { self.textContent = '复制链接'; }, 2000); });
      });
    }

    var currentYear = new Date().getFullYear();
    var yearStart = document.getElementById('year-start');
    var yearEnd = document.getElementById('year-end');
    var inputYear = document.getElementById('input-year');
    for (var y = currentYear - 95; y <= currentYear + 5; y++) {
      yearStart.add(new Option(y, y));
      yearEnd.add(new Option(y, y));
      inputYear.add(new Option(y, y));
    }
    yearStart.value = currentYear;
    yearEnd.value = currentYear + 1;

    var monthSelect = document.getElementById('input-month');
    var daySelect = document.getElementById('input-day');
    monthSelect.add(new Option('月', ''));
    LUNAR_MONTHS.forEach(function(name, i) { monthSelect.add(new Option(name, i + 1)); });
    daySelect.add(new Option('日', ''));
    for (var d = 1; d <= 30; d++) { daySelect.add(new Option(getLunarDayName(d), d)); }

    var saved = loadData();
    if (saved) {
      members = saved.members || [];
      settings = Object.assign(settings, saved.settings || {});
      document.getElementById('calendar-name').value = settings.calendarName;
      document.getElementById('global-fallback').checked = settings.useFallback;
    }

    renderMembers();
    updatePreview();

    document.getElementById('input-leap').addEventListener('change', function() {
      var hint = document.getElementById('leap-hint');
      var hintText = document.getElementById('leap-hint-text');
      if (this.checked) {
        var monthVal = document.getElementById('input-month').value;
        var monthName = monthVal ? getLunarMonthName(parseInt(monthVal)) : '';
        hintText.textContent = monthName ? '闰月生日约每2-3年一次，可在设置中选择无闰月时使用普通' + monthName + '月' : '请先选择农历月份';
        hint.style.display = 'flex';
      } else {
        hint.style.display = 'none';
      }
    });

    document.getElementById('input-month').addEventListener('change', function() {
      if (document.getElementById('input-leap').checked && this.value) {
        document.getElementById('leap-hint-text').textContent = '闰月生日约每2-3年一次，可在设置中选择无闰月时使用普通' + getLunarMonthName(parseInt(this.value)) + '月';
      }
    });

    document.getElementById('add-btn').addEventListener('click', addMember);
    document.getElementById('input-name').addEventListener('keypress', function(e) { if (e.key === 'Enter') addMember(); });

    document.getElementById('year-start').addEventListener('change', updatePreview);
    document.getElementById('year-end').addEventListener('change', updatePreview);
    document.getElementById('calendar-name').addEventListener('change', function() { settings.calendarName = this.value; saveData(members, settings); });
    document.getElementById('global-fallback').addEventListener('change', function() { settings.useFallback = this.checked; saveData(members, settings); updatePreview(); });

    document.getElementById('download-btn').addEventListener('click', downloadICS);
    document.getElementById('close-modal').addEventListener('click', function() { document.getElementById('import-modal').style.display = 'none'; });
    document.getElementById('import-modal').addEventListener('click', function(e) { if (e.target === this) this.style.display = 'none'; });
  }

  function addMember() {
    var name = document.getElementById('input-name').value.trim();
    var year = parseInt(document.getElementById('input-year').value);
    var month = parseInt(document.getElementById('input-month').value);
    var day = parseInt(document.getElementById('input-day').value);
    var isLeap = document.getElementById('input-leap').checked;

    if (!name) { alert('请输入姓名'); return; }
    if (!year) { alert('请选择农历年份'); return; }
    if (!month) { alert('请选择农历月份'); return; }
    if (!day) { alert('请选择农历日期'); return; }

    members.push({ name: name, birthYear: year, lunarMonth: month, lunarDay: day, isLeapMonth: isLeap });

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

    if (members.length === 0) {
      container.innerHTML = '';
      count.innerHTML = '';
      return;
    }

    var html = '';
    members.forEach(function(m, i) {
      html += '<div class="member-item">' +
        '<div class="member-avatar">' + m.name.charAt(0) + '</div>' +
        '<span class="member-info">' + escapeHtml(m.name) + ' · ' + getLunarDisplayStr(m) + ' · ' + m.birthYear + '年</span>' +
        '<button class="member-delete" data-index="' + i + '">&times;</button>' +
      '</div>';
    });
    container.innerHTML = html;

    container.querySelectorAll('.member-delete').forEach(function(btn) {
      btn.addEventListener('click', function() { removeMember(parseInt(this.dataset.index)); });
    });

    count.innerHTML = '<div class="member-count-badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg> ' + members.length + ' 人</div>';
  }

  function updatePreview() {
    var container = document.getElementById('preview-container');
    var downloadBtn = document.getElementById('download-btn');
    var countEl = document.getElementById('preview-count');

    if (members.length === 0) {
      container.innerHTML = '<p class="empty-state">添加家人后，转换结果将在这里显示</p>';
      downloadBtn.disabled = true;
      countEl.textContent = '';
      return;
    }

    var yearStart = parseInt(document.getElementById('year-start').value);
    var yearEnd = parseInt(document.getElementById('year-end').value);
    var years = [];
    for (var y = yearStart; y <= yearEnd; y++) years.push(y);

    var useFallback = document.getElementById('global-fallback').checked;
    var totalCount = 0;

    var html = '<table class="preview-table"><thead><tr><th>姓名</th><th>农历生日</th><th>公历日期</th><th>年龄</th><th></th></tr></thead><tbody>';

    members.forEach(function(member) {
      var lunarStr = getLunarDisplayStr(member);
      var events = generateMemberEvents(member, years, useFallback);

      events.forEach(function(event) {
        totalCount++;
        if (event.error) {
          html += '<tr><td><div class="table-member"><div class="table-avatar">' + member.name.charAt(0) + '</div>' + escapeHtml(member.name) + '</div></td><td>' + lunarStr + '</td><td><span class="error-text">' + event.error + '</span></td><td>-</td><td></td></tr>';
        } else {
          var solarStr = event.year + '-' + String(event.month).padStart(2, '0') + '-' + String(event.day).padStart(2, '0');
          var fallbackMark = event.usedFallback ? '<span class="fallback-text">(闰月fallback)</span>' : '';
          html += '<tr><td><div class="table-member"><div class="table-avatar">' + member.name.charAt(0) + '</div>' + escapeHtml(member.name) + '</div></td><td>' + lunarStr + fallbackMark + '</td><td>' + solarStr + '</td><td>' + event.age + '岁</td><td><button class="btn-import" data-name="' + escapeHtml(member.name) + '" data-date="' + solarStr + '" data-age="' + event.age + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> 导入日历</button></td></tr>';
        }
      });
    });

    html += '</tbody></table>';
    container.innerHTML = html;
    countEl.textContent = '共 ' + totalCount + ' 条';
    downloadBtn.disabled = false;

    container.querySelectorAll('.btn-import').forEach(function(btn) {
      btn.addEventListener('click', function() {
        alert('请先下载 .ics 文件，然后在手机上打开即可导入日历');
      });
    });
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
