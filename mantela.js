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
 */
function
mantelas2Graph(mantelas, maxNest = Infinity, elemStatistic = undefined)
{
	/**
	 * 統計情報の更新（指定されていれば）
	 * @param { object }
	 */
	function updateStatistics(s) {
		if (!elemStatistic)
			return;

		const liMantela = document.createElement('li');
		liMantela.textContent = `Number of Mantelas: ${mantelas.size}`;
		const liPbx = document.createElement('li');
		liPbx.textContent = `Number of PBXs: ${s.pbxs}`;
		const liTerminals = document.createElement('li');
		liTerminals.textContent = `Number of terminals: ${s.terminals}`;
		const ul = document.createElement('ul');
		ul.append(liMantela, liPbx, liTerminals);

		const clone = elemStatistic.cloneNode(false);
		elemStatistic.parentElement.replaceChild(clone, elemStatistic);
		clone.append(ul);
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
	 * 統計情報
	 */
	const statistics = {
		pbxs: 0,
		terminals: 0,
	};

	/* 列挙されている局をあらかじめ登録する */
	mantelas.forEach(e => {
		nodes.set(e.mantela.aboutMe.identifier, {
			...e.mantela.aboutMe,
			id: e.mantela.aboutMe.identifier,
			names: [ e.mantela.aboutMe.name ],
			type: 'PBX',
		});
		statistics.pbxs++;
	});

	for (const e of mantelas.values()) {
		/* 深すぎたら相手にしない */
		if (e.depth > maxNest)
			break;

		/* mantela.json は取得済である */
		const mantela = e.mantela;

		/* 内線番号の登録 */
		const curNode = nodes.get(mantela.aboutMe.identifier);
		mantela.extensions.forEach((e, i) => {
			const randomId = 'randomUUID' in crypto &&
				crypto.randomUUID() ||
				(Math.random().toString() + Math.random().toString()).replaceAll(".", "-");
				// crypto.randomUUID() がない環境(e.g.: http)でrandomUUID()を呼ぶと
				// エラーで止まるので、Math.random()で強引に生成してお茶を濁す☕👩🏻‍🍳
			const nodeId = `${curNode.id} `
				+ `${e.identifier || randomId}`;
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
				statistics.terminals++;
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

		/* 深すぎたら接続局を見ない */
		if (e.depth >= maxNest)
			continue;

		mantela.providers.forEach(e => {
			const node = nodes.get(e.identifier);
			/* 既に知られている局の場合、呼び名を追加 */
			if (node) {
				node.names = [ ...new Set([ ...node.names, e.name ]) ];
			} else {
				/* 接続の unavailable をコピーしたくないため */
				const v = JSON.parse(JSON.stringify(e));
				delete v.unavailable;
				nodes.set(e.identifier, {
					...v,
					id: e.identifier,
					names: [ e.name ],
					type: 'PBX',
				});
				statistics.pbxs++;
			}
			/* 番号追加 */
			edges.push({
				from: curNode.id,
				to: e.identifier,
				label: e.prefix,
				unavailable: e.unavailable,
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


	/* 統計情報を表示する */
	updateStatistics(statistics);

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
		conference: './img/conference.svg',
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
				color: e.color,
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
		layout: {
			improvedLayout: false,
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

	const start = performance.now();
	outputStatus.textContent = 'Fetching Mantelas...';
	const limit = checkNest.checked ? +numNest.value : Infinity;
	const mantelas = await fetchMantelas2(urlMantela.value, limit);
	const end = performance.now();
	outputStatus.textContent = `Fetched ${mantelas.size} Mantelas (${end-start|0} ms)`;

	const graph = mantelas2Graph(mantelas, limit, divStatistic);
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
 * hops のパラメータが指定されているときは自動入力してチェックボックスに印を付ける
 */
const urlSearch = new URLSearchParams(document.location.search);
if (urlSearch.get('hops')) {
	numNest.value = urlSearch.get('hops');
	checkNest.checked = true;
}
/*
 * first のパラメータが指定されているときは自動入力して表示する
 */
if (urlSearch.get('first')) {
	urlMantela.value = urlSearch.get('first');
	btnGenerate.click();
}
