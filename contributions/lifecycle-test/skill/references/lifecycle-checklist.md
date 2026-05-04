# 生命周期测试清单

`lifecycle-test` skill 的参考文档。列出维护者在端到端验证 GeoCode Skill 商店
时会经过的四个阶段。

## 阶段 1 —— 安装

1. 打开 设置 → Skill 商店
2. `lifecycle-test` 显示为 **未安装**
3. 点击 [安装]
4. 状态切换为 **已启用**,版本显示 v0.2.0
5. 在新会话里 `/lifecycle-test` slash 命令可用

## 阶段 2 —— 更新

1. 维护者把 `manifest/meta.json` 的 `version` bump(例如 0.2.0 → 0.2.1)
2. CI 重新发布 release 分支
3. 客户端点 [刷新],对应行出现 **有新版本** 标签
4. 点击 [更新]
5. 状态回到 **已启用**,版本号反映新版本
6. LLM 回复里提到新的版本号

## 阶段 3 —— 禁用 / 重新启用

1. 关闭开关 → 状态变为 **已禁用**
2. slash 选择器中不再列出 `/lifecycle-test`
3. 重新打开开关 → 立即重新出现(无需 sidecar 重启)

## 阶段 4 —— 远程下架

1. 维护者从 main 删掉 `contributions/lifecycle-test/`
2. CI 重新发布 —— release 分支不再包含本 skill
3. 客户端点 [刷新]:
   - 本地已安装的副本仍能正常渲染(走本地缓存的元数据)
   - 不会出现"有新版本"标签(我们不假装有更新)
   - skill 仍可通过 `/lifecycle-test` 调用(LLM 仍能看到)
4. 目前清理本地副本只能通过 Factory Reset
