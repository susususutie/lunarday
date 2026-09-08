# lunarday

农历生日日历生成器 - 自动将农历生日转换为公历日期，生成苹果日历兼容的 .ics 文件，一键导入即可使用。

## 在线使用

**推荐**：直接访问在线版本，无需安装任何软件 → [打开农历生日日历生成器](https://susususutie.github.io/lunarday/)

## 快速开始

```bash
npx lunarday "老妈:19710101"
```

## 用法

### CLI 版本

```bash
npx lunarday "姓名:农历生日" [选项]
```

#### 成员格式

`"姓名:YYYYMMDD"` - 例如 `"老妈:19710101"` 表示农历1971年1月1日出生

#### 示例

```bash
npx lunarday "老妈:19710101"
npx lunarday "老妈:19710101" "老爸:19720202"
npx lunarday "老妈:19710101" -y 2026,2027
npx lunarday "老妈:19710101" -n "老妈生日" -c "#FF69B4"
```

#### 选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-y, --years` | 年份，逗号分隔 | 当前年和下一年 |
| `-o, --output` | 输出文件 | `农历生日日历.ics` |
| `-n, --name` | 日历名称 | `家庭农历生日` |
| `-c, --color` | 日历颜色 | `#0088FF` |

### Web 版本

#### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 或
npm run dev:web
```

访问 http://localhost:3000

#### 功能特性

- 支持添加多位家人
- 农历转公历实时预览
- 支持闰月生日处理
- 一键下载 .ics 文件
- 数据本地保存（localStorage）
- 移动端适配

## 导入 Apple Calendar

1. 运行命令生成 .ics 文件（CLI）或点击下载按钮（Web）
2. 打开 Apple Calendar → 文件 → 导入
3. 选择 .ics 文件，点击"导入"

## 项目结构

```
lunarday/
├── bin/                    # CLI 版本
│   └── cli.js
├── src/
│   └── web/               # Web 版本
│       ├── index.html
│       ├── style.css
│       ├── app.js
│       └── vendor/
├── scripts/
│   └── dev-server.js      # 本地开发服务器
├── .github/
│   └── workflows/
│       ├── publish.yml    # npm 发布
│       └── deploy-web.yml # Web 部署
└── package.json
```

## 发布

```bash
npm version patch  # 或 minor/major
git push --tags
```

GitHub Actions 会自动发布到 npm。

Web 版本会在推送到 main 分支时自动部署到 GitHub Pages。

## License

MIT
