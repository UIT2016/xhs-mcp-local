# 小红书关键词检索（本地 MCP 接入）

让 AI 智能体**按关键词检索小红书笔记**的一套本机部署方案：第三方 [xiaohongshu-mcp](https://github.com/xpzouying/xiaohongshu-mcp)
服务 + DSH（DeepSeek Harness）的 MCP 连接 bundle + 一键启动脚本。

> **本仓库不含任何凭据、cookie、账号信息或第三方二进制。** 登录态由使用者自己在本地扫码产生，仅落在
> 本地被 git 忽略的 `run/` 目录中。

## 背景结论（为什么是"第三方"）

- 小红书**官方从未发布 MCP server**；
- 官方开放平台（open.xiaohongshu.com）面向自研商家/服务商，能力是小程序与电商经营，**没有对个人开放的
  "按关键词检索笔记"接口**；
- 因此所有"小红书 MCP"都是第三方实现：靠浏览器自动化（或逆向签名接口）复刻你**自己账号的网页登录态**。

## 它能做什么

连接成功后，智能体获得 18 个 `mcp__xiaohongshu__*` 工具，其中读取类：

| 工具 | 作用 |
|---|---|
| `search_feeds(keyword, filters)` | **按关键词检索笔记**，支持 `sort_by`（综合/最新/最多点赞/最多评论/最多收藏）、`note_type`（图文/视频）、`publish_time`（一天内/一周内/半年内）、`search_scope`、`location` |
| `get_feed_detail(feed_id, xsec_token)` | 笔记详情：正文、图片、互动数、评论（可全量加载、展开二级回复） |
| `list_feeds` / `user_profile` / `get_my_profile` / `list_notifications` / `check_login_status` | 首页推荐、用户主页、通知、登录态 |

其余为写入类（发布图文/视频、评论、点赞、收藏），**建议只把读取类交给智能体**——写入是平台重点打击对象。

## 部署步骤

```bash
# 1. 下载官方编译好的二进制，并校验 SHA256（与 GitHub Release API 的值一致）
node tools/fetch-binaries.mjs bin

# 2. 预下载内置 Chromium（约 181 MiB）到本地缓存目录，并校验 SHA256
node tools/fetch-browser.mjs

# 3. 扫码登录（会弹出浏览器窗口，用手机小红书 App 扫码，建议用小号）
login-xhs.cmd

# 4.（可选）不接 DSH 时手动跑服务；装了 bundle 就由 DSH 托管启停，不需要这一步
#    只绑 127.0.0.1:18060，不暴露到局域网
start-xhs-mcp.cmd
```

`login-xhs.cmd` / `start-xhs-mcp.cmd` 会把 `USERPROFILE`、`TEMP`、`LOCALAPPDATA`、`COOKIES_PATH`
全部指向仓库目录下的 `home/`、`tmp/`、`run/`，因此**所有状态都留在本仓库目录内**，不会散落到用户目录。

### 接入 DSH：插件即生命周期

`dsh-bundle-xhs-mcp/` 是一个**带 Host 半边的 bundle**：patch 插入两行，把"跑服务"与"接工具"都绑在插件生命周期上。

```yaml
- insert:
    # ① 本 bundle 的 Host 半边：./index.js 相对 patch 文件锚定
    - id: xhs-mcp-server
      name: ./index.js
      config:
        baseDir: 'D:\code\codex\xhs'
        port: 18060

    # ② 把该服务暴露成智能体的工具
    - id: xhs-mcp
      name: '@deepseek-ai/dsh-mcp-client'
      config:
        serverName: xiaohongshu
        transport: streamable-http
        url: http://127.0.0.1:18060/mcp
        failOnStartupError: false   # 服务没起时 DSH 仍可正常启动
        reconnect:
          enabled: true
          maxAttempts: 1000
```

`index.js` 在 `apply()` 里 `spawn` 服务进程（stdout/stderr 接入 `run/server.log`，`USERPROFILE`/`TEMP`/
`LOCALAPPDATA`/`COOKIES_PATH` 全部指向仓库内），并在 `ctx.effect` 的清理函数里 `child.kill()`。效果：

| 操作 | 结果 |
|---|---|
| 启用 bundle / 启动 DSH | 服务被拉起（`run/server.log` 出现新的 `starting` 段） |
| 禁用 bundle / 退出 DSH | 服务被终止（18060 拒绝连接） |
| 先开 DSH、后开服务 | mcp-client 按退避重连，服务一应答工具即出现 |

安装用 `plugin_manager` 的 `install_bundle` 指向该目录。注意：**同名包已装过时必须先 `remove_bundle`**，
否则报 `already-installed`（`link:` 目录不会被同名安装覆盖）。工具随后以 `mcp__xiaohongshu__<tool>`
出现，无需重启 DSH。

## 目录结构

```
tools/                  下载与协议探测脚本（node，无依赖）
  fetch-binaries.mjs    下载 mcp / login 二进制 + SHA256 校验
  fetch-browser.mjs     下载内置 Chromium + SHA256 校验（支持断点续传）
  probe-mcp.mjs         手工 MCP 握手：initialize → tools/list
  xhs-files.mjs         读取上游源码做排查
dsh-bundle-xhs-mcp/     DSH bundle：Host 半边(index.js 托管服务进程) + mcp-client 行 + 本地化与图标
start-xhs-mcp.cmd       启动 MCP 服务
login-xhs.cmd           扫码登录
bin/  home/  run/  tmp/  运行时目录（git 忽略）
```

## 部署时遇到的三个坑（已在本仓库内解决）

1. **沙箱与命名管道**：DSH 受限沙箱禁止进程打开 Windows 命名管道，Chromium 会直接
   `chrome has stopped working`；服务与登录必须在不受限的环境下启动。
2. **杀软误报**：Chromium 自动化库 go-rod 会在运行时把 `leakless.exe` 释放到 TEMP，被 Windows Defender
   判为 `Trojan:Win32/Kepavll!rfn`（生态级误报，见 go-rod issue #1099 / #739），需对该目录加排除项。
3. **内置浏览器不可替换**：上游 `EnsureBrowser()` 只认自己分发的 Chromium（指纹 flag 与之绑定），
   无法用 `ROD_BROWSER_BIN` 指向本机 Edge/Chrome。

## 风险与合规（务必先读）

- 这是**未经官方授权的自动化**，位于用户协议灰区甚至违规地带；
- 平台 2026-03 已发布治理公告打击"AI 托管账号"；公开案例中有用户**仅少量读取操作**即收到警告；
- 司法上已有判例认定抓取并售卖小红书笔记数据构成不正当竞争（赔偿 110 万元）；
- 建议：**只用小号**、只做只读检索、严格限频（不要并发/批量翻页）、不要用于商业采集；
- 同一账号**不要**同时在浏览器网页版登录，否则会把 MCP 会话踢下线；cookie 约 7–30 天过期需重新扫码。

## License

本仓库内的脚本与配置由作者编写；第三方组件（xiaohongshu-mcp、Chromium）不随本仓库分发，
其许可与风险由使用者自行确认。
