# アタック25風クイズアプリ 仕様書 v0.1

## 1. 概要

本アプリは、25枚のパネルを使ったクイズゲームをオンライン上で進行できるアプリである。

主な利用者は以下の2種類。

- **プレイヤー**: 名前を入力してゲームに参加し、出題に対して早押しボタンを押す
- **ゲームマスター**: 出題・早押し結果の確認・正誤判定・パネル操作・ゲーム進行を管理する

## 2. 想定する画面

MVPでは、最初から以下の3画面に分けて実装する。

```text
/master/:roomId   ゲームマスター用画面
/player/:roomId   プレイヤー用スマホ画面
/board/:roomId    大画面表示用パネル画面
```

ルームIDはゲーム作成時にランダム生成する。

例:

```text
/master/abc123
/player/abc123
/board/abc123
```

### 2.1 パネル画面

1〜25のパネルを表示する画面。

#### 目的

- 現在のパネル状況を参加者全員が確認できるようにする
- 各プレイヤーがどのパネルを獲得しているかを視覚的に表示する

#### 表示内容

- 5×5 のパネル
- 各パネル番号: 1〜25
- 各パネルの所有者を示す色
- 未取得パネルの状態
- 現在のスコア
- プレイヤー一覧
- 現在のターン情報

#### 操作権限

`/board/:roomId` は表示専用とする。

- パネル操作はできない
- 正誤判定はできない
- 早押し操作はできない
- ゲームマスター画面の操作結果をリアルタイムに反映する

#### パネル状態

各パネルは以下の状態を持つ。

| 状態 | 説明 |
|---|---|
| 未取得 | まだ誰にも取られていない |
| プレイヤー所有 | 特定のプレイヤーが獲得している |
| 選択可能 | 現在の正解者が選択できる候補 |
| 選択中 | ゲームマスターが操作中のパネル |

## 3. プレイヤー画面

### 3.1 目的

プレイヤーがゲームに参加し、クイズに対して早押し回答できるようにする。

### 3.2 機能

#### 名前入力

- プレイヤーは名前を入力して参加する
- 名前はゲーム内で表示される
- 同じ名前は一旦許可する
- 最大4人まで参加できる
- 4人埋まっている場合は「満員です」と表示する
- 退出したプレイヤーの枠は再利用可能とする

#### 早押しボタン

- プレイヤーは問題に対してボタンを押す
- ボタンを押した時刻をサーバー側で記録する
- 最も早く押したプレイヤーがゲームマスター画面に表示される
- 一度押した後は、同じ問題中は再度押せない

#### プレイヤー画面の表示内容

- 自分の名前
- 自分のプレイヤー番号
- 自分の色
- 早押しボタン
- 現在の状態
  - 待機中
  - 回答受付中
  - 押下済み
  - 回答権あり
  - 回答権なし
  - 満員
- 自分のスコアまたは獲得パネル数

#### 再接続

- 参加時に発行された playerId を localStorage に保存する
- プレイヤー画面をリロードした場合、localStorage の playerId を使って同じプレイヤーとして復帰する
- ルーム内に同じ playerId が残っている場合は再参加扱いにする
- 退出済みまたは削除済みの場合は、再度名前入力から参加する

## 4. ゲームマスター画面

### 4.1 目的

ゲームマスターがクイズ進行、早押し結果確認、正誤判定、パネル操作を行う。

### 4.2 機能

#### プレイヤー管理

- 参加中のプレイヤー一覧を表示する
- 各プレイヤーに番号を自動で割り当てる
- プレイヤーごとに色を自動で割り当てる
- プレイヤーの参加・退出状態を確認する
- 退出したプレイヤーの枠は再利用可能にする

#### プレイヤー色

最大4人までとし、色は以下の順番で割り当てる。

| 番号 | 色 |
|---|---|
| 1 | 赤 |
| 2 | 緑 |
| 3 | 白 |
| 4 | 青 |

#### 問題進行管理

- 「回答受付開始」ボタンを押すと、プレイヤーが早押しできる状態になる
- 「回答受付停止」ボタンを押すと、早押しを締め切る
- 「リセット」ボタンで次の問題に進む

#### 早押し結果表示

- ボタンを押したプレイヤーを押下順に表示する
- 最も早く押したプレイヤーを強調表示する
- 押下時刻または差分時間を表示する

#### 正誤判定

ゲームマスターは、最初に押したプレイヤーに対して以下を選択できる。

- 正解
- 不正解
- 無効

##### 正解の場合

- 正解者がパネルを選択できる状態にする
- ゲームマスターが正解者の番号・色でパネルを操作できる

##### 不正解の場合

- そのプレイヤーを当該問題の回答権なしにする
- 押下順一覧の中で、次に早く押したプレイヤーへ回答権を移す
- 次の回答者がいない場合は、その問題の回答受付を終了する

##### 無効の場合

- 誤操作や通信遅延などを想定
- 早押し状態を必要に応じてやり直せる

#### パネル操作

ゲームマスターは以下の操作を行える。

- 正解者が決まると、ゲームマスター画面で正解者が自動選択される
- パネルをクリックすると、選択中プレイヤーの色になる
- 任意のプレイヤーを手動選択して、パネル所有者を変更できる
- パネルを未取得状態に戻せる
- 別プレイヤーの色に変更できる
- 全パネルリセットができる

#### パネル操作モード

ゲームマスター画面には以下の操作モードを用意する。

| モード | 説明 |
|---|---|
| プレイヤー選択モード | 選択したプレイヤーの色でパネルを塗る |
| 未取得に戻すモード | クリックしたパネルを未取得に戻す |
| 全パネルリセット | すべてのパネルを未取得に戻す |

## 5. 基本的なゲームフロー

### 5.1 参加フェーズ

1. ゲームマスターがゲームルームを作成する
2. ランダムなルームIDが生成される
3. ゲームマスター画面、プレイヤー画面、ボード画面のURLが表示される
4. プレイヤーが `/player/:roomId` にアクセスする
5. プレイヤーが名前を入力する
6. サーバーが空いている番号と色を割り当てる
7. プレイヤーIDを発行し、プレイヤー側の localStorage に保存する
8. ゲームマスターが参加者を確認する
9. 4人埋まっている場合、新規参加者には「満員です」と表示する

### 5.2 問題フェーズ

1. ゲームマスターが問題を読み上げる
2. ゲームマスターが回答受付を開始する
3. プレイヤーが早押しボタンを押す
4. サーバーが押下順を記録する
5. ゲームマスター画面に押下順が表示される
6. 最初に押したプレイヤーに回答権が与えられる
7. プレイヤーが口頭で回答する
8. ゲームマスターが正解 / 不正解 / 無効を判定する
9. 不正解の場合、すでに押していた人の中で次に早いプレイヤーへ回答権を移す
10. 不正解後に新しく早押しすることはできない
11. 正解者が出る、または回答可能なプレイヤーがいなくなるまで続ける

### 5.3 パネル取得フェーズ

1. 正解者が決まる
2. ゲームマスター画面で正解者が自動選択される
3. ゲームマスターがパネルをクリックする
4. クリックされたパネルが正解者の色になる
5. 必要に応じて、ゲームマスターはパネルを未取得に戻せる
6. 必要に応じて、ゲームマスターは別プレイヤーの色に変更できる
7. スコアが更新される
8. 次の問題へ進む

### 5.4 終了フェーズ

1. 25枚すべてのパネルが埋まる、またはゲームマスターが終了する
2. 最終スコアを表示する
3. 優勝者を表示する

## 6. パネルルール

### 6.1 初期仕様

v0.1では、ゲームマスターが手動で任意のパネルを操作できる仕様とする。

- 正解者が出たら、ゲームマスター画面で正解者が自動選択される
- ゲームマスターがパネルをクリックすると、そのパネルが正解者の色になる
- パネルの選択可能判定は自動では行わない
- パネルの反転処理も自動では行わない
- ゲームマスターが必要に応じて手動でパネル状態を変更する
- パネルを未取得に戻せる
- 別プレイヤーの色に変更できる
- 全パネルリセットができる

理由:

- アタック25の正式なパネル取得ルールはやや複雑
- まずはゲームとして動くことを優先する
- パネル操作を手動にすることで、細かいルール差分にも対応しやすい
- 後から選択可能パネルの自動判定や反転処理を追加できるようにする

### 6.2 将来的に検討するルール

- 正解者が選択できるパネル候補の自動表示
- 挟まれたパネルの自動反転
- 角・辺・中央などの戦略的ルールの再現
- 最終問題や旅行クイズのような特殊ルール
- Undo / Redo 機能

## 7. データ設計案

v0.1では、DBは使わず、Next.jsアプリ内の状態と localStorage でゲーム状態を管理する。

React state を現在の操作用状態として使い、リロードしても消えてほしくない情報は localStorage に保存する。

ただし、後からDBを導入しやすいように、状態の構造は明確に分けておく。

### 7.1 GameRoom

| 項目 | 型 | 説明 |
|---|---|---|
| id | string | ランダム生成されたルームID |
| status | string | waiting / playing / finished |
| currentQuestionId | string | 現在の問題ID |
| createdAt | datetime | 作成日時 |
| updatedAt | datetime | 更新日時 |

### 7.2 Player

| 項目 | 型 | 説明 |
|---|---|---|
| id | string | プレイヤーID |
| roomId | string | 所属ルームID |
| name | string | プレイヤー名 |
| number | integer | プレイヤー番号 |
| color | string | 赤 / 緑 / 白 / 青 |
| status | string | active / disconnected / left |
| score | integer | 獲得パネル数 |
| hasAnsweredCurrentQuestion | boolean | 現在の問題で回答済みかどうか |
| createdAt | datetime | 参加日時 |

### 7.3 Panel

| 項目 | 型 | 説明 |
|---|---|---|
| id | integer | 1〜25 |
| ownerPlayerId | string / null | 所有プレイヤーID |
| state | string | empty / owned / selected |

### 7.4 BuzzerEvent

| 項目 | 型 | 説明 |
|---|---|---|
| id | string | イベントID |
| questionId | string | 問題ID |
| playerId | string | 押したプレイヤーID |
| pressedAt | datetime | サーバーで記録した押下時刻 |
| order | integer | 押下順 |
| status | string | pending / correct / incorrect / invalid |

### 7.5 QuestionState

| 項目 | 型 | 説明 |
|---|---|---|
| id | string | 問題ID |
| status | string | waiting / open / locked / judged |
| buzzerEvents | BuzzerEvent[] | 押下順一覧 |
| currentAnswerPlayerId | string / null | 現在回答権を持つプレイヤー |
| correctPlayerId | string / null | 正解者 |
| createdAt | datetime | 問題開始時刻 |

### 7.6 Next.js内での管理方針

MVPでは、まず React state + localStorage で状態を保持する。

#### 基本方針

- 操作中の状態は React state で管理する
- 状態が変わるたびに localStorage に保存する
- 画面読み込み時に localStorage から状態を復元する
- DBは使わない
- サーバーサイドの永続化も行わない

#### localStorageに保存する情報

MVPでは以下を保存する。

- players
- panels
- currentQuestion
- buzzerEvents
- currentAnswerPlayerId
- gameStatus
- selectedPlayerIdForPanelOperation

#### localStorageに保存しない情報

以下は保存しなくてよい。

- 一時的なボタンのhover状態
- モーダルの開閉状態
- 入力途中の未確定テキスト
- 通信中フラグ

#### localStorageのキー例

```text
attack25-game-state
```

保存するJSONの例:

```json
{
  "gameStatus": "playing",
  "players": [],
  "panels": [],
  "currentQuestion": {},
  "buzzerEvents": [],
  "currentAnswerPlayerId": null
}
```

#### 注意点

localStorageはブラウザごとに保存されるため、別端末・別ブラウザとは自動同期されない。

そのため、MVPでは以下のどちらかを想定する。

1. まずは1台のPC・1ブラウザでゲーム進行を確認する
2. 画面を分ける場合でも、同じブラウザ内の別タブで確認する

複数端末のプレイヤーが同時に参加する形にする場合は、後からWebSocketやDBの導入を検討する。

現時点では、**React state + localStorageで画面と操作感を作り、次に必要になったらリアルタイム同期を検討する** 方針がよい。

## 8. リアルタイム同期

### 8.1 結論

プレイヤーがスマホなど別端末から参加する想定のため、WebSocket またはそれに相当するリアルタイム通信が必要。

localStorage はブラウザごとの保存であり、別端末・別ブラウザ間では同期されない。

MVPでは `/master/:roomId` `/player/:roomId` `/board/:roomId` を別端末で使うため、リアルタイム同期を前提とする。

そのため、MVPの方針を以下にする。

### 8.2 MVP: スマホ参加対応版

MVPでは、ゲームマスター・プレイヤー・ボードを別画面として作る。

```text
/master/:roomId
/player/:roomId
/board/:roomId
```

それぞれの画面は WebSocket を通じて同じ GameState を共有する。

### 8.3 同期対象

プレイヤーがスマホから参加する場合は、リアルタイム同期を追加する。

必要な同期:

- プレイヤーの参加
- プレイヤー名の反映
- 早押し受付状態
- 早押しボタン押下
- 押下順
- 現在回答権を持つプレイヤー
- 正解 / 不正解 / 無効の判定結果
- パネル状態
- スコア
- ゲームリセット

### 8.4 WebSocketで扱うイベント案

#### プレイヤー側から送るイベント

| イベント名 | 説明 |
|---|---|
| join_game | プレイヤーが参加する |
| press_buzzer | 早押しボタンを押す |
| leave_game | プレイヤーが退出する |

#### ゲームマスター側から送るイベント

| イベント名 | 説明 |
|---|---|
| start_question | 早押し受付を開始する |
| stop_question | 早押し受付を停止する |
| judge_correct | 現在の回答者を正解にする |
| judge_incorrect | 現在の回答者を不正解にする |
| judge_invalid | 現在の回答者の押下を無効にする |
| set_panel_owner | パネルの所有者を変更する |
| reset_question | 次の問題に進む |
| reset_game | ゲーム全体をリセットする |

#### サーバーから全画面へ配信するイベント

| イベント名 | 説明 |
|---|---|
| game_state_updated | ゲーム状態全体を配信する |
| buzzer_updated | 押下順を配信する |
| panel_updated | パネル状態を配信する |
| players_updated | プレイヤー一覧を配信する |

### 8.5 採用する技術構成

MVPでは、以下の構成を採用する。

```text
Next.js + Socket.IO 同居構成
Docker環境
Cloud Run デプロイ
DBなし
ゲーム状態はサーバーメモリ管理
```

#### サーバー構成

1つのNode.jsサーバーで以下を同時に扱う。

```text
Node.js custom server
├── Next.js
│   ├── /master/:roomId
│   ├── /player/:roomId
│   └── /board/:roomId
└── Socket.IO
    └── ルーム状態・早押し・パネル状態を管理
```

#### Docker方針

- Dockerfileを用意する
- Next.jsをビルドする
- custom serverを `node server.js` で起動する
- Cloud Runの仕様に合わせて `PORT` 環境変数を使う
- コンテナは `0.0.0.0:${PORT}` でlistenする

#### Cloud Run方針

Cloud RunはWebSocketを扱えるため、Socket.IOを使ったリアルタイム同期をCloud Run上で動かす。

ただし、以下に注意する。

- WebSocket接続中のインスタンスはアクティブ扱いになる
- 接続中は課金対象になり得る
- Cloud Runのリクエストタイムアウト設定を考慮する
- サーバーメモリにゲーム状態を持つため、インスタンス再起動時に状態は消える
- 複数インスタンスにスケールした場合、メモリ上のGameStateがインスタンス間で共有されない

#### MVPでのCloud Run設定方針

MVPでは、メモリ管理を単純にするため、Cloud Runは以下のように設定する方針とする。

```text
最小インスタンス数: 0 または 1
最大インスタンス数: 1
同時実行数: 小さめ
```

特に、DBなし・Redisなしでゲーム状態をメモリ管理する場合、**最大インスタンス数は1**にする。

理由:

- 複数インスタンスに分かれると、同じroomIdでも別々のメモリ状態になってしまう
- 早押し順やパネル状態が画面ごとにズレる可能性がある
- MVPでは高負荷対応よりも動作の一貫性を優先する

#### 将来的な拡張

複数ルームや複数インスタンスに対応したくなった場合は、以下を検討する。

- RedisでGameStateを共有する
- Socket.IO Redis adapterを使う
- DBにルーム状態を保存する
- Cloud Runの最大インスタンス数を増やす

### 8.6 現時点のおすすめ

MVPでは、Next.js + Socket.IO 同居構成を採用する。

実装順は以下にする。

1. Next.jsプロジェクトを作成する
2. custom serverを追加する
3. Socket.IOを追加する
4. ゲーム状態のTypeScript型を整理する
5. `/master/:roomId` を作る
6. `/player/:roomId` を作る
7. `/board/:roomId` を作る
8. プレイヤーIDを localStorage に保存し、再接続できるようにする
9. Dockerfileを作る
10. Cloud Runにデプロイする

この順番にすると、ローカル開発からCloud Runデプロイまで同じ構成で進めやすい。

## 9. 権限

### 9.1 プレイヤー

できること:

- 名前を入力して参加する
- 早押しボタンを押す
- 自分の状態を確認する

できないこと:

- パネルを直接操作する
- 正誤判定を行う
- 他プレイヤーを削除する
- ゲーム状態を変更する

### 9.2 ゲームマスター

できること:

- ゲームを開始・終了する
- 回答受付を開始・停止する
- 早押し結果を確認する
- 正誤判定を行う
- パネルを操作する
- プレイヤー情報を調整する

## 10. MVPの範囲

最初に作るべき最小機能は以下。

1. ルーム作成機能
2. ランダムなルームID生成
3. `/master/:roomId` 画面
4. `/player/:roomId` 画面
5. `/board/:roomId` 画面
6. 最大4人までプレイヤー参加
7. 同じ名前の許可
8. 4人満員時の「満員です」表示
9. 退出枠の再利用
10. プレイヤーIDの localStorage 保存
11. 再接続時に同じプレイヤーとして復帰
12. 赤・緑・白・青の自動割り当て
13. 1〜25のパネル表示
14. プレイヤーごとの早押しボタン
15. 押下順の記録
16. 最速プレイヤーの表示
17. ゲームマスターによる正解 / 不正解 / 無効判定
18. 不正解の場合、すでに押していた人の中で次に早いプレイヤーへ回答権を移す
19. 不正解後に新しく押せない制御
20. 正解者の自動選択
21. パネルクリックで正解者の色に変更
22. パネルを未取得に戻す操作
23. 別プレイヤーの色への変更
24. 全パネルリセット
25. 次の問題へボタン
26. ゲームリセットボタン
27. `/board/:roomId` は表示専用
28. WebSocketによるリアルタイム同期

## 11. MVPでは後回しにするもの

- 問題文の登録・管理
- 正式なアタック25ルールの完全再現
- 自動パネル反転
- ログイン認証
- ランキング機能
- 観戦者モード
- 効果音・演出
- スマホ最適化の細かい調整
- 不正対策の高度化

## 12. 要確認事項

以下は仕様を詰めるために確認が必要。

### 12.1 ゲーム形式

1. プレイヤー人数は可変とする
2. 最大人数は4人までとする
3. ゲームマスターは1人想定
4. 観戦者画面はMVPでは作らない

### 12.2 早押し仕様

1. 早押しボタンは問題ごとに1回だけ押せる仕様とする
2. 不正解の場合、次に早く押した人へ回答権を移す
3. ゲームマスターが受付開始する前に押したボタンは無効にする
4. 通信遅延を考慮して、サーバー到達時刻で判定する

### 12.3 回答方法

1. 回答は口頭で行う
2. プレイヤー画面に回答入力欄は作らない
3. 問題文はアプリ内には持たず、ゲームマスターが口頭で読む

### 12.4 パネルルール

1. 最初は完全手動操作とする
2. 挟んだパネルの自動反転はMVPでは入れない
3. 選択可能なパネル候補の自動表示はMVPでは入れない
4. 誤操作を戻す Undo 機能は将来的に検討する

### 12.5 技術・構成

1. Next.jsで完結させる
2. Rails APIなどのバックエンドはMVPでは使わない
3. DBはMVPでは使わない
4. リアルタイム通信は、まずローカル状態で画面を作り、その後WebSocketを検討する
5. ログインなしでルームURLだけで参加できる仕様にするかは要検討

## 13. 画面別の詳細仕様案

### 13.1 パネル画面

URL例:

```text
/board/:roomId
```

大画面表示用の画面。操作はできない表示専用画面とする。

主な表示:

- 5×5パネル
- プレイヤー一覧
- 各プレイヤーの色
- 各プレイヤーの獲得枚数
- 現在の状態

### 13.2 プレイヤー画面

URL例:

```text
/player/:roomId
```

スマホからアクセスするプレイヤー用画面。名前入力と早押し操作のみを行う。

主な表示:

- 名前入力フォーム
- 参加ボタン
- 早押しボタン
- 自分の状態
- 押下済みかどうか
- 回答権の有無

### 13.3 ゲームマスター画面

URL例:

```text
/master/:roomId
```

ゲームマスター用画面。全操作ができる。

主な表示:

- プレイヤー一覧
- 回答受付開始ボタン
- 回答受付停止ボタン
- 押下順一覧
- 最速プレイヤー表示
- 正解 / 不正解 / 無効 ボタン
- パネル操作UI
- 次の問題へ進むボタン
- ゲーム終了ボタン

## 14. 状態遷移

### 14.1 ゲーム状態

```text
waiting -> playing -> finished
```

### 14.2 問題状態

```text
waiting -> open -> locked -> judged -> waiting
```

#### waiting

次の問題待ち。

#### open

早押し受付中。

#### locked

誰かが押して、回答者を確認中。

#### judged

正誤判定済み。必要に応じてパネル操作へ移る。

## 15. 今後の優先順位

### Step 1

画面モックを作成する。

- パネル画面
- プレイヤー画面
- ゲームマスター画面

### Step 2

ローカル状態でゲームの流れを再現する。

- 参加者追加
- 早押し順の記録
- 手動パネル操作

### Step 3

リアルタイム同期を入れる。

- 複数ブラウザ間で同期
- プレイヤー画面とゲームマスター画面の連携

### Step 4

ルーム機能を入れる。

- ルーム作成
- URL共有
- 参加者管理

### Step 5

ルール自動化を追加する。

- 選択可能パネル判定
- パネル反転
- Undo

## 16. 現時点の方針

まずは、正式ルールの完全再現よりも、以下を優先する。

- MVPから `/master/:roomId` `/player/:roomId` `/board/:roomId` を作る
- ルームIDはランダム生成する
- プレイヤー人数は最大4人までにする
- 同じ名前は一旦許可する
- 退出枠は再利用可能にする
- 4人埋まっていたら「満員です」と表示する
- プレイヤー色は 赤 / 緑 / 白 / 青 とする
- プレイヤーは問題ごとに早押しできる
- 不正解後に新しく押すことはできない
- 不正解の場合は、すでに押していた人の中で次に早いプレイヤーへ回答権を移す
- 回答は口頭で行う
- ゲームマスターが正解 / 不正解 / 無効を判定できる
- 正解者が決まったら、ゲームマスター画面で正解者を自動選択する
- ゲームマスターがパネルをクリックすると、正解者の色になる
- パネルを未取得に戻せる
- 別プレイヤーの色に変更できる
- 全パネルリセットができる
- `/board/:roomId` は表示専用にする
- DBは使わない
- Next.js + Socket.IO 同居構成でリアルタイム同期する
- Docker環境で動かす
- Cloud Runにデプロイする
- Cloud RunではMVP中は最大インスタンス数を1にする
- プレイヤーIDは localStorage に保存する
- 再接続時に同じプレイヤーとして復帰できるようにする

この方針でMVPを作り、その後にパネルルール自動化、DB保存、演出などを追加する。

## 17. 次に詰めるべきこと

現時点で追加で決めるとよい項目は以下。

### 17.1 最大プレイヤー人数

プレイヤー人数は可変だが、最大4人までとする。

理由:

- アタック25の基本形式に近い
- 色分けやスコア表示が見やすい
- 早押し順の管理が複雑になりすぎない
- MVPとして実装しやすい

プレイヤーが4人に達している場合、新規プレイヤー追加はできないようにする。

### 17.2 画面構成

MVPでは以下の3画面を作る。

```text
/master/:roomId   ゲームマスター用。全操作ができる。
/player/:roomId   スマホ用。名前入力と早押しだけ。
/board/:roomId    大画面表示用。パネルとスコアだけ。操作不可。
```

トップ画面では、ゲームマスターがルームを作成できる。

```text
/                 ルーム作成画面
```

ルーム作成後、以下のURLを表示する。

```text
/master/:roomId
/player/:roomId
/board/:roomId
```

### 17.3 状態管理

ゲーム本体の状態は WebSocket サーバー側のメモリで管理する。

- roomId
- players
- panels
- currentQuestion
- buzzerEvents
- currentAnswerPlayerId
- gameStatus
- selectedPlayerIdForPanelOperation

プレイヤー画面では、再接続用に以下を localStorage に保存する。

- roomId
- playerId
- playerName

DBは使わないため、サーバー再起動時にゲーム状態は消える。

### 17.4 ゲームマスターのパネル操作UI

ゲームマスターがパネルを操作する方法は以下とする。

1. 正解者が決まったら、正解者を自動選択する
2. パネルをクリックすると、選択中プレイヤーの色になる
3. ゲームマスターは任意のプレイヤーを手動選択できる
4. 手動選択後にパネルをクリックすると、そのプレイヤーの色に変更される
5. 「未取得に戻す」モードを選ぶと、クリックしたパネルを未取得に戻せる
6. 「全パネルリセット」ボタンで、全パネルを未取得に戻せる

### 17.5 ルームID

ルームIDはゲーム作成時にランダム生成する。

仕様:

- 英数字のランダム文字列
- 6文字程度
- URLで使いやすい文字のみ使う

例:

```text
abc123
A7K92B
```

### 17.6 リセット仕様

#### 次の問題へ

以下のみリセットする。

- 早押し履歴
- 現在の回答権
- 正解者
- 問題状態

以下は残す。

- プレイヤー一覧
- パネル状態
- スコア

#### ゲームリセット

以下をリセットする。

- プレイヤー一覧
- パネル状態
- 早押し履歴
- 現在の回答権
- 正解者
- スコア
- ゲーム状態

### 17.7 参加・退出・再接続

#### 参加

- `/player/:roomId` にアクセスする
- 名前を入力する
- 空いている番号と色が自動割り当てされる
- 最大4人まで参加できる
- 同じ名前は許可する

#### 満員時

- 4人参加済みの場合は「満員です」と表示する
- 新規参加はできない

#### 退出

- プレイヤーが退出した場合、その枠は再利用可能とする
- status は `left` または `disconnected` として扱う

#### 再接続

- 参加時に playerId を localStorage に保存する
- 同じ端末・同じブラウザで再アクセスした場合、同じ playerId で復帰する
- サーバー側に該当 playerId が残っていれば同じプレイヤーとして扱う
- 該当 playerId がなければ新規参加扱いにする

### 17.8 デプロイ構成

MVPでは以下のデプロイ構成にする。

```text
Docker container
└── Node.js custom server
    ├── Next.js
    └── Socket.IO

Deploy target:
└── Cloud Run
```

#### Cloud Runでの制約

DBなし・Redisなしでサーバーメモリに状態を持つため、MVPではCloud Runの最大インスタンス数を1にする。

```text
max instances = 1
```

この設定により、同じルームの通信が別インスタンスに分散して状態がズレる問題を避ける。

#### 注意点

- サーバー再起動時にゲーム状態は消える
- インスタンスが0になった場合もゲーム状態は消える
- WebSocket接続中はCloud Runインスタンスがアクティブ扱いになる
- 長時間つなぎっぱなしの運用ではコストに注意する

#### 将来的な本番対応

長く運用する場合は以下を検討する。

- Redisによる状態共有
- DBによるゲーム履歴保存
- 複数インスタンス対応
- Socket.IO Redis adapter
- 認証・管理者パスワード
- カスタムドメイン

## 18. TypeScript 型定義

MVPでは以下の型を基本にする。

```ts
type RoomId = string;
type PlayerId = string;
type QuestionId = string;

type PlayerColor = "red" | "green" | "white" | "blue";

type GameStatus = "waiting" | "playing" | "finished";

type QuestionStatus =
  | "waiting"
  | "open"
  | "answering"
  | "judged";

type PlayerStatus =
  | "active"
  | "disconnected"
  | "left";

type BuzzerStatus =
  | "pending"
  | "current"
  | "correct"
  | "incorrect"
  | "invalid";

type PanelOperationMode =
  | "set_owner"
  | "clear_owner";
```

### 18.1 Player

```ts
type Player = {
  id: PlayerId;
  roomId: RoomId;
  name: string;
  number: 1 | 2 | 3 | 4;
  color: PlayerColor;
  status: PlayerStatus;
  score: number;
  joinedAt: number;
  lastSeenAt: number;
};
```

### 18.2 Panel

```ts
type Panel = {
  number: number; // 1〜25
  ownerPlayerId: PlayerId | null;
};
```

### 18.3 BuzzerEvent

```ts
type BuzzerEvent = {
  id: string;
  roomId: RoomId;
  questionId: QuestionId;
  playerId: PlayerId;
  pressedAt: number;
  order: number;
  status: BuzzerStatus;
};
```

### 18.4 QuestionState

```ts
type QuestionState = {
  id: QuestionId;
  status: QuestionStatus;
  buzzerEvents: BuzzerEvent[];
  currentAnswerPlayerId: PlayerId | null;
  correctPlayerId: PlayerId | null;
  startedAt: number | null;
  endedAt: number | null;
};
```

### 18.5 GameState

```ts
type GameState = {
  roomId: RoomId;
  status: GameStatus;
  players: Player[];
  panels: Panel[];
  currentQuestion: QuestionState;
  selectedPlayerIdForPanelOperation: PlayerId | null;
  panelOperationMode: PanelOperationMode;
  createdAt: number;
  updatedAt: number;
};
```

### 18.6 初期 GameState

```ts
const createInitialPanels = (): Panel[] =>
  Array.from({ length: 25 }, (_, index) => ({
    number: index + 1,
    ownerPlayerId: null,
  }));

const createInitialQuestionState = (): QuestionState => ({
  id: crypto.randomUUID(),
  status: "waiting",
  buzzerEvents: [],
  currentAnswerPlayerId: null,
  correctPlayerId: null,
  startedAt: null,
  endedAt: null,
});
```

## 19. Socket.IO イベント設計

Socket.IOでは、クライアントからサーバーへ操作イベントを送り、サーバーがGameStateを更新し、全クライアントへ最新状態を配信する。

基本方針:

- GameStateの正本はサーバー側メモリに置く
- クライアントは直接状態を確定させない
- クライアントは操作イベントを送るだけ
- サーバーが検証・更新・配信を行う
- 更新後は `game_state_updated` で全画面に配信する

### 19.1 Client to Server Events

```ts
type ClientToServerEvents = {
  create_room: (
    payload: CreateRoomPayload,
    callback: SocketCallback<CreateRoomResult>
  ) => void;

  join_room_as_master: (
    payload: JoinRoomAsMasterPayload,
    callback: SocketCallback<JoinRoomAsMasterResult>
  ) => void;

  join_room_as_board: (
    payload: JoinRoomAsBoardPayload,
    callback: SocketCallback<JoinRoomAsBoardResult>
  ) => void;

  join_room_as_player: (
    payload: JoinRoomAsPlayerPayload,
    callback: SocketCallback<JoinRoomAsPlayerResult>
  ) => void;

  leave_player: (
    payload: LeavePlayerPayload,
    callback: SocketCallback<LeavePlayerResult>
  ) => void;

  start_question: (
    payload: StartQuestionPayload,
    callback: SocketCallback<ActionResult>
  ) => void;

  stop_question: (
    payload: StopQuestionPayload,
    callback: SocketCallback<ActionResult>
  ) => void;

  press_buzzer: (
    payload: PressBuzzerPayload,
    callback: SocketCallback<PressBuzzerResult>
  ) => void;

  judge_answer: (
    payload: JudgeAnswerPayload,
    callback: SocketCallback<ActionResult>
  ) => void;

  next_question: (
    payload: NextQuestionPayload,
    callback: SocketCallback<ActionResult>
  ) => void;

  set_panel_owner: (
    payload: SetPanelOwnerPayload,
    callback: SocketCallback<ActionResult>
  ) => void;

  clear_panel_owner: (
    payload: ClearPanelOwnerPayload,
    callback: SocketCallback<ActionResult>
  ) => void;

  reset_all_panels: (
    payload: ResetAllPanelsPayload,
    callback: SocketCallback<ActionResult>
  ) => void;

  reset_game: (
    payload: ResetGamePayload,
    callback: SocketCallback<ActionResult>
  ) => void;
};
```

### 19.2 Server to Client Events

```ts
type ServerToClientEvents = {
  game_state_updated: (payload: GameStateUpdatedPayload) => void;
  room_not_found: (payload: ErrorPayload) => void;
  player_kicked: (payload: { roomId: RoomId; playerId: PlayerId }) => void;
};
```

### 19.3 共通 Callback 型

```ts
type SocketCallback<T> = (response: T) => void;

type ActionResult =
  | { ok: true; gameState: GameState }
  | { ok: false; error: string };
```

### 19.4 Payload 型

```ts
type CreateRoomPayload = Record<string, never>;

type CreateRoomResult =
  | {
      ok: true;
      roomId: RoomId;
      masterUrl: string;
      playerUrl: string;
      boardUrl: string;
      gameState: GameState;
    }
  | { ok: false; error: string };

type JoinRoomAsMasterPayload = {
  roomId: RoomId;
};

type JoinRoomAsMasterResult = ActionResult;

type JoinRoomAsBoardPayload = {
  roomId: RoomId;
};

type JoinRoomAsBoardResult = ActionResult;

type JoinRoomAsPlayerPayload = {
  roomId: RoomId;
  name: string;
  playerId?: PlayerId;
};

type JoinRoomAsPlayerResult =
  | {
      ok: true;
      player: Player;
      gameState: GameState;
      reconnected: boolean;
    }
  | {
      ok: false;
      reason: "room_not_found" | "room_full" | "invalid_name";
      message: string;
    };

type LeavePlayerPayload = {
  roomId: RoomId;
  playerId: PlayerId;
};

type LeavePlayerResult = ActionResult;

type StartQuestionPayload = {
  roomId: RoomId;
};

type StopQuestionPayload = {
  roomId: RoomId;
};

type PressBuzzerPayload = {
  roomId: RoomId;
  playerId: PlayerId;
};

type PressBuzzerResult =
  | {
      ok: true;
      buzzerEvent: BuzzerEvent;
      gameState: GameState;
    }
  | {
      ok: false;
      reason:
        | "room_not_found"
        | "player_not_found"
        | "question_not_open"
        | "already_pressed";
      message: string;
    };

type JudgeResult = "correct" | "incorrect" | "invalid";

type JudgeAnswerPayload = {
  roomId: RoomId;
  playerId: PlayerId;
  result: JudgeResult;
};

type NextQuestionPayload = {
  roomId: RoomId;
};

type SetPanelOwnerPayload = {
  roomId: RoomId;
  panelNumber: number;
  playerId: PlayerId;
};

type ClearPanelOwnerPayload = {
  roomId: RoomId;
  panelNumber: number;
};

type ResetAllPanelsPayload = {
  roomId: RoomId;
};

type ResetGamePayload = {
  roomId: RoomId;
};

type GameStateUpdatedPayload = {
  roomId: RoomId;
  gameState: GameState;
};

type ErrorPayload = {
  message: string;
};
```

## 20. イベントごとの処理仕様

### 20.1 create_room

ゲームマスターがトップ画面からルームを作成する。

サーバー処理:

1. ランダムなroomIdを生成する
2. 初期GameStateを作る
3. roomsメモリに保存する
4. master/player/board URLを返す

### 20.2 join_room_as_player

プレイヤーが `/player/:roomId` から参加する。

サーバー処理:

1. roomIdの存在確認
2. playerId があり、同じplayerIdのプレイヤーが存在する場合は再接続扱い
3. 再接続でない場合、active なプレイヤー数を確認
4. 4人以上なら `room_full` を返す
5. 空いている番号と色を割り当てる
6. Playerを作成してGameStateに追加
7. 最新GameStateを全員に配信

### 20.3 press_buzzer

プレイヤーが早押しボタンを押す。

サーバー処理:

1. roomIdの存在確認
2. playerIdの存在確認
3. currentQuestion.status が `open` であることを確認
4. 同じquestionIdで同じplayerIdがすでに押していないか確認
5. BuzzerEventを作成する
6. 最初の押下であれば `currentAnswerPlayerId` に設定し、QuestionStatusを `answering` にする
7. 最新GameStateを全員に配信

### 20.4 judge_answer

ゲームマスターが現在回答中のプレイヤーに対して正誤判定する。

#### correct の場合

1. 対象BuzzerEventを `correct` にする
2. correctPlayerId を設定する
3. selectedPlayerIdForPanelOperation を正解者にする
4. QuestionStatusを `judged` にする
5. 最新GameStateを配信する

#### incorrect の場合

1. 対象BuzzerEventを `incorrect` にする
2. pending のBuzzerEventの中で order が最も小さいものを探す
3. 次のBuzzerEventがあれば、そのplayerIdを currentAnswerPlayerId にする
4. 次のBuzzerEventがなければ currentAnswerPlayerId を null にし、QuestionStatusを `judged` にする
5. 不正解後に新しく押すことはできない
6. 最新GameStateを配信する

#### invalid の場合

1. 対象BuzzerEventを `invalid` にする
2. pending のBuzzerEventの中で order が最も小さいものを探す
3. 次のBuzzerEventがあれば、そのplayerIdを currentAnswerPlayerId にする
4. 次のBuzzerEventがなければ currentAnswerPlayerId を null にする
5. 最新GameStateを配信する

### 20.5 set_panel_owner

ゲームマスターがパネル所有者を変更する。

サーバー処理:

1. roomIdの存在確認
2. panelNumber が 1〜25 であることを確認
3. playerId の存在確認
4. 対象パネルの ownerPlayerId を変更する
5. 全プレイヤーの score を再計算する
6. 最新GameStateを配信する

### 20.6 clear_panel_owner

ゲームマスターがパネルを未取得に戻す。

サーバー処理:

1. roomIdの存在確認
2. panelNumber が 1〜25 であることを確認
3. 対象パネルの ownerPlayerId を null にする
4. 全プレイヤーの score を再計算する
5. 最新GameStateを配信する

### 20.7 reset_all_panels

すべてのパネルを未取得に戻す。

サーバー処理:

1. すべてのPanelの ownerPlayerId を null にする
2. 全プレイヤーの score を 0 にする
3. 最新GameStateを配信する

### 20.8 next_question

次の問題へ進む。

リセットするもの:

- currentQuestion
- buzzerEvents
- currentAnswerPlayerId
- correctPlayerId
- selectedPlayerIdForPanelOperation

残すもの:

- players
- panels
- score
- gameStatus

### 20.9 reset_game

ゲーム全体を初期化する。

リセットするもの:

- players
- panels
- currentQuestion
- selectedPlayerIdForPanelOperation
- panelOperationMode
- score
- gameStatus

roomIdは維持する。


