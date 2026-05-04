# 升级笔记 —— lifecycle-test v1 → v2

本 fixture 在第一版与第二版之间发生了哪些变化。

## 版本

`0.1.0` → `0.2.0`

## 元数据

- `description` 改写为强调多文件覆盖,且全部使用中文
- `tags` 扩展并改成中文:新增 `v2`、`多文件`、`回归`
- `author` 由 `GeoCode` 改为 `GeoCode 测试组`(让 UI 上一眼能看出元数据被刷新了)
- `license` 不变(`MIT`)
- `minClientVersion` 不变(`0.9.0`)

## 包结构

v1:
```
skill/
  SKILL.md           (单文件,约 800 字节)
```

v2:
```
skill/
  SKILL.md
  references/
    lifecycle-checklist.md
    upgrade-notes.md
  templates/
    sample-greeting.md
```

文件数:1 → 4。整体大小:约 800 字节 → 约 5 KB。

## 这次升级测试了哪些能力

| 能力 | v1 | v2 |
| --- | :-: | :-: |
| 单文件 install | ✅ | ✅ |
| 多文件 install(并行下载) | — | ✅ |
| `skill/` 下嵌套子目录 | — | ✅ |
| 版本 bump 后 catalog 元数据刷新 | — | ✅ |
| [更新] 后 slash 选择器自动重建 | ✅ | ✅ |

## SKILL.md 改动要点

- 标题加了"(v0.2.0)"后缀
- 回复模板改为中文,并提到 v0.2.0 + 多文件
- 新增"本 skill 包含的文件"小节
