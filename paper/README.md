# arXiv 投稿包

`main.tex` 是單一檔案：參考文獻內嵌、兩張圖用 TikZ 畫，不需要其他檔案。上傳時直接上傳這一個檔案即可，arXiv 會用 pdfLaTeX 編譯。`main.pdf` 是本機（tectonic）編譯的預覽，共 11 頁；arXiv 編出來的字型會是正式的 Times，換行可能略有不同。

## 上傳前

- [x] 作者欄、致謝段的生成式 AI 使用聲明
- [x] 編譯通過、版面檢查
- [ ] GitHub repo 轉公開（tag `arxiv-v1` 與 `v2.0.0` 已推上去）
- [ ] 上傳後檢查 arXiv 產生的 PDF 預覽

## 表單欄位

| 欄位 | 填法 |
| --- | --- |
| Primary category | cs.SE (Software Engineering) |
| Cross-list | cs.AI |
| Title | Constraining LLM-Assisted Behavior-Driven Development with Externally Enforced Specification Contracts: Design and Case Study of SpecEngine |
| Authors | Allen Tsai |
| Abstract | 複製 `main.tex` 的 abstract 段（1,882 字元，上限 1,920） |
| Comments | `11 pages, 2 figures, 6 tables. Code and replication package: https://github.com/yi-luan/specengine-plugin` （若 arXiv 編出的頁數不同就改） |
| ACM class | D.2.1; D.2.4; D.2.5 |
| License | 建議 CC BY 4.0 |

第一次在 cs 類別投稿需要 endorsement；用學校信箱註冊通常可自動取得，否則需請已投過 cs.SE 的人背書。
