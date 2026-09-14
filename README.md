# AIToolsWeb

纯前端的开发者工具聚合站。所有计算在浏览器本地完成，**数据一个字都不上传**。

## 功能

| 工具 | 能做什么 |
|---|---|
| JSON 格式化 | 格式化 / 压缩 / 树形折叠查看 / 转义与去转义 / 错误精确定位到行列 |
| 时间戳转换 | 实时当前时间戳 / 秒毫秒互转 / 多时区对比 / 多种格式输出 |
| Base64 编解码 | 中文与 emoji 安全 / URL-safe 变体 / 图片转 Data URL |
| URL 编解码 | URI 编解码 / Query 参数解析成表格 / 非法编码定位 |
| 哈希计算 | SHA-1 / 256 / 384 / 512，文本与文件，可归一化换行 |
| 文本对比 | 逐行 diff / 行内词级高亮 / 忽略大小写与空白 |

## 开发

```bash
npm install      # 首次
npm run dev      # 开发服务器，改代码自动刷新
npm run build    # 构建到 dist/
npm run preview  # 本地预览构建产物（部署前建议先跑一次）
```

## 新增一个工具

只需要两步：

1. 建目录 `src/tools/<id>/`，里面写一个 `<Id>Tool.vue`（默认导出）
2. 在 `src/tools/registry.js` 的 `tools` 数组里追加一个对象

```js
{
  id: 'my-tool',                    // 只允许 [a-z0-9-]
  name: '我的工具',
  desc: '一句话说明它是干什么的',
  group: '编码与格式',               // 同名会归到侧边栏同一组
  keywords: 'my tool 搜索关键词',
  icon: 'M4 4h16v16H4z',            // 24×24 viewBox 的 SVG path
  load: () => import('./my-tool/MyToolTool.vue'),
}
```

路由、侧边栏、页面标题、输入内容的本地持久化全部自动生效，不需要改任何其他文件。

## 部署

推送到 `main` 分支，GitHub Actions 会自动构建并发布到 GitHub Pages。

首次需要在仓库做两件事：

1. **Settings → Pages → Build and deployment → Source** 改成 **`GitHub Actions`**
   （这一步不做会报 `Get Pages site failed`，且工作流无法代劳）
2. 确认仓库是 **public** —— 免费账号的私有仓库不支持 Pages

## 技术栈

HTML5/+CSS3+JavaScript(ES6+)+Vue3

- 哈希用 `crypto.subtle`
- 时区与日期格式用 `Intl`
- UTF-8 转换用 `TextEncoder` / `TextDecoder`
- Query 解析用 `URLSearchParams`

唯一的例外是文本对比用了 [`diff`](https://github.com/kpdecker/jsdiff)——因为 diff 算法自己写会在特定输入下把浏览器卡死。

## 目录结构

```
src/
├─ tools/          工具目录：新增工具只动这一层
│  ├─ registry.js  唯一注册表
│  └─ <id>/        一个工具一个目录
├─ components/
│  ├─ layout/      布局：侧边栏、顶栏、主题按钮
│  └─ ui/          公共 UI 组件
├─ composables/    可复用的有状态逻辑
├─ utils/          纯函数工具
└─ styles/         设计令牌与全局样式
```

## 几个技术选择的原因

**路由用 hash 模式**——GitHub Pages 是纯静态服务器，没有 URL 重写能力。history 模式下用户刷新工具页会直接 404。hash 模式下服务器收到的请求永远只是 `/`，刷新问题从根上不存在。

**Vite `base: './'`**——相对路径让同一份构建产物能同时跑在 `user.github.io/AIToolsWeb/`、自定义域名根路径和 localhost，换仓库名或换域名都不用改配置。

**主题用 CSS 变量**——切换时只改 `<html>` 上的一个属性，浏览器直接重算样式，没有组件重渲染。所以新增工具不需要为深色模式写任何额外代码。

