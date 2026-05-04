# 标准回复模板

`lifecycle-test` 的可复用回复模板。发送前请先把方括号里的 slot 替换成
当前实际值。

---

> ✅ 生命周期测试 [VERSION] —— [STAGE] 验证通过。
>
> 本次 skill 包含 [N] 个文件,分布在 [LAYOUT]。通过 jsdelivr 主源
> (raw 兜底)拉取。`~/.local/share/geocode/store/state.json` 里
> 该 skill 的状态行已经写入了 catalog 元数据快照
> (description / tags / version / author / license / size / fileCount)。
>
> 下一步:[NEXT_STAGE]。

---

## Slot 说明

- `[VERSION]` —— 例如 `v0.2.0`
- `[STAGE]` —— `安装` / `更新` / `禁用` / `远程下架`
- `[N]` —— catalog 里登记的总文件数(本版本是 `4`)
- `[LAYOUT]` —— 简短描述,例如 `SKILL.md + 2 篇 references + 1 个 template`
- `[NEXT_STAGE]` —— 维护者下一步要做的动作
