/**
 * 农历生日日历生成器 - Web 版
 * 
 * 将 CLI 版本的核心逻辑移植到浏览器端
 */

(function() {
  'use strict';

  // ==================== 常量 ====================
  const LUNAR_MONTHS = ['正月', '二月', '三月', '四月', '五月', '六月',
                        '七月', '八月', '九月', '十月', '冬月', '腊月'];
  
  const LUNAR_DAYS_TENS = ['初', '十', '廿', '三'];
  const LUNAR_DAYS_ONES = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

  const STORAGE_KEY = 'lunarday_data';
  const STORAGE_VERSION = 1;

  // ==================== 工具函数 ====================

  /**
   * 获取农历月份中文名
   */
  function getLunarMonthName(month) {
    return LUNAR_MONTHS[month - 1] || '';
  }

  /**
   * 获取农历日期中文名
   */
  function getLunarDayName(day) {
    if (day === 10) return '初十';
    if (day === 20) return '二十';
    if (day === 30) return '三十';

    const ten = Math.floor(day / 10);
    const one = day % 10;
    return LUNAR_DAYS_TENS[ten] + (ten === 1 ? '十' : '') + LUNAR_DAYS_ONES[one];
  }

  /**
   * 转义 ICS 特殊字符
   */
  function escapeICS(str) {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  /**
   * 检测是否在微信内置浏览器中
   */
  function isWeChat() {
    return /MicroMessenger/i.test(navigator.userAgent);
  }

  /**
   * 检测是否是移动设备
   */
  function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  }

  // ==================== 核心逻辑 ====================

  /**
   * 农历转公历
   */
  function lunar2solar(year, lunarMonth, lunarDay) {
    const solarLunar = window.solarLunar;
    if (!solarLunar) {
      throw new Error('农历转换库加载失败');
    }
    
    // 支持两种导入方式：直接函数或 default 导出
    const convertFn = solarLunar.lunar2solar || 
                      (solarLunar.default && solarLunar.default.lunar2solar);
    
    if (!convertFn) {
      throw new Error('农历转换库加载失败');
    }
    
    return convertFn(year, lunarMonth, lunarDay);
  }

  /**
   * 为成员生成生日事件
   */
  function generateMemberEvents(member, years) {
    const events = [];
    
    for (const year of years) {
      try {
        const solar = lunar2solar(year, member.lunarMonth, member.lunarDay);
        events.push({
          year: year,
          month: solar.cMonth,
          day: solar.cDay,
          age: year - member.birthYear
        });
      } catch (e) {
        events.push({
          year: year,
          error: e.message || '转换失败'
        });
      }
    }
    
    return events;
  }

  /**
   * 生成 ICS 文件内容
   */
  function generateICS(birthdays, config) {
    const dtstamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0] + 'Z';
    const events = [];

    for (const member of birthdays) {
      for (const event of member.events) {
        if (event.error) continue;

        const pad = (n) => String(n).padStart(2, '0');
        const lunarMonthName = getLunarMonthName(member.lunarMonth);
        const lunarDayName = getLunarDayName(member.lunarDay);
        const uid = `${member.name}-lunar-${event.year}-${Date.now()}@lunarday`;

        events.push(`BEGIN:VEVENT
DESCRIPTION:农历${lunarMonthName}${lunarDayName}
DTEND;VALUE=DATE:${event.year + 1}${pad(event.month)}${pad(event.day)}
DTSTAMP:${dtstamp}
DTSTART;VALUE=DATE:${event.year}${pad(event.month)}${pad(event.day)}
LAST-MODIFIED:${dtstamp}
SEQUENCE:0
SUMMARY;CHARSET=UTF-8;LANGUAGE=zh_CN:${escapeICS(member.name)}${event.age}岁生日
TRANSP:TRANSPARENT
UID:${uid}
END:VEVENT`);
      }
    }

    const icsContent = `BEGIN:VCALENDAR
CALSCALE:GREGORIAN
PRODID:-//${escapeICS(config.calendarName)}//Lunar Calendar Birthday//CN
VERSION:2.0
X-APPLE-CALENDAR-COLOR:${config.calendarColor}
X-WR-CALNAME:${escapeICS(config.calendarName)}
${events.join('\n')}
END:VCALENDAR`;

    // 统一换行符为 \r\n (RFC 5545 规范)
    return icsContent.replace(/\n/g, '\r\n');
  }

  // ==================== 数据持久化 ====================

  /**
   * 保存数据到 localStorage
   */
  function saveData(members, settings) {
    try {
      const data = {
        version: STORAGE_VERSION,
        members: members,
        settings: settings
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.warn('保存数据失败:', e);
      return false;
    }
  }

  /**
   * 从 localStorage 加载数据
   */
  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      
      const data = JSON.parse(raw);
      if (data.version !== STORAGE_VERSION) {
        return null;
      }
      return data;
    } catch (e) {
      console.warn('加载数据失败:', e);
      return null;
    }
  }

  // ==================== UI 状态 ====================

  let members = [];
  let settings = {
    calendarName: '家庭农历生日',
    calendarColor: '#0088FF'
  };

  // ==================== DOM 操作 ====================

  /**
   * 生成年份选项
   */
  function populateYearSelects() {
    const currentYear = new Date().getFullYear();
    const yearStart = document.getElementById('year-start');
    const yearEnd = document.getElementById('year-end');
    
    for (let y = currentYear - 5; y <= currentYear + 5; y++) {
      const opt1 = new Option(y, y);
      const opt2 = new Option(y, y);
      yearStart.add(opt1);
      yearEnd.add(opt2);
    }
    
    yearStart.value = currentYear;
    yearEnd.value = currentYear + 1;
  }

  /**
   * 生成农历月份选项
   */
  function createMonthOptions() {
    const options = ['<option value="">月</option>'];
    LUNAR_MONTHS.forEach((name, i) => {
      options.push(`<option value="${i + 1}">${name}</option>`);
    });
    return options.join('');
  }

  /**
   * 生成农历日期选项
   */
  function createDayOptions() {
    const options = ['<option value="">日</option>'];
    for (let d = 1; d <= 30; d++) {
      options.push(`<option value="${d}">${getLunarDayName(d)}</option>`);
    }
    return options.join('');
  }

  /**
   * 创建成员卡片 HTML
   */
  function createMemberCard(member, index) {
    const monthOptions = createMonthOptions();
    const dayOptions = createDayOptions();
    
    return `
      <div class="member-card" data-index="${index}">
        <button class="delete-btn" data-index="${index}" title="删除">&times;</button>
        <div class="form-row full">
          <div class="form-group">
            <label>姓名</label>
            <input type="text" class="form-control member-name" 
                   value="${member ? member.name : ''}" 
                   placeholder="如：老爸、老妈、小明"
                   data-field="name">
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>农历年份</label>
            <input type="number" class="form-control member-birth-year" 
                   value="${member ? member.birthYear : ''}" 
                   placeholder="如：1971"
                   min="1900" max="2100"
                   data-field="birthYear">
          </div>
          <div class="form-group">
            <label>农历月日</label>
            <div style="display: flex; gap: 8px;">
              <select class="form-control member-month" data-field="lunarMonth">
                ${monthOptions.replace(`value="${member ? member.lunarMonth : ''}"`, `value="${member ? member.lunarMonth : ''}" selected`)}
              </select>
              <select class="form-control member-day" data-field="lunarDay">
                ${dayOptions.replace(`value="${member ? member.lunarDay : ''}"`, `value="${member ? member.lunarDay : ''}" selected`)}
              </select>
            </div>
          </div>
        </div>
        <div class="checkbox-group">
          <input type="checkbox" id="leap-${index}" class="member-leap" 
                 ${member && member.isLeapMonth ? 'checked' : ''}>
          <label for="leap-${index}">闰月</label>
        </div>
      </div>
    `;
  }

  /**
   * 渲染成员列表
   */
  function renderMembers() {
    const container = document.getElementById('members-list');
    
    if (members.length === 0) {
      container.innerHTML = '<p class="empty-state">点击"添加家人"开始</p>';
      return;
    }
    
    container.innerHTML = members.map((m, i) => createMemberCard(m, i)).join('');
    attachMemberEvents();
  }

  /**
   * 从 DOM 读取成员数据
   */
  function readMembersFromDOM() {
    const cards = document.querySelectorAll('.member-card');
    const newMembers = [];
    
    cards.forEach((card, index) => {
      const name = card.querySelector('.member-name').value.trim();
      const birthYear = parseInt(card.querySelector('.member-birth-year').value);
      const lunarMonth = parseInt(card.querySelector('.member-month').value);
      const lunarDay = parseInt(card.querySelector('.member-day').value);
      const isLeapMonth = card.querySelector('.member-leap').checked;
      
      if (name && birthYear && lunarMonth && lunarDay) {
        newMembers.push({
          name: name,
          birthYear: birthYear,
          lunarMonth: lunarMonth,
          lunarDay: lunarDay,
          isLeapMonth: isLeapMonth
        });
      }
    });
    
    members = newMembers;
    saveData(members, settings);
    updatePreview();
  }

  /**
   * 更新预览表格
   */
  function updatePreview() {
    const container = document.getElementById('preview-container');
    const downloadBtn = document.getElementById('download-btn');
    const webcalBtn = document.getElementById('webcal-btn');
    
    if (members.length === 0) {
      container.innerHTML = '<p class="empty-state">添加家人后，转换结果将在这里显示</p>';
      downloadBtn.disabled = true;
      webcalBtn.style.display = 'none';
      return;
    }
    
    const yearStart = parseInt(document.getElementById('year-start').value);
    const yearEnd = parseInt(document.getElementById('year-end').value);
    const years = [];
    for (let y = yearStart; y <= yearEnd; y++) {
      years.push(y);
    }
    
    // 生成事件
    const birthdaysWithEvents = members.map(member => ({
      ...member,
      events: generateMemberEvents(member, years)
    }));
    
    // 生成表格
    let html = '<table class="preview-table"><thead><tr>';
    html += '<th>姓名</th><th>农历生日</th><th>公历日期</th><th>年龄</th>';
    html += '</tr></thead><tbody>';
    
    for (const member of birthdaysWithEvents) {
      const lunarStr = `${getLunarMonthName(member.lunarMonth)}${getLunarDayName(member.lunarDay)}`;
      
      for (const event of member.events) {
        if (event.error) {
          html += `<tr><td>${escapeHtml(member.name)}</td><td>${lunarStr}</td>`;
          html += `<td><span class="error">${event.error}</span></td><td>-</td></tr>`;
        } else {
          const solarStr = `${event.year}-${String(event.month).padStart(2, '0')}-${String(event.day).padStart(2, '0')}`;
          html += `<tr><td>${escapeHtml(member.name)}</td><td>${lunarStr}</td>`;
          html += `<td>${solarStr}</td><td>${event.age}岁</td></tr>`;
        }
      }
    }
    
    html += '</tbody></table>';
    container.innerHTML = html;
    
    // 启用下载按钮
    downloadBtn.disabled = false;
    
    // 移动端显示 webcal 按钮
    if (isMobile()) {
      webcalBtn.style.display = 'inline-flex';
    }
  }

  /**
   * 转义 HTML
   */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  /**
   * 下载 ICS 文件
   */
  function downloadICS() {
    const yearStart = parseInt(document.getElementById('year-start').value);
    const yearEnd = parseInt(document.getElementById('year-end').value);
    const years = [];
    for (let y = yearStart; y <= yearEnd; y++) {
      years.push(y);
    }
    
    settings.calendarName = document.getElementById('calendar-name').value || '家庭农历生日';
    
    const birthdaysWithEvents = members.map(member => ({
      ...member,
      events: generateMemberEvents(member, years)
    }));
    
    const icsContent = generateICS(birthdaysWithEvents, settings);
    
    // 创建 Blob 并下载
    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${settings.calendarName}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // 显示导入指引
    showImportGuide();
  }

  /**
   * 显示导入指引
   */
  function showImportGuide() {
    const modal = document.getElementById('import-modal');
    modal.style.display = 'flex';
  }

  /**
   * 绑定成员卡片事件
   */
  function attachMemberEvents() {
    // 删除按钮
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        const index = parseInt(this.dataset.index);
        members.splice(index, 1);
        saveData(members, settings);
        renderMembers();
        updatePreview();
      });
    });
    
    // 输入变化
    document.querySelectorAll('.member-card input, .member-card select').forEach(el => {
      el.addEventListener('change', readMembersFromDOM);
      el.addEventListener('input', readMembersFromDOM);
    });
  }

  // ==================== 初始化 ====================

  function init() {
    // 检测微信
    if (isWeChat()) {
      document.getElementById('wechat-tip').style.display = 'flex';
      document.getElementById('copy-link-btn').addEventListener('click', function() {
        navigator.clipboard.writeText(window.location.href).then(() => {
          this.textContent = '已复制';
          setTimeout(() => {
            this.textContent = '复制链接';
          }, 2000);
        });
      });
    }
    
    // 生成年份选项
    populateYearSelects();
    
    // 加载保存的数据
    const savedData = loadData();
    if (savedData) {
      members = savedData.members || [];
      settings = savedData.settings || settings;
      document.getElementById('calendar-name').value = settings.calendarName;
    }
    
    // 渲染成员列表
    renderMembers();
    
    // 添加家人按钮
    document.getElementById('add-member-btn').addEventListener('click', function() {
      members.push({
        name: '',
        birthYear: '',
        lunarMonth: '',
        lunarDay: '',
        isLeapMonth: false
      });
      renderMembers();
      
      // 滚动到新添加的成员
      const cards = document.querySelectorAll('.member-card');
      const lastCard = cards[cards.length - 1];
      if (lastCard) {
        lastCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        lastCard.querySelector('.member-name').focus();
      }
    });
    
    // 年份变化
    document.getElementById('year-start').addEventListener('change', updatePreview);
    document.getElementById('year-end').addEventListener('change', updatePreview);
    
    // 日历名称变化
    document.getElementById('calendar-name').addEventListener('change', function() {
      settings.calendarName = this.value;
      saveData(members, settings);
    });
    
    // 下载按钮
    document.getElementById('download-btn').addEventListener('click', downloadICS);
    
    // webcal 按钮
    document.getElementById('webcal-btn').addEventListener('click', function() {
      // webcal:// 协议需要服务器支持，这里只是提示用户
      alert('请使用"下载 .ics 文件"功能，然后在手机上打开文件即可导入日历');
    });
    
    // 关闭模态框
    document.getElementById('close-modal').addEventListener('click', function() {
      document.getElementById('import-modal').style.display = 'none';
    });
    
    // 点击模态框外部关闭
    document.getElementById('import-modal').addEventListener('click', function(e) {
      if (e.target === this) {
        this.style.display = 'none';
      }
    });
    
    // 初始预览
    updatePreview();
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
