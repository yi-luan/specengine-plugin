# arXiv 投稿包

`main.tex` 是單一檔案：參考文獻內嵌、兩張圖用 TikZ 畫，不需要其他檔案。上傳時把 `main.tex` 單獨壓成 zip，或直接上傳這一個檔案即可。arXiv 會用 pdfLaTeX 編譯。

## 上傳前要補的

- [ ] 作者欄：系所、學校、城市、信箱（`main.tex` 開頭的 `TODO(author)`）
- [ ] 致謝段的生成式 AI 使用聲明，確認措辭（`TODO(author)`）
- [ ] 本地或 Overleaf 編譯一次，確認沒有溢出版面
- [ ] GitHub repo 轉公開，並確認 tag `arxiv-v1` 與 `v2.0.0` 已推上去

## 表單欄位

| 欄位 | 填法 |
| --- | --- |
| Primary category | cs.SE (Software Engineering) |
| Cross-list | cs.AI |
| Title | Constraining LLM-Assisted Behavior-Driven Development with Externally Enforced Specification Contracts: Design and Case Study of SpecEngine |
| Authors | Allen Tsai |
| Abstract | 複製 `main.tex` 的 abstract 段（1,882 字元，上限 1,920） |
| Comments | `N pages, 2 figures, 6 tables. Code and replication package: https://github.com/yi-luan/specengine-plugin` （N 依編譯結果） |
| ACM class | D.2.1; D.2.4; D.2.5 |
| License | 建議 CC BY 4.0 |

第一次在 cs 類別投稿需要 endorsement；用學校信箱註冊通常可自動取得，否則需請已投過 cs.SE 的人背書。
