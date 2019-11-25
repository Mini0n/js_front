
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function is_promise(value) {
        return value && typeof value === 'object' && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment && $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = key && { [key]: value };
            const child_ctx = assign(assign({}, info.ctx), info.resolved);
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                info.blocks[i] = null;
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = { [info.value]: promise };
        }
    }

    const globals = (typeof window !== 'undefined' ? window : global);
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, changed, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(changed, child_ctx);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, props) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
            })
            : prop_values;
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/Loading.svelte generated by Svelte v3.14.1 */

    const file = "src/Loading.svelte";

    function create_fragment(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "loading...";
    			attr_dev(p, "class", "svelte-6rb0gc");
    			add_location(p, file, 12, 0, 167);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Loading extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Loading",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* src/ErrorLoading.svelte generated by Svelte v3.14.1 */

    const file$1 = "src/ErrorLoading.svelte";

    function create_fragment$1(ctx) {
    	let pre;

    	const block = {
    		c: function create() {
    			pre = element("pre");
    			pre.textContent = "ERROR Loading x_x";
    			attr_dev(pre, "class", "svelte-1tbvt26");
    			add_location(pre, file$1, 14, 2, 192);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, pre, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(pre);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class ErrorLoading extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ErrorLoading",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/Product.svelte generated by Svelte v3.14.1 */

    const file$2 = "src/Product.svelte";

    function create_fragment$2(ctx) {
    	let tr;
    	let td0;
    	let t0;
    	let t1;
    	let td1;
    	let t2;
    	let t3;
    	let td2;

    	let t4_value = (ctx.name.length > 20
    	? ctx.name.slice(0, 20) + "..."
    	: ctx.name) + "";

    	let t4;
    	let t5;
    	let td3;
    	let t6;
    	let t7;
    	let td4;
    	let t8;
    	let t9;
    	let td5;
    	let t10;
    	let dispose;

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			td0 = element("td");
    			t0 = text(ctx.asin);
    			t1 = space();
    			td1 = element("td");
    			t2 = text(ctx.category);
    			t3 = space();
    			td2 = element("td");
    			t4 = text(t4_value);
    			t5 = space();
    			td3 = element("td");
    			t6 = text(ctx.weight);
    			t7 = space();
    			td4 = element("td");
    			t8 = text(ctx.dimensions);
    			t9 = space();
    			td5 = element("td");
    			t10 = text(ctx.rank);
    			attr_dev(td0, "class", "asin svelte-8fglb1");
    			add_location(td0, file$2, 31, 2, 499);
    			attr_dev(td1, "class", "svelte-8fglb1");
    			add_location(td1, file$2, 32, 2, 530);
    			attr_dev(td2, "class", "svelte-8fglb1");
    			add_location(td2, file$2, 33, 2, 552);
    			attr_dev(td3, "class", "svelte-8fglb1");
    			add_location(td3, file$2, 34, 2, 614);
    			attr_dev(td4, "class", "svelte-8fglb1");
    			add_location(td4, file$2, 35, 2, 634);
    			attr_dev(td5, "class", "rank svelte-8fglb1");
    			add_location(td5, file$2, 36, 2, 658);
    			attr_dev(tr, "class", "svelte-8fglb1");
    			add_location(tr, file$2, 30, 0, 469);
    			dispose = listen_dev(tr, "click", ctx.handleClick, false, false, false);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, td0);
    			append_dev(td0, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td1);
    			append_dev(td1, t2);
    			append_dev(tr, t3);
    			append_dev(tr, td2);
    			append_dev(td2, t4);
    			append_dev(tr, t5);
    			append_dev(tr, td3);
    			append_dev(td3, t6);
    			append_dev(tr, t7);
    			append_dev(tr, td4);
    			append_dev(td4, t8);
    			append_dev(tr, t9);
    			append_dev(tr, td5);
    			append_dev(td5, t10);
    		},
    		p: function update(changed, ctx) {
    			if (changed.asin) set_data_dev(t0, ctx.asin);
    			if (changed.category) set_data_dev(t2, ctx.category);

    			if (changed.name && t4_value !== (t4_value = (ctx.name.length > 20
    			? ctx.name.slice(0, 20) + "..."
    			: ctx.name) + "")) set_data_dev(t4, t4_value);

    			if (changed.weight) set_data_dev(t6, ctx.weight);
    			if (changed.dimensions) set_data_dev(t8, ctx.dimensions);
    			if (changed.rank) set_data_dev(t10, ctx.rank);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { asin = 2818281 } = $$props;
    	let { name = "ola k ase" } = $$props;
    	let { category = "product" } = $$props;
    	let { rank = "2.5" } = $$props;
    	let { weight = "43 lb" } = $$props;
    	let { dimensions = "1 x 2 x 3 inch" } = $$props;
    	let count = 0;

    	function handleClick() {
    		count += 1;
    	}

    	const writable_props = ["asin", "name", "category", "rank", "weight", "dimensions"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Product> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("asin" in $$props) $$invalidate("asin", asin = $$props.asin);
    		if ("name" in $$props) $$invalidate("name", name = $$props.name);
    		if ("category" in $$props) $$invalidate("category", category = $$props.category);
    		if ("rank" in $$props) $$invalidate("rank", rank = $$props.rank);
    		if ("weight" in $$props) $$invalidate("weight", weight = $$props.weight);
    		if ("dimensions" in $$props) $$invalidate("dimensions", dimensions = $$props.dimensions);
    	};

    	$$self.$capture_state = () => {
    		return {
    			asin,
    			name,
    			category,
    			rank,
    			weight,
    			dimensions,
    			count
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("asin" in $$props) $$invalidate("asin", asin = $$props.asin);
    		if ("name" in $$props) $$invalidate("name", name = $$props.name);
    		if ("category" in $$props) $$invalidate("category", category = $$props.category);
    		if ("rank" in $$props) $$invalidate("rank", rank = $$props.rank);
    		if ("weight" in $$props) $$invalidate("weight", weight = $$props.weight);
    		if ("dimensions" in $$props) $$invalidate("dimensions", dimensions = $$props.dimensions);
    		if ("count" in $$props) count = $$props.count;
    	};

    	return {
    		asin,
    		name,
    		category,
    		rank,
    		weight,
    		dimensions,
    		handleClick
    	};
    }

    class Product extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance, create_fragment$2, safe_not_equal, {
    			asin: 0,
    			name: 0,
    			category: 0,
    			rank: 0,
    			weight: 0,
    			dimensions: 0
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Product",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get asin() {
    		throw new Error("<Product>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set asin(value) {
    		throw new Error("<Product>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<Product>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Product>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get category() {
    		throw new Error("<Product>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set category(value) {
    		throw new Error("<Product>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get rank() {
    		throw new Error("<Product>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set rank(value) {
    		throw new Error("<Product>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get weight() {
    		throw new Error("<Product>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set weight(value) {
    		throw new Error("<Product>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get dimensions() {
    		throw new Error("<Product>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set dimensions(value) {
    		throw new Error("<Product>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src/SearchBar.svelte generated by Svelte v3.14.1 */
    const file$3 = "src/SearchBar.svelte";

    function create_fragment$3(ctx) {
    	let div2;
    	let div0;
    	let input;
    	let t0;
    	let div1;
    	let button0;
    	let t2;
    	let button1;
    	let dispose;

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			input = element("input");
    			t0 = space();
    			div1 = element("div");
    			button0 = element("button");
    			button0.textContent = "Add Product by ASIN";
    			t2 = space();
    			button1 = element("button");
    			button1.textContent = "Reload Products";
    			attr_dev(input, "type", "text");
    			attr_dev(input, "placeholder", "ASIN");
    			attr_dev(input, "class", "svelte-1o6n93f");
    			add_location(input, file$3, 44, 4, 720);
    			attr_dev(div0, "class", "search-input svelte-1o6n93f");
    			add_location(div0, file$3, 43, 2, 689);
    			add_location(button0, file$3, 47, 3, 821);
    			add_location(button1, file$3, 50, 2, 888);
    			attr_dev(div1, "class", "buttons svelte-1o6n93f");
    			add_location(div1, file$3, 46, 2, 796);
    			attr_dev(div2, "class", "search-div svelte-1o6n93f");
    			add_location(div2, file$3, 42, 0, 662);

    			dispose = [
    				listen_dev(input, "input", ctx.input_input_handler),
    				listen_dev(button0, "click", ctx.searchClick, false, false, false),
    				listen_dev(button1, "click", ctx.reloadProducts, false, false, false)
    			];
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, input);
    			set_input_value(input, ctx.searchString);
    			append_dev(div2, t0);
    			append_dev(div2, div1);
    			append_dev(div1, button0);
    			append_dev(div1, t2);
    			append_dev(div1, button1);
    		},
    		p: function update(changed, ctx) {
    			if (changed.searchString && input.value !== ctx.searchString) {
    				set_input_value(input, ctx.searchString);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	const dispatch = createEventDispatcher();
    	let searchString = "";

    	function searchClick() {
    		dispatch("message", { action: "search", searchString });
    	}

    	function reloadProducts() {
    		dispatch("message", { action: "reload" });
    	}

    	function input_input_handler() {
    		searchString = this.value;
    		$$invalidate("searchString", searchString);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("searchString" in $$props) $$invalidate("searchString", searchString = $$props.searchString);
    	};

    	return {
    		searchString,
    		searchClick,
    		reloadProducts,
    		input_input_handler
    	};
    }

    class SearchBar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SearchBar",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.14.1 */

    const { Error: Error_1 } = globals;
    const file$4 = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.prod = list[i];
    	return child_ctx;
    }

    // (85:1) {:catch error}
    function create_catch_block(ctx) {
    	let current;
    	const errorloading = new ErrorLoading({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(errorloading.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(errorloading, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(errorloading.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(errorloading.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(errorloading, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(85:1) {:catch error}",
    		ctx
    	});

    	return block;
    }

    // (70:1) {:then value}
    function create_then_block(ctx) {
    	let t0;
    	let table;
    	let tbody;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let t1;
    	let p;
    	let t2_value = ctx.value + "";
    	let t2;
    	let t3;
    	let t4_value = (ctx.value === 1 ? "product" : "products") + "";
    	let t4;
    	let t5;
    	let current;
    	const searchbar = new SearchBar({ $$inline: true });
    	searchbar.$on("message", ctx.handleMessage);
    	let each_value = ctx.products;
    	const get_key = ctx => ctx.prod.id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			create_component(searchbar.$$.fragment);
    			t0 = space();
    			table = element("table");
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t1 = space();
    			p = element("p");
    			t2 = text(t2_value);
    			t3 = space();
    			t4 = text(t4_value);
    			t5 = text(" loaded");
    			add_location(tbody, file$4, 75, 3, 1446);
    			attr_dev(table, "class", "svelte-1y0jqd5");
    			add_location(table, file$4, 74, 2, 1435);
    			add_location(p, file$4, 83, 2, 1685);
    		},
    		m: function mount(target, anchor) {
    			mount_component(searchbar, target, anchor);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, table, anchor);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(tbody, null);
    			}

    			insert_dev(target, t1, anchor);
    			insert_dev(target, p, anchor);
    			append_dev(p, t2);
    			append_dev(p, t3);
    			append_dev(p, t4);
    			append_dev(p, t5);
    			current = true;
    		},
    		p: function update(changed, ctx) {
    			const each_value = ctx.products;
    			group_outros();
    			each_blocks = update_keyed_each(each_blocks, changed, get_key, 1, ctx, each_value, each_1_lookup, tbody, outro_and_destroy_block, create_each_block, null, get_each_context);
    			check_outros();
    			if ((!current || changed.promise_products) && t2_value !== (t2_value = ctx.value + "")) set_data_dev(t2, t2_value);
    			if ((!current || changed.promise_products) && t4_value !== (t4_value = (ctx.value === 1 ? "product" : "products") + "")) set_data_dev(t4, t4_value);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(searchbar.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(searchbar.$$.fragment, local);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(searchbar, detaching);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(table);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}

    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(70:1) {:then value}",
    		ctx
    	});

    	return block;
    }

    // (77:4) {#each products as prod (prod.id)}
    function create_each_block(key_1, ctx) {
    	let first;
    	let current;

    	const product = new Product({
    			props: {
    				asin: ctx.prod.asin,
    				name: ctx.prod.name,
    				category: ctx.prod.category,
    				rank: ctx.prod.rank,
    				weight: ctx.prod.weight,
    				dimensions: ctx.prod.dimensions
    			},
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			first = empty();
    			create_component(product.$$.fragment);
    			this.first = first;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(product, target, anchor);
    			current = true;
    		},
    		p: function update(changed, ctx) {
    			const product_changes = {};
    			if (changed.products) product_changes.asin = ctx.prod.asin;
    			if (changed.products) product_changes.name = ctx.prod.name;
    			if (changed.products) product_changes.category = ctx.prod.category;
    			if (changed.products) product_changes.rank = ctx.prod.rank;
    			if (changed.products) product_changes.weight = ctx.prod.weight;
    			if (changed.products) product_changes.dimensions = ctx.prod.dimensions;
    			product.$set(product_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(product.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(product.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(first);
    			destroy_component(product, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(77:4) {#each products as prod (prod.id)}",
    		ctx
    	});

    	return block;
    }

    // (68:26)    <Loading/>  {:then value}
    function create_pending_block(ctx) {
    	let current;
    	const loading = new Loading({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(loading.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(loading, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(loading.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(loading.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(loading, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(68:26)    <Loading/>  {:then value}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let main;
    	let h1;
    	let pre;
    	let t1;
    	let promise;
    	let current;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block,
    		value: "value",
    		error: "error",
    		blocks: [,,,]
    	};

    	handle_promise(promise = ctx.promise_products, info);

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			pre = element("pre");
    			pre.textContent = "Products";
    			t1 = space();
    			info.block.c();
    			add_location(pre, file$4, 63, 5, 1303);
    			attr_dev(h1, "class", "svelte-1y0jqd5");
    			add_location(h1, file$4, 63, 1, 1299);
    			attr_dev(main, "class", "svelte-1y0jqd5");
    			add_location(main, file$4, 61, 0, 1290);
    		},
    		l: function claim(nodes) {
    			throw new Error_1("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(h1, pre);
    			append_dev(main, t1);
    			info.block.m(main, info.anchor = null);
    			info.mount = () => main;
    			info.anchor = null;
    			current = true;
    		},
    		p: function update(changed, new_ctx) {
    			ctx = new_ctx;
    			info.ctx = ctx;

    			if (changed.promise_products && promise !== (promise = ctx.promise_products) && handle_promise(promise, info)) ; else {
    				info.block.p(changed, assign(assign({}, ctx), info.resolved)); // nothing
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(info.block);
    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < 3; i += 1) {
    				const block = info.blocks[i];
    				transition_out(block);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			info.block.d();
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const products_api = "https://js-amazon-test.herokuapp.com/products/";

    function instance$2($$self, $$props, $$invalidate) {
    	let products = [];
    	let promise_products = getProducts();

    	async function searchProduct(ASIN) {
    		const res = await fetch(products_api + ASIN);
    		const txt = await res.json();

    		if (res.ok) {
    			promiseClick();
    		} else {
    			throw new Error(txt);
    		}
    	}

    	async function getProducts() {
    		const res = await fetch(products_api);
    		const txt = await res.json();

    		if (res.ok) {
    			$$invalidate("products", products = txt.products);
    			return txt.products.length;
    		} else {
    			throw new Error(txt);
    		}
    	}

    	function promiseClick() {
    		console.log("loading products...");
    		$$invalidate("promise_products", promise_products = getProducts());
    	}

    	function searchClick(searchString) {
    		console.log("search: " + searchString);
    		searchProduct(searchString);
    	}

    	function handleMessage(event) {
    		switch (event.detail.action) {
    			case "reload":
    				promiseClick();
    				break;
    			case "search":
    				searchClick(event.detail.searchString);
    				break;
    		}
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("products" in $$props) $$invalidate("products", products = $$props.products);
    		if ("promise_products" in $$props) $$invalidate("promise_products", promise_products = $$props.promise_products);
    	};

    	return {
    		products,
    		promise_products,
    		handleMessage
    	};
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
