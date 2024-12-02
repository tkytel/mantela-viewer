'use strict';

const nodes = [];
const edges = [];

async function
main(first)
{
    if (!first)
        return;

    const queue = [ first ];
    const visited = [];
    while (queue.length > 0) {
        try {
            const cur = queue.shift();
            const k = await (await fetch(cur, { mode: 'cors' })).json();

            const me = {
                id: k.aboutMe.identifier,
                label: k.aboutMe.name,
            };
            if (!nodes.some(q => q.id === me.id)) {
                nodes.push(me);
            }

            if (visited.some(e => e === me.id))
                continue;
            visited.push(me.id);


            k.extensions.forEach(e => {
                const node = {
                    id: me.id + Math.random(),
                    label: e.name,
                    color: 'orange',
                };
                nodes.push(node);
                const edge = {
                    from: me.id,
                    to: node.id,
                    label: e.extension,
                };
                edges.push(edge);
            });
            k.providers.forEach(e => {
                if (!nodes.some(q => q.id === e.identifier)) {
                    const node = {
                        id: e.identifier,
                        label: e.name,
                    };
                    nodes.push(node);
                }
                const edge = {
                    from: me.id,
                    to: e.identifier,
                    label: e.prefix,
                };
                edges.push(edge);
                queue.push(e.mantela);
            });
        } catch (e) {
            console.error(e)
        }
    }

    const container = document.getElementById('mandala');
    const data = {
        nodes: nodes,
        edges: edges,
    };
    const options = {
        edges: {
            arrows: 'to',
        },
    };

    new vis.Network(container, data, options);
}

const q = (new URLSearchParams(document.location.search)).get('first');
if (q) {
    first.value = q;
    main(first.value);
}
