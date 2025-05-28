# Mantela Viewer &ndash; Telephone Network Mandala Viewer

**Mantela Viewer** は、**[Mantela](https://github.com/tkytel/mantela)** 記述された電話局同士のつながりを可視化します。

## URL パラメータについて

`first` の値として、電話網の起点となる mantela.json の URL を指定できます。
例えば、
`https://tkytel.github.io/mantela-viewer/?first=https://example.com/.well-known/mantela.json`
のようにすると、
自動的に `https://example.com/.well-known/mantela.json` を起点とした電話網を表示します。

`hops` を指定すると起点URLから見たホップ数で表示範囲を制限できます。
例えば、
`https://tkytel.github.io/mantela-viewer/?first=https://example.com/.well-known/mantela.json&hops=2`
のようにすると、
自動的に `https://example.com/.well-known/mantela.json` を起点とした2ホップ以内の電話網を表示します。

## 詳細情報を表示するには

曼荼羅表示画面において、局や端末をダブルクリックすると、その詳細情報が表示されます。

