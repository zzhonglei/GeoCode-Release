# 升级测试 (update-test)

GeoCode 技能商店「升级」路径的一次性验证技能,跟 `hello-geocode`(验证
「安装」路径)是配套的两件套。

## 它做什么

当用户问 LLM「升级测试当前是哪个版本」之类的问题时,这个技能会让模型
回复一行硬编码的版本号字符串。后续把 `manifest/meta.json` bump 到更高
版本(同时把 `skill/SKILL.md` 里的版本号字符串也改了)再 republish 之后,
这一行回复应该跟着变化——这就是用户用来确认「点击 [更新] 之后本地
文件确实被替换了」的可信信号。

## 为什么要装

纯验证用途。装一次,确认下面这四步全部跑通:

1. **catalog 检测到新版本** —— `manifest/meta.json` 的 `version` 在
   `main` 分支被 bump,CI 重建 `release` 分支上的 `dist/store/catalog.json`,
   jsdelivr 提供新的 catalog。
2. **客户端看到 [更新] 标记** —— 「设置 → 技能商店」给本地版本严格
   小于 catalog 版本(semver 比较)的那一行加上标记。
3. **点击 [更新] 替换文件** —— 后端从 `dist/core/update-test/SKILL.<hash>.md`
   拉新的包文件覆盖到本地安装目录,并更新本地安装记录里的 version。
4. **重新触发确认替换** —— LLM 现在读到的是新的 SKILL.md 内容,
   回复改成新版本字符串。

确认通过之后,可以禁用或卸载它。这个技能在测试以外没有任何实际用途。

## 作者

GeoCode.
