---
name: lifecycle-test
description: GeoCode Skill 商店生命周期测试 v2,验证多文件 install、更新流程、元数据刷新等链路。当用户要求"跑一下生命周期测试"或者发"lifecycle ping"时激活本 skill。
---

# 生命周期测试 Skill (v0.2.0)

本 skill 是 GeoCode 商店生命周期测试的 v2 版本。相比 v1 单文件结构,
v2 在 `skill/` 下使用了 **多文件包**,用来一并测试嵌套目录 + 并行下载,
而不仅仅是单个 SKILL.md。

## 何时使用本 skill

如果用户要求"跑一下生命周期测试",或者发了"lifecycle ping"这样的暗号,
就加载本 skill 并按需阅读它的 reference 文档。

## 期望的回复

> ✅ 生命周期测试 v0.2.0 —— 多文件 install 验证通过。本次 skill 包含
> SKILL.md + 2 篇 references + 1 个 template,共 4 个文件,通过
> jsdelivr 主源(raw 兜底)拉取。元数据刷新链路确认:catalog 里的
> description / tags / version / 作者 / 下载数 已经被同步,slash 选择器
> 也已经在没有 sidecar 重启的情况下重建。

之后请告诉用户当前看到的是哪个版本号,以及他正在进行的是哪一个测试阶段
(install / update / 禁用 / 远程下架 —— 详见 `references/lifecycle-checklist.md`)。

## 本 skill 包含的文件

- `SKILL.md` —— 当前文件(LLM 看到的提示词)
- `references/lifecycle-checklist.md` —— 测试阶段与每一步的预期 UI 行为
- `references/upgrade-notes.md` —— v1 到 v2 之间到底改了什么
- `templates/sample-greeting.md` —— 标准回复模板

## 注意事项

- v2 故意改了 `description`、`tags`、`version`,以便用户在 [更新] 后可以
  在 UI 上一眼看出元数据被刷新了。
- 这仍然是验证 skill,**单次会话不要回复多于一条问候**。
