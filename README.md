# SpecEngine Plugin

狀態驅動的 BDD 規格治理框架，打包為 Claude Code Plugin，避免每個專案手動複製貼上 `.claude/skills/` 造成零星漏貼。

內含 9 個 Skill：`spec-01-discovery-bootstrap` ~ `spec-06-drift-audit`、`spec-flow-align`、`spec-run`、`spec-manifest-sync`，以及支援用的 `docs/contract-rules.md`（規格與契約表達之最高語法憲法）與 `scripts/{spec-guard.js,feature-lint.js}`（唯讀不變性與 `.feature`/`.dbml` 純淨度的強制驗證腳本）。

## 在另一個專案安裝

```
/plugin marketplace add <這個 repo 的 git URL 或本機路徑>
/plugin install specengine@specengine-marketplace
```

之後升級（例如新增了新 Skill 或修了規則）：

```
/plugin marketplace update specengine-marketplace
```

## 不隨 plugin 打包的部分（每個專案自己維護）

- `.claude/spec/architecture-manifest.md`：各專案技術棧、目錄命名不同，仍需各專案自行建立與維護。
- `CLAUDE.md` 裡的 SpecEngine 命令路由與不變性條文：目前仍需各專案自行貼一份到自己的 `CLAUDE.md`；尚未打包進 plugin。
- `.claude/skills/analyze-sa-spec/`、`.claude/skills/fetch-jira/`：CLAUDE.md 中註明為「既有、與 SpecEngine 並存」的工具，不算 SpecEngine 本體，此次未納入打包範圍。

## 版本

版本號記錄於 `.claude-plugin/plugin.json` 的 `version` 欄位（單一事實來源，取代舊有的 `.claude/VERSION` 檔）。`spec-01` 會在建立模組行為矩陣時，讀取 `${CLAUDE_PLUGIN_ROOT}/.claude-plugin/plugin.json` 的 `version` 寫入 `spec_engine_version` 欄位。
