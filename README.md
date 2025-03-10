# Mantela Viewer &ndash; Telephone Network Mandala Viewer

**Mantela Viewer** は、**[Mantela](https://github.com/tkytel/mantela)** 記述された電話局同士のつながりを可視化します。

## URL パラメータについて

`first` の値として、電話網の起点となる mantela.json の URL を指定できます。
例えば、
`https://tkytel.github.io/mantela-viewer/?first=https://example.com/.well-known/mantela.json`
のようにすると、
自動的に `https://example.com/.well-known/mantela.json` を起点とした電話網を表示します。
