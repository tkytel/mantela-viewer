'use strict';

/**
 * ノード
 * @typedef { object } Node
 * @property { string } id - 識別子
 * @property { string[] } names - 名前
 * @property { string } type - 種別
 */

/**
 * エッヂ
 * @typedef { object } Edge
 * @property { string } from - 対応する Node の id
 * @property { string } to - 対応する Node の id
 * @property { string } label - 表示するラベル
 */

/**
 * グラフ
 * @typedef { object } Graph
 * @property { Node[] } nodes - Node の列
 * @property { Edge[] } edges - Edge の列
 */

/**
 * mantela.json からグラフを生成する
 * @param { string } firstMantela - 起点の mantela.json の URL
 * @param { number } maxNest - 探索する交換局のホップ数
 * @param { HTMLElement } elemStat - ステータス表示用の HTML 要素
 */
async function
generageGraph(firstMantela, maxNest = Infinity, elemStat = undefined)
{

	/* 実行時間を計測するために、開始タイムスタンプを保持する */
	const executeStartedTime = performance.now();

	/**
	 * ステータスの更新（指定されていれば）
	 * @param { string } mesg - 表示するメッセージ
	 */
	function updateStatus(mesg) {
		if (elemStat && 'textContent' in elemStat)
			elemStat.textContent = mesg;
	}

	/**
	 * ノードの集合体
	 * @type { Map<string, Node }
	 */
	const nodes = new Map();

	/**
	 * エッヂの集合体
	 * @type { Edge[] }
	 */
	const edges = [];

	/**
	 * 探索キュー
	 * @var { object[] }
	 * @property { string } url - mantela.json の URL
	 * @property { number } nest - 階層の深さ
	 */
	const queue = [ { url: firstMantela, nest: 0 } ];

	/**
	 * 訪問済 URL, ID
	 * @var { Set<string> }
	 */
	const visited = new Set();

	while (queue.length > 0) {
		const current = queue.shift();

		/* 訪問済 URL や最大深さより深過ぎる場合は辿らない */
		if (visited.has(current.url) || current.nest > maxNest)
			continue;

		/* mantela.json を取得する */
		updateStatus(current.url);
		const mantela = await fetch(current.url, { mode: 'cors' })
				.then(res => res.json())
				.catch(err => new Error(err));
		if (mantela instanceof Error) {
			console.error(mantela, current.url);
			updateStatus(mantela + current.url);
			continue;
		}
		visited.add(current.url);

		/* 自分の情報を登録する */
		if ('aboutMe' in mantela) {
			const aboutMe = mantela.aboutMe;
			const me = nodes.get(aboutMe.identifier);
			/* 既に知られている局の場合、呼び名を追加 */
			if (me) {
				me.names = [ ...new Set([ ...me.names, aboutMe.name ]) ];
				Object.assign(me, aboutMe);
			} else {
				nodes.set(aboutMe.identifier, {
					...aboutMe,
					id: aboutMe.identifier,
					names: [ aboutMe.name ],
					type: 'PBX',
				});
			}
		} else {
			/* 自分の情報すら名乗れない局の情報は登録できない */
			continue;
		}

		/* 訪問済 ID の場合はここでおしまい */
		const curNode = nodes.get(mantela.aboutMe.identifier);
		if (visited.has(curNode.id))
			continue;
		visited.add(curNode.id);

		/* 内線番号を登録する */
		if ('extensions' in mantela)
			mantela.extensions.forEach((e, i) => {
				const nodeId = `${curNode.id} `
						+ `${e.identifier || crypto.randomUUID()}`;
				const node = nodes.get(nodeId);
				const unavailable = curNode.unavailable || undefined;
				/* 既に知られている内線の場合、呼び名を追加 */
				if (node)
					node.names = [ ...new Set([ ...node.names, e.name ]) ];
				else {
					nodes.set(nodeId, {
						...e,
						unavailable,
						id: nodeId,
						names: [ e.name ],
						name: `${curNode.names[0]} ${e.name}`,
					});
				}
				/* 番号追加 */
				edges.push({
					unavailable,
					from: curNode.id,
					to: nodeId,
					label: e.extension,
					color: '#E87A90',
				});
				if (e.transferTo) {
					e.transferTo.forEach(k => {
						const toId = !!~k.indexOf(' ')
								? k : `${curNode.id} ${k}`;
						edges.push({
							unavailable,
							from: nodeId,
							to: toId,
						});
					});
				}
			});

		/* 接続局を登録する（接続数を考慮する） */
		if ('providers' in mantela && current.nest < maxNest)
			mantela.providers.forEach(e => {
				const node = nodes.get(e.identifier);
				/* 既に知られている局の場合、呼び名を追加 */
				if (node)
					node.names = [ ...new Set([ ...node.names, e.name ]) ];
				else
					nodes.set(e.identifier, {
						...e,
						id: e.identifier,
						names: [ e.name ],
						type: 'PBX',
					});
				/* 番号追加 */
				edges.push({
					from: curNode.id,
					to: e.identifier,
					label: e.prefix,
				});
				/* キュー追加 */
				if (e.mantela)
					queue.push({
						url: e.mantela,
						nest: current.nest + 1,
					});
			});
	}

	/**
	 * 最終的に返却するグラフ構造
	 * @type { Graph }
	 */
	const graph = {
		nodes: Array.from(nodes.values()),
		edges: edges,
	};

	/* 実行時間を計算し、ステータスに結果を反映する */
	const executeCompletedTime = performance.now();
	const executeLength = executeCompletedTime - executeStartedTime;

	updateStatus(`Done. Execution Time: ${executeLength} [ms]`);

	return graph;
}

/**
 * VoIP 網の接続情報を表示する
 * @param { HTMLElement } container - 可視化結果を格納する要素
 * @param { Graph } graph - 接続情報
 */
function
graph2vis(container, graph)
{
	const imgtab = {
		alias: './img/alias.svg',
		application: './img/application.svg',
		cellphone: './img/cellphone.svg',
		dialphone: './img/dialphone.svg',
		fax: './img/fax.svg',
		information: './img/information.svg',
		main: './img/main.svg',
		modem: './img/modem.svg',
		music: './img/music.svg',
		other: './img/other.svg',
		phone: './img/phone.svg',
		pushphone: './img/pushphone.svg',
		reserved: './img/reserved.svg',
		smartphone: './img/smartphone.svg',
		switchboard: './img/switchboard.svg',
		unknown: './img/unknown.svg',
		unused: './img/unused.svg',
	};
	const nodes = graph.nodes.map(e => ({
		id: e.id,
		label: e.names[0],
		color: e.type !== 'PBX' && 'orange',
		shape: e.type === 'PBX' ? 'circle' : 'image',
		image: imgtab[e.type] || imgtab['unknown'],
		opacity: e.unavailable ? 0.3 : 1,
	}));
	const edges = graph.edges.map(e => {
		// FIXME: find() のせいでかなり遅くなる
		const from = graph.nodes.find(v => v.id === e.from);
		const to = graph.nodes.find(v => v.id === e.to);
		const unavailable = e.unavailable || from?.unavailable || to?.unavailable;
		return {
			...e,
			color: {
				opacity: unavailable ? 0.3: 1,
			},
		};
	});

	const data = {
		nodes,
		edges,
	};
	const options = {
		edges: {
			arrows: 'to',
		},
		physics: {
			solver: 'forceAtlas2Based',
		},
	};

	return new vis.Network(container, data, options);
}

/*
 * ノードの情報を表示する
 */
const showNodeInfo = node => new Promise(r => {
	const dialog = document.createElement('dialog');
	dialog.addEventListener('close', _ => {
		dialog.parentNode.removeChild(dialog);
		r(dialog.returnValue);
	});
	document.body.append(dialog);

	const button = document.createElement('button');
	button.textContent = 'OK';
	button.addEventListener('click', _ => dialog.close(true));
	const div = document.createElement('div');
	div.style.textAlign = 'end';
	div.append(button);

	const code = document.createElement('code');
	code.textContent = JSON.stringify(node, null, 4);
	const pre = document.createElement('pre');
	pre.style.maxWidth = '80vw';
	pre.style.maxHeight = '80vh';
	pre.overflow = 'scroll';
	pre.append(code);

	dialog.append(pre, div);
	dialog.showModal();
});

/*
 * フォーム送信時のイベントハンドラ
 * mantela.json を取得し、接続情報を解析し、表示する。
 */
formMantela.addEventListener('submit', async e => {
	e.preventDefault();
	btnGenerate.disabled = true;
	const limit = checkNest.checked ? +numNest.value : Infinity;
	const graph = await generageGraph(urlMantela.value, limit, outputStatus);
	const network = graph2vis(divMantela, graph);
	network.on('doubleClick', async e => {
		if (e.nodes.length > 0) {
			const node = graph.nodes.find(v => v.id === e.nodes[0]);
			await showNodeInfo(node);
		}
	});
	secMandala.scrollIntoView({
		behavior: 'smooth',
		block: 'start',
	});
	btnGenerate.disabled = false;
});

/*
 * 表示結果を大きく表示するためのハック
 */
const autoFit = new ResizeObserver(entries => {
	entries.forEach(e => {
		e.target.style.left = null;
		const { x } = e.target.getBoundingClientRect();
		e.target.style.left = `-${x}px`;
	});
});
autoFit.observe(divMantela);

/*
 * first のパラメータが指定されているときは自動入力して表示する
 */
const urlSearch = new URLSearchParams(document.location.search);
if (urlSearch.get('first')) {
	urlMantela.value = urlSearch.get('first');
	btnGenerate.click();
}
