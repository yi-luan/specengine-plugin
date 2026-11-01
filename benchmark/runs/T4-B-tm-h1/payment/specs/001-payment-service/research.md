# Research: 付款服務

本功能沒有需要外部調查的 NEEDS CLARIFICATION 項目；技術棧由憲法與專案設定固定。以下記錄設計決定。

## 1. 事件 id 產生

- **Decision**: 付款服務自行產生事件 id，格式 `pay-<序號>`，序號為服務實例內單調遞增計數器。
- **Rationale**: events.ts 規定各服務自行產生 id 且全系統唯一；以前綴區隔服務，計數器在單一實例內唯一。
- **Alternatives considered**: UUID（需要 `crypto.randomUUID`，增加測試的不確定性）；時間戳（同毫秒可能重複）。

## 2. 亂序處理（StockReserved 先於 OrderPlaced）

- **Decision**: 暫存，狀態設為「等待訂單資訊」；`OrderPlaced` 抵達時再依餘額判定。
- **Rationale**: 需求方授權由工程判斷；直接判付款失敗會在正常亂序時誤觸發庫存放回；忽略則依賴重送，且無法保證重送時間。
- **Alternatives considered**: 直接發出付款失敗（誤判）；忽略（依賴重送，與 spec 的「至少送達一次」假設相比風險較高）。

## 3. 取消與扣款的先後

- **Decision**: `OrderCancelled` 不論先後都會把訂單標為已取消；已取消的訂單不會再扣款；已扣款的訂單收到取消則退款一次。
- **Rationale**: 需求方 Q2 選 A；取消事件先到時，後到的 `StockReserved` 不應產生扣款。
- **Alternatives considered**: 取消後仍扣款再退款（帳務可追蹤但產生多餘事件，被否決）。

## 4. 冪等

- **Decision**: 每筆訂單的付款紀錄為狀態機；扣款僅能從「等待」或「未扣款」進入「已扣款」，退款僅能從「已扣款」進入「已退款」。其他輸入直接回傳空陣列。
- **Rationale**: 狀態機讓重複與亂序事件的結果收斂，不需要額外的事件去重表。
- **Alternatives considered**: 記錄已處理事件 id 的集合（可行，但對業務狀態無額外幫助，且會無限增長）。
