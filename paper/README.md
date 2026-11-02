# arXiv 投稿包

| 檔案 | 用途 |
| --- | --- |
| `arxiv-source.tar.gz` | **上傳這個。** 內含 `main.tex` 一個檔案：參考文獻內嵌、兩張圖用 TikZ 畫。arXiv 會用 pdfLaTeX 自己編出 PDF。 |
| `arxiv-abstract.txt` | 表單 Abstract 欄位的純文字，直接貼上。 |
| `main.pdf` | 用 pdfLaTeX（與 arXiv 相同的引擎）從 `arxiv-source.tar.gz` 編出的版本，共 14 頁，無錯誤、無未定義參照。arXiv 預覽應與它一致。 |
| `main.tex` | 原始檔。第一行的 `\pdfoutput=1` 是 arXiv 要求的，請保留。 |

arXiv 不收由 LaTeX 產生的 PDF 單檔，一定要上傳原始碼；PDF 由 arXiv 產生。

## 上傳步驟

1. 到 <https://arxiv.org/submit> 登入，選 New Submission。
2. License 選 CC BY 4.0；Primary category 選 cs.SE。
3. Add Files 上傳 `arxiv-source.tar.gz`，按 Process。
4. 檢查 arXiv 產生的 PDF 預覽：14 頁左右、兩張圖與九個表都在、沒有 `??` 的參照。
5. 依下表填 Metadata，送出。

## 表單欄位

| 欄位 | 填法 |
| --- | --- |
| Primary category | cs.SE (Software Engineering) |
| Cross-list | cs.AI |
| Title | Constraining LLM-Assisted Behavior-Driven Development with Script-Enforced Specification Contracts: Design and Evaluation of SpecEngine |
| Authors | Yilun Tsai |
| Abstract | 貼上 `arxiv-abstract.txt`（1,858 字元，上限 1,920） |
| Comments | `14 pages, 2 figures, 9 tables. Code, benchmark and replication package: https://github.com/yi-luan/specengine-plugin` （若 arXiv 編出的頁數不同就改） |
| ACM class | D.2.1; D.2.4; D.2.5 |
| License | CC BY 4.0 |

第一次在 cs 類別投稿需要 endorsement；用學校信箱註冊通常可自動取得，否則需請已投過 cs.SE 的人背書。

## 改稿之後

改 `main.tex` 後重新打包並移動 tag，讓 Data Availability 指向的版本含最新資料：

```sh
cd paper && tar -czf arxiv-source.tar.gz main.tex && cd ..
git tag -f -a arxiv-v1 -m "arXiv 第一版投稿" && git push -f github arxiv-v1
```
