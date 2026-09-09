# lunarday

农历生日日历生成器 - 自动将农历生日转换为公历日期，生成苹果日历兼容的 .ics 文件，一键导入即可使用。

## 在线使用

**推荐**：直接访问在线版本，无需安装任何软件 → [打开农历生日日历生成器](https://susususutie.github.io/lunarday/)

## 快速开始

```bash
npx lunarday "老妈:19710101"
```

> 也可以使用 `vp dlx lunarday`、`yarn dlx lunarday` 或 `pnpm dlx lunarday`

## 用法

### CLI 版本

```bash
npx lunarday "姓名:农历生日" [选项]
```

> 也可以使用 `vp dlx lunarday`、`yarn dlx lunarday` 或 `pnpm dlx lunarday`

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
vp install

# 启动开发服务器
vp dev
```

访问 http://localhost:3000

#### 开发命令

```bash
vp dev      # 启动开发服务器
vp build    # 构建生产版本
vp pack     # 打包 CLI 为独立文件
vp preview  # 预览生产版本
vp check    # 格式化、lint 和类型检查
vp run test # 运行测试脚本
vp exec <cmd> # 执行本地项目命令
```

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
├── src/                    # Web 版本
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── core.js            # 核心逻辑（农历转换）
├── .github/
│   └── workflows/
│       ├── publish.yml    # npm 发布
│       └── deploy-web.yml # Web 部署
├── vite.config.ts         # Vite+ 配置
├── .node-version          # Node.js 版本
└── package.json
```

## 发布

```bash
# 更新版本号
vp pm version patch  # 或 minor/major

# 推送标签触发发布
git push --tags
```

GitHub Actions 会自动发布到 npm。

Web 版本会在推送到 main 分支时自动部署到 GitHub Pages。

## License

MIT
