# Sub-Store Module WebUI

Sub-Store Android 模块的 M3E WebUI。界面使用 Vue 3、Vite、Lucide 图标和自定义 Material 3 Expressive 组件，通过 KernelSU / APatch WebUI API 调用模块脚本。

## 功能

- 概览：服务状态、访问入口、安全检查和启动 / 停止 / 重启。
- 更新：手动组件更新、更新范围选择、日志，以及可按“每天 / 每 7 天”配置的自动全部更新。
- 配置：浅色 / 深色 / 跟随系统、Monet 动态取色、开机自启、随机访问路径和环境变量编辑器。
- 关于：依赖项目、赞助入口和许可信息。

自动更新由模块层的持久调度器执行，关闭 WebUI 后不会停止。WebUI 负责保存计划、读取上次结果和展示日志。

## Monet

在“配置 → 外观”开启 **Monet 取色**，默认关闭，选择保存在当前 WebUI 的 localStorage。

- 通过宿主提供的 `https://mui.kernelsu.org/internal/colors.css` 读取 `--primary`，不执行 root 命令或读取壁纸文件。
- 以宿主颜色为种子，用 Material Color Utilities 生成浅色、深色两套 Material 3 色板。
- 关闭后恢复内置主题；普通浏览器、旧宿主或没有可用配色时保持内置主题。关闭状态不加载宿主色板或配色生成库。
- 更换壁纸或宿主配色后刷新页面即可重新取色。

## 开发

```sh
pnpm install
pnpm dev --host 127.0.0.1
pnpm test
pnpm build
```

浏览器开发环境没有 KernelSU 全局对象，`src/api/mock.js` 会提供与模块脚本输出结构一致的状态数据。构建产物输出到 `dist/`，模块构建脚本会将其复制到最终包的 `webroot/`。
