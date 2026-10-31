<div align="center">

# SpecEngine

**從需求到測試程式的逐步細化，由腳本對 AI 寫程式代理強制執行。**

SpecEngine 是一個 Claude Code plugin。它不讓代理從需求直接跳到測試，而是把需求一層一層降低抽象，一路降到 Step Definitions 和測試程式。每一層的空白由人填，每一層由腳本檢查，下層無法回頭改寫上層。

[![Version](https://img.shields.io/badge/version-2.1.0-blue)](CHANGELOG.md)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-8A63D2)](#安裝)
[![Node.js ≥ 18](https://img.shields.io/badge/node-%E2%89%A5%2018-339933)](#環境需求)
[![Runtime dependencies: 0](https://img.shields.io/badge/runtime%20dependencies-0-brightgreen)](scripts/)

[English](README.md) · 繁體中文

</div>

---

## 要解決的問題

AI 寫程式代理有兩種已被反覆記錄的失敗模式。

1. **用猜的補洞。** 四句話的需求留下幾十個沒講的邊界，代理每一個都自己選答案，選錯的要到驗收才發現。
2. **改測試而不是改程式。** 測試和實作對不上時，最省事的變綠方法是改測試，回報照樣寫「全部通過」。

GitHub Spec Kit、Kiro 這類規格驅動工具用「寫程式前先寫規格」處理第一個問題。但接下來測試大致由代理從規格自行推導，寫程式期間也沒有任何機制鎖住規格或測試。

## 做法：逐步細化

SpecEngine 不把自然語言規格一次轉成測試，而是讓需求從使用者的話一路細化到測試程式，共經過六層。每一層都是一個讀得到的檔案、只回答一個問題，而且通過檢查後才寫下一層。

| 層 | 產物 | 這一層回答的問題 | 誰把關 |
| :--- | :--- | :--- | :--- |
| 1 | 自然語言需求 | 需求方要什麼？ | 人 |
| 2 | 規則矩陣 | 在什麼前置條件下、發生什麼事件，系統必須怎樣？ | 人回答每一個未決問題；`feature-lint.js` 檢查結構 |
| 3 | 流程圖 | 規則合起來有沒有漏掉分支？ | 人確認；有缺口就退回第 2 層 |
| 4 | Gherkin 情境與範例表 | 每條規則的具體例子是什麼？ | `feature-lint.js`：規則與情境一一對應，每一列範例都必須能由矩陣推出 |
| 5 | Step 句型與 Driver 介面 | 每句話驅動哪個系統操作？ | Driver 模式下每個 `@binds` 必須指向真實存在的方法；句型凍結 |
| 6 | Step 實作與產品程式碼 | 實際怎麼做？ | 測試由紅轉綠，同時第 2 到第 5 層逐字節不得變動 |

分層細化帶來兩個一步轉譯做不到的好處：

- **錯誤在它發生的那一層就被抓到。** 需求不清楚，在第 2 層變成選擇題。漏掉分支，在第 3 層的流程圖上被看出來。範例抄錯，在第 4 層被 lint 擋下。一步轉譯時，這三種錯誤都要到最後才以同一個症狀出現：測試沒過，而且看不出是哪一層出錯。
- **每一行測試都能追溯到一個決策。** 任一個 Step 實作都能往上追到它的句型、情境、規則，再追到它來自哪一題、是誰回答的。

### 站在既有理論上，落實到軟體工程實務

SpecEngine 底層的每個概念單獨看都不是新的。它的貢獻在於把這些理論結合起來，做成一套給 AI 寫程式代理用、實際可運作的工具鏈。

| 概念 | 出處 | 在 SpecEngine 裡的位置 |
| :--- | :--- | :--- |
| 逐步細化 | Wirth，*Program Development by Stepwise Refinement*，1971 | 上面的六層 |
| 前置條件與後置條件 | Hoare，*An Axiomatic Basis for Computer Programming*，1969 | 矩陣裡每條規則都是前置條件、觸發事件、後置斷言 |
| 行為驅動開發與實例化需求 | North，2006；Adzic，2011 | 帶範例表的 Gherkin 情境，作為可執行的那一層 |
| 測試驅動開發 | Beck，2002 | 每個測試先紅燈，寫程式直到轉綠 |

在這個基礎上，SpecEngine 加了兩條古典細化方法用不到的規則。古典方法用不到，是因為過去做細化的是人：

1. **層與層之間的空白只能由人填。** 某一層無法由上一層推出時，代理必須停下來問人，每個答案都和它產生的規則一起歸檔。
2. **下層不能改寫上層。** 代理寫第 5、6 層時，腳本鎖住第 2 到第 5 層。模組完工後上鎖，之後任何修改都必須走變更流程。

### 靠什麼撐住

| 原則 | 機制 |
| :--- | :--- |
| **人決定，代理提問** | 每個未決邊界變成一題選擇題，只有人能回答。 |
| **靶不能移動** | 實作前，腳本對規格、每個 Step 句型和 Driver 介面拍下快照；實作後逐字節比對，有任何改動就判失敗。 |
| **完工即上鎖** | 完成的模組產生一個進版本控制的 lock 檔。之後巡檢會回報所有未經變更流程的改動，範圍包含規格、規則矩陣、共用術語與資料模型。 |
| **狀態用推導，不用宣告** | 模組所在階段由現有產物推算，過期的狀態欄位騙不了代理，也騙不了團隊。 |

所有強制腳本只用 Node.js 標準函式庫。

## 流程

```mermaid
flowchart LR
    R([需求]) --> D1[1 · 掃描<br/>規則與未決問題]
    D1 --> C2{{2 · 釐清<br/>人回答選擇題}}
    C2 --> F3{{3 · 流程對齊<br/>人確認流程圖}}
    F3 -- 發現缺口 --> C2
    F3 --> G4[4 · 形式化<br/>Gherkin + lint]
    G4 --> T5[5 · 測試骨架<br/>全部紅燈]
    T5 --> I6[6 · 實作<br/>快照 → 變綠 → 比對]
    I6 --> L([模組上鎖])
    L -. 需求變更 .-> CH{{spec change<br/>人核准變更範圍}}
    CH --> G4
    L -. 上線後 .-> A[漂移巡檢]
```

六角形是人工關卡，代理會停在那裡等人。

| 階段 | 指令 | 誰動手 | 產出 |
| :--- | :--- | :--- | :--- |
| 導入 | `spec manifest sync` | 代理掃描，缺的欄位問人 | `architecture-manifest.md`：語言、測試指令、目錄 |
| 1 掃描 | `spec 01` | 代理 | 規則矩陣草稿、資料模型草稿、待答問題佇列 |
| 2 釐清 | `spec 02` | **人** | 決策寫回矩陣 |
| 3 流程對齊 | `spec flow-align` | **人** | 確認過的流程圖；有缺口退回第 2 站 |
| 4 形式化 | `spec 03` | 代理 | 通過 `feature-lint.js` 的 `.feature` 檔 |
| 5 測試骨架 | `spec 04` | 代理 | Step Definitions 與 Driver 介面，全部紅燈 |
| 6 實作 | `spec 05` | 代理 | 產品程式碼、`spec-guard.js verify` 通過、模組 lock |
| 變更 | `spec change` | 代理，**人核准** | 分類過的變更紀錄、重新上鎖、範圍外規則逐字未動的證明 |
| 巡檢 | `spec 06` | 代理，唯讀 | 漂移報告：lock、資料表結構、規則覆蓋率 |
| 狀態 | `spec status` | 腳本 | 每個模組的階段、待答題數、下一步 |

`spec run` 會串起第 1 到第 6 站，並從模組目前所在的位置開始。

## 實證

### 對照實驗

三個難度遞增的需求，在三種條件下各自實作。三種條件用同一個基準專案、同一份需求方標準答案表，結果由代理看不到的隱藏驗收測試評分。大部分回合使用 Claude Fable 5.1；T3 在切換模型後續跑或補跑的回合使用 Claude Opus 5.5。下表只計乾淨回合。

| 需求 | 不用 SDD 工具 | GitHub Spec Kit | SpecEngine 2.0 |
| :--- | :---: | :---: | :---: |
| T1 會員點數折抵（18 條測試） | 11、11 | 18、18 | 18、18 |
| T2 訂單狀態機（32 條測試） | 20、20 | 32、32 | 32、32 |
| T3 多租戶優惠券（38 條測試） | 20、22 | 36、38 | 38 |

| 偷改測試：在已上鎖的規格中改掉一個值 | 結果 |
| :--- | :--- |
| SpecEngine | **8 次全部**被 `spec-guard.js audit` 在一秒內抓到 |
| GitHub Spec Kit | `converge` 2 次抓到 1 次；改掉的門檻值有被提到，但仍判定已收斂 |
| 不用 SDD 工具 | 沒有機制，測試照樣通過 |

這些數字的意思：

- **兩套 SDD 工具都大幅勝過基準。** 不用工具時，代理把每個失敗原因碼都猜錯，T3 連行為也猜錯。
- **Spec Kit 和 SpecEngine 的精準度打平。** SpecEngine 在 T2 問到了每個未決邊界。Spec Kit 的 clarify 每輪最多 5 題，在 T3 的一個回合漏問了一個邊界。
- **SpecEngine 的優勢在強制力。** 它的保證來自腳本，不論哪個模型執行流程都成立。
- **SpecEngine 比較花時間。** 耗時約為 Spec Kit 的 1.4 到 1.6 倍，停下來等人的次數也較多。

### 換成弱模型

T2、T3 改用目前最小的 Claude 模型 Claude Haiku 5.5 重跑。

| 需求 | 不用 SDD 工具 | GitHub Spec Kit | SpecEngine 2.1 |
| :--- | :---: | :---: | :---: |
| T2 訂單狀態機（32 條測試） | 20 | 20 | **32** |
| T3 多租戶優惠券（38 條測試） | 23 | 31 | **38** |

用強模型時兩套 SDD 工具打平。換成弱模型後，Spec Kit 的 clarify 判定 T2 沒有重要歧義，只問了 1 題，分數掉到和不用工具一樣。SpecEngine 的掃描階段照程序把每個未決邊界排成問題，所以弱模型仍問到了 11 個中的 9 個、14 個中的 13 個，維持滿分。每格只有一個回合。

### 每一層抓得到哪些錯

在每個回合裡逐一植入錯誤：少一條規則、少一個情境、改一個範例值、改一個 Step 句型、把斷言清空。只有 SpecEngine 能在建立當下用 `feature-lint.js` 抓到少掉的規則或情境；上鎖之後，任何規格改動它都抓得到。有兩個缺口所有工具都有，SpecEngine 也不例外：一是範例值寫錯但程式也跟著錯，二是 Step 裡的斷言被清空。突變測試顯示三種條件寫出的測試一樣紮實，差別在於被測的行為是不是需求方要的那個。

每格只有一到兩個回合，相差一兩條測試不代表優劣。T3 有三個回合因代理讀到答案表而作廢，改由另一個 session 回答後重跑乾淨回合。需求、答案表、隱藏測試、每個回合的產出與評分腳本都在 [`benchmark/`](benchmark/README.md)，上面每個數字都能從中重新產生。

### 需求變更流程（2.1.0）

13 組變更情境全部通過隱藏驗收。情境涵蓋：只改參數、改既有行為、新增規則、模糊的需求、偽裝成小調整的行為變更、中斷後在新 session 續跑。同樣的指示下，2.0 對照組只要遇到變更單寫「其他規則不變」，就會不經核准直接改規格。

### 個案研究

四句話的需求產生 11 個人工決策和 21 個通過的情境。其中一個情境失敗，原因是代理把範例抄錯進 Gherkin。代理回報了這個瑕疵，沒有去改已凍結的規格。完整重現包在 [`case-study/`](case-study/README.md)。

## 安裝

在 Claude Code 中執行：

```text
/plugin marketplace add https://github.com/yi-luan/specengine-plugin
/plugin install specengine@specengine-marketplace
```

升級：

```text
/plugin marketplace update specengine-marketplace
```

### 環境需求

- Claude Code
- `PATH` 上有 Node.js 18 以上
- 一個 git repo，以及在 manifest 中宣告的 BDD 測試框架。目前完整跑通過的是 cucumber-js。

## 快速開始

**1. 導入專案。** 在你的 repo 裡對 Claude 說：

> 幫我把 SpecEngine 導入這個專案

它會掃描專案、寫出 `.claude/spec/architecture-manifest.md`，只問它查不到的欄位。

**2. 開發一個功能。** 貼上需求並說：

> spec run

代理會依序跑完各站，只在人工關卡停下來。

**3. 修改已完成的功能。**

> 需求變更：折抵上限從 30% 改成 35%

變更會先被分成三類：只改參數、改既有行為、新增規則，再只跑該類需要的站。規格改動前要你核准範圍。改完後，腳本會檢查範圍外的每條規則逐字未動。

**4. 隨時查看進度。**

> spec status

請把 `.specengine/sdd/.spec-guard-snapshot.json` 加進 `.gitignore`。`.specengine/` 底下其餘檔案都應進版本控制。

## 什麼被強制、怎麼強制

| 保證 | 執行者 | 強度 |
| :--- | :--- | :--- |
| 未決問題不由代理代答 | 各站指示 | 提示詞層級 |
| 人工關卡確實停下 | 各站指示 | 提示詞層級 |
| Gherkin 結構與規則一一覆蓋 | `feature-lint.js` | 腳本 |
| 實作期間規格、Step 句型、Driver 介面凍結 | `spec-guard.js snapshot / verify` | 腳本 |
| 完工模組只能經變更流程修改 | `spec-guard.js lock / audit` | 腳本 |
| 變更經核准、有範圍、有紀錄 | `spec-change.js` | 腳本 |
| 模組階段 | `spec-status.js` | 腳本 |

提示詞層級的規則在上述回合中都有遵守，但沒有腳本保證。腳本層級的保證，代理繞不過去。

## 目錄結構

```text
specengine-plugin/
├── skills/        11 個流程階段，各一份 SKILL.md
├── scripts/       feature-lint、spec-guard、spec-change、spec-status（Node.js，無相依套件）
├── docs/          contract-rules.md：所有產物的格式規範
├── templates/     導入時用的 manifest 與 CLAUDE.md 區塊範本
├── benchmark/     與 Spec Kit、不用工具的對照評測：每個回合的產出與評分腳本
├── case-study/    論文個案的重現包
└── paper/         論文原始檔（LaTeX）與 PDF

你的專案（導入後）
├── .claude/spec/architecture-manifest.md
└── .specengine/
    ├── spec/      規格契約：feature、資料模型、術語、慣例、刻意不做清單
    └── sdd/       流程狀態：規則矩陣、待答題、決策、流程圖、lock、變更紀錄
```

## 限制

- **測試是例子，不是證明。** 表格列了三個值，不代表第四個值一定對。
- **Step 句型凍結只認呼叫式寫法**，例如 cucumber-js、Cucumber-JVM 的 `Given('…', fn)`。pytest-bdd、behave、Reqnroll 這類裝飾器寫法目前偵測不到。
- **各站指示以繁體中文撰寫**，產出的規格產物也是繁體中文。程式碼識別字的語言依 manifest 設定。
- **這套流程要花人的注意力。** 很小的改動用它會顯得流程比改動還重。

## 論文

設計與個案研究見：

> Allen Tsai. *Constraining LLM-Assisted Behavior-Driven Development with Externally Enforced Specification Contracts: Design and Case Study of SpecEngine.* 2026. 原始檔在 [`paper/`](paper/)。

```bibtex
@misc{tsai2026specengine,
  author = {Tsai, Allen},
  title  = {Constraining {LLM}-Assisted Behavior-Driven Development with Externally
            Enforced Specification Contracts: Design and Case Study of {SpecEngine}},
  year   = {2026},
  note   = {Manuscript}
}
```

## 授權

[MIT](LICENSE)。版本變更見 [CHANGELOG.md](CHANGELOG.md)。
