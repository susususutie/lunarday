# lunarday

农历生日日历生成器 - 自动将农历生日转换为公历日期，生成苹果日历兼容的 .ics 文件，一键导入即可使用。

## 在线使用

**推荐**：直接访问在线版本，无需安装任何软件 → [打开农历生日日历生成器](https://sutie.github.io/lunarday/)

## 快速开始

```bash
npx lunarday "老妈:19710101"
```

## 用法

```bash
npx lunarday "姓名:农历生日" [选项]
```

### 成员格式

`"姓名:YYYYMMDD"` - 例如 `"老妈:19710101"` 表示农历1971年1月1日出生

### 示例

```bash
npx lunarday "老妈:19710101"
npx lunarday "老妈:19710101" "老爸:19720202"
npx lunarday "老妈:19710101" -y 2026,2027
npx lunarday "老妈:19710101" -n "老妈生日" -c "#FF69B4"
```

## 选项

| 选项 | 说明 | 默认值 |
|------|------|--------|
| `-y, --years` | 年份，逗号分隔 | 当前年和下一年 |
| `-o, --output` | 输出文件 | `农历生日日历.ics` |
| `-n, --name` | 日历名称 | `家庭农历生日` |
| `-c, --color` | 日历颜色 | `#0088FF` |

## 导入 Apple Calendar

1. 运行命令生成 .ics 文件
2. 打开 Apple Calendar → 文件 → 导入
3. 选择 .ics 文件，点击"导入"

## 发布

```bash
npm version patch  # 或 minor/major
git push --tags
```

GitHub Actions 会自动发布到 npm。

## License

MIT
