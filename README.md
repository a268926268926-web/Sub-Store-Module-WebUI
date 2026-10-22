# Sub-Store Module WebUI

Sub-Store Android 模块的 M3E WebUI。界面使用 Vue 3、Vite、Lucide 图标和自定义 Material 3 Expressive 组件，通过 KernelSU / APatch WebUI API 调用模块脚本。

## 功能

- 概览：服务状态、运行方式、访问入口、安全检查和启动 / 停止 / 重启集中在同一状态组件中。
- 更新：手动组件更新、日志，以及支持 `1–365` 天周期和自定义本地时间的自动全部更新。
- 配置：系统字体、浅色 / 深色 / 纯黑模式、宿主动态取色、色板风格、开机自启、随机访问路径，以及页内展开的环境变量编辑器。
- 关于：依赖项目、赞助入口和许可信息。

自动更新由模块层的持久调度器执行，关闭 WebUI 后不会停止。WebUI 负责保存计划、读取上次结果和展示日志。

## 主题

- 通过宿主提供的 `https://mui.kernelsu.org/internal/colors.css` 读取 `--primary`，不执行 root 命令或读取壁纸文件。
- 以宿主颜色为种子生成浅色、深色两套 Material 3 色板；普通浏览器、旧宿主或取色失败时使用内置色板。
- 颜色算法按需异步加载，不进入首屏主包；主题切换串行执行，避免动画叠加。
- 默认使用系统字体，不打包字体文件；宿主不支持动态取色或取色失败时保持精简的基础主题。

## 性能边界

- CodeMirror、主题颜色算法和各页面独立分包；主页面在空闲时预取后续页面。
- 动画只使用 `opacity`、`transform` 等合成友好属性，不使用 `backdrop-filter`，也不在交互中动画尺寸、模糊或阴影。
- 配置子页、环境编辑器和选择弹层接入浏览器返回栈；预测性返回的视觉预览依赖宿主 WebView 能力，本仓库不伪造该动画。
- `@codemirror/view` 与 Vite 使用已验证的固定小版本，避免新补丁造成懒加载编辑器包体积回退。

## 开发

```sh
pnpm install
pnpm dev --host 127.0.0.1
pnpm test
pnpm build
```

浏览器开发环境没有 KernelSU 全局对象，`src/api/mock.js` 会提供与模块脚本输出结构一致的状态数据。构建产物输出到 `dist/`，模块构建脚本会将其复制到最终包的 `webroot/`。
