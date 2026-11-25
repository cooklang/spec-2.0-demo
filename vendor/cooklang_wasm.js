let wasm_bindgen = (function(exports) {
    let script_src;
    if (typeof document !== 'undefined' && document.currentScript !== null) {
        script_src = new URL(document.currentScript.src, location.href).toString();
    }

    class FallibleResult {
        static __wrap(ptr) {
            const obj = Object.create(FallibleResult.prototype);
            obj.__wbg_ptr = ptr;
            FallibleResultFinalization.register(obj, obj.__wbg_ptr, obj);
            return obj;
        }
        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            FallibleResultFinalization.unregister(this);
            return ptr;
        }
        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_fallibleresult_free(ptr, 0);
        }
        /**
         * @returns {string}
         */
        get error() {
            let deferred1_0;
            let deferred1_1;
            try {
                const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
                wasm.__wbg_get_fallibleresult_error(retptr, this.__wbg_ptr);
                var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
                var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
                deferred1_0 = r0;
                deferred1_1 = r1;
                return getStringFromWasm0(r0, r1);
            } finally {
                wasm.__wbindgen_add_to_stack_pointer(16);
                wasm.__wbindgen_export4(deferred1_0, deferred1_1, 1);
            }
        }
        /**
         * @returns {string}
         */
        get value() {
            let deferred1_0;
            let deferred1_1;
            try {
                const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
                wasm.__wbg_get_fallibleresult_value(retptr, this.__wbg_ptr);
                var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
                var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
                deferred1_0 = r0;
                deferred1_1 = r1;
                return getStringFromWasm0(r0, r1);
            } finally {
                wasm.__wbindgen_add_to_stack_pointer(16);
                wasm.__wbindgen_export4(deferred1_0, deferred1_1, 1);
            }
        }
        /**
         * @param {string} arg0
         */
        set error(arg0) {
            const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            wasm.__wbg_set_fallibleresult_error(this.__wbg_ptr, ptr0, len0);
        }
        /**
         * @param {string} arg0
         */
        set value(arg0) {
            const ptr0 = passStringToWasm0(arg0, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            wasm.__wbg_set_fallibleresult_value(this.__wbg_ptr, ptr0, len0);
        }
    }
    if (Symbol.dispose) FallibleResult.prototype[Symbol.dispose] = FallibleResult.prototype.free;
    exports.FallibleResult = FallibleResult;

    class Parser {
        __destroy_into_raw() {
            const ptr = this.__wbg_ptr;
            this.__wbg_ptr = 0;
            ParserFinalization.unregister(this);
            return ptr;
        }
        free() {
            const ptr = this.__destroy_into_raw();
            wasm.__wbg_parser_free(ptr, 0);
        }
        /**
         * @returns {number}
         */
        get extensions() {
            const ret = wasm.parser_extensions(this.__wbg_ptr);
            return ret >>> 0;
        }
        /**
         * returns vector of indices in r.recipe.cookware and their quantities
         * @param {ScaledRecipeWithReport} r
         * @returns {GroupedIndexAndQuantity[]}
         */
        group_cookware(r) {
            try {
                const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
                wasm.parser_group_cookware(retptr, this.__wbg_ptr, addBorrowedObject(r));
                var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
                var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
                var v1 = getArrayJsValueFromWasm0(r0, r1);
                wasm.__wbindgen_export4(r0, r1 * 4, 4);
                return v1;
            } finally {
                wasm.__wbindgen_add_to_stack_pointer(16);
                heap[stack_pointer++] = undefined;
            }
        }
        /**
         * returns vector of indices in r.recipe.ingredients and their quantities
         * @param {ScaledRecipeWithReport} r
         * @returns {GroupedIndexAndQuantity[]}
         */
        group_ingredients(r) {
            try {
                const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
                wasm.parser_group_ingredients(retptr, this.__wbg_ptr, addBorrowedObject(r));
                var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
                var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
                var v1 = getArrayJsValueFromWasm0(r0, r1);
                wasm.__wbindgen_export4(r0, r1 * 4, 4);
                return v1;
            } finally {
                wasm.__wbindgen_add_to_stack_pointer(16);
                heap[stack_pointer++] = undefined;
            }
        }
        /**
         * @returns {boolean}
         */
        get load_units() {
            const ret = wasm.parser_load_units(this.__wbg_ptr);
            return ret !== 0;
        }
        constructor() {
            const ret = wasm.parser_new();
            this.__wbg_ptr = ret;
            ParserFinalization.register(this, this.__wbg_ptr, this);
            return this;
        }
        /**
         * @param {string} input
         * @param {number | null} [scale]
         * @returns {ScaledRecipeWithReport}
         */
        parse(input, scale) {
            const ptr0 = passStringToWasm0(input, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.parser_parse(this.__wbg_ptr, ptr0, len0, !isLikeNone(scale), isLikeNone(scale) ? 0 : scale);
            return takeObject(ret);
        }
        /**
         * @param {string} input
         * @param {boolean} json
         * @returns {FallibleResult}
         */
        parse_ast(input, json) {
            const ptr0 = passStringToWasm0(input, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.parser_parse_ast(this.__wbg_ptr, ptr0, len0, json);
            return FallibleResult.__wrap(ret);
        }
        /**
         * @param {string} input
         * @returns {string}
         */
        parse_events(input) {
            let deferred2_0;
            let deferred2_1;
            try {
                const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
                const ptr0 = passStringToWasm0(input, wasm.__wbindgen_export, wasm.__wbindgen_export2);
                const len0 = WASM_VECTOR_LEN;
                wasm.parser_parse_events(retptr, this.__wbg_ptr, ptr0, len0);
                var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
                var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
                deferred2_0 = r0;
                deferred2_1 = r1;
                return getStringFromWasm0(r0, r1);
            } finally {
                wasm.__wbindgen_add_to_stack_pointer(16);
                wasm.__wbindgen_export4(deferred2_0, deferred2_1, 1);
            }
        }
        /**
         * @param {string} input
         * @param {boolean} json
         * @returns {FallibleResult}
         */
        parse_full(input, json) {
            const ptr0 = passStringToWasm0(input, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.parser_parse_full(this.__wbg_ptr, ptr0, len0, json);
            return FallibleResult.__wrap(ret);
        }
        /**
         * @param {string} input
         * @param {number | null} [scale]
         * @returns {FallibleResult}
         */
        parse_render(input, scale) {
            const ptr0 = passStringToWasm0(input, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.parser_parse_render(this.__wbg_ptr, ptr0, len0, !isLikeNone(scale), isLikeNone(scale) ? 0 : scale);
            return FallibleResult.__wrap(ret);
        }
        /**
         * Parses with the spec 2.0 drafts and returns, as JSON,
         * `{ recipe, graph, diagnostics }`: the recipe model, its graph on the
         * path `selection` picks (`{"choices": {...}, "toggles": {...}}`, or
         * empty for the defaults), and the parser's errors and warnings as
         * `{ level, message }`. The recipe is `null` when the parser gave up.
         * @param {string} input
         * @param {string} selection
         * @returns {string}
         */
        parse_spec2(input, selection) {
            let deferred3_0;
            let deferred3_1;
            try {
                const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
                const ptr0 = passStringToWasm0(input, wasm.__wbindgen_export, wasm.__wbindgen_export2);
                const len0 = WASM_VECTOR_LEN;
                const ptr1 = passStringToWasm0(selection, wasm.__wbindgen_export, wasm.__wbindgen_export2);
                const len1 = WASM_VECTOR_LEN;
                wasm.parser_parse_spec2(retptr, this.__wbg_ptr, ptr0, len0, ptr1, len1);
                var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
                var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
                deferred3_0 = r0;
                deferred3_1 = r1;
                return getStringFromWasm0(r0, r1);
            } finally {
                wasm.__wbindgen_add_to_stack_pointer(16);
                wasm.__wbindgen_export4(deferred3_0, deferred3_1, 1);
            }
        }
        /**
         * @param {number} bits
         */
        set extensions(bits) {
            wasm.parser_set_extensions(this.__wbg_ptr, bits);
        }
        /**
         * @param {boolean} load
         */
        set load_units(load) {
            wasm.parser_set_load_units(this.__wbg_ptr, load);
        }
        /**
         * @param {string} input
         * @returns {FallibleResult}
         */
        std_metadata(input) {
            const ptr0 = passStringToWasm0(input, wasm.__wbindgen_export, wasm.__wbindgen_export2);
            const len0 = WASM_VECTOR_LEN;
            const ret = wasm.parser_std_metadata(this.__wbg_ptr, ptr0, len0);
            return FallibleResult.__wrap(ret);
        }
    }
    if (Symbol.dispose) Parser.prototype[Symbol.dispose] = Parser.prototype.free;
    exports.Parser = Parser;

    /**
     * @param {Cookware} _this
     * @returns {string}
     */
    function cookware_display_name(_this) {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.cookware_display_name(retptr, addBorrowedObject(_this));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
            wasm.__wbindgen_export4(deferred1_0, deferred1_1, 1);
        }
    }
    exports.cookware_display_name = cookware_display_name;

    /**
     * Whether the cookware item is marked optional (`#?name`)
     * @param {Cookware} _this
     * @returns {boolean}
     */
    function cookware_is_optional(_this) {
        try {
            const ret = wasm.cookware_is_optional(addBorrowedObject(_this));
            return ret !== 0;
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
    exports.cookware_is_optional = cookware_is_optional;

    /**
     * @param {Cookware} _this
     * @returns {boolean}
     */
    function cookware_should_be_listed(_this) {
        try {
            const ret = wasm.cookware_should_be_listed(addBorrowedObject(_this));
            return ret !== 0;
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
    exports.cookware_should_be_listed = cookware_should_be_listed;

    /**
     * @param {GroupedQuantity} _this
     * @returns {string}
     */
    function grouped_quantity_display(_this) {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.grouped_quantity_display(retptr, addBorrowedObject(_this));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
            wasm.__wbindgen_export4(deferred1_0, deferred1_1, 1);
        }
    }
    exports.grouped_quantity_display = grouped_quantity_display;

    /**
     * @param {GroupedQuantity} _this
     * @returns {boolean}
     */
    function grouped_quantity_is_empty(_this) {
        try {
            const ret = wasm.grouped_quantity_is_empty(addBorrowedObject(_this));
            return ret !== 0;
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
    exports.grouped_quantity_is_empty = grouped_quantity_is_empty;

    /**
     * @param {Ingredient} _this
     * @returns {string}
     */
    function ingredient_display_name(_this) {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.ingredient_display_name(retptr, addBorrowedObject(_this));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
            wasm.__wbindgen_export4(deferred1_0, deferred1_1, 1);
        }
    }
    exports.ingredient_display_name = ingredient_display_name;

    /**
     * Whether the ingredient is marked optional (`@?name`)
     * @param {Ingredient} _this
     * @returns {boolean}
     */
    function ingredient_is_optional(_this) {
        try {
            const ret = wasm.ingredient_is_optional(addBorrowedObject(_this));
            return ret !== 0;
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
    exports.ingredient_is_optional = ingredient_is_optional;

    /**
     * @param {Ingredient} _this
     * @returns {boolean}
     */
    function ingredient_should_be_listed(_this) {
        try {
            const ret = wasm.ingredient_should_be_listed(addBorrowedObject(_this));
            return ret !== 0;
        } finally {
            heap[stack_pointer++] = undefined;
        }
    }
    exports.ingredient_should_be_listed = ingredient_should_be_listed;

    /**
     * @param {Quantity} _this
     * @returns {string}
     */
    function quantity_display(_this) {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.quantity_display(retptr, addBorrowedObject(_this));
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            heap[stack_pointer++] = undefined;
            wasm.__wbindgen_export4(deferred1_0, deferred1_1, 1);
        }
    }
    exports.quantity_display = quantity_display;

    /**
     * @returns {string}
     */
    function version() {
        let deferred1_0;
        let deferred1_1;
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            wasm.version(retptr);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            deferred1_0 = r0;
            deferred1_1 = r1;
            return getStringFromWasm0(r0, r1);
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
            wasm.__wbindgen_export4(deferred1_0, deferred1_1, 1);
        }
    }
    exports.version = version;
    function __wbg_get_imports() {
        const import0 = {
            __proto__: null,
            __wbg___wbindgen_is_undefined_8865fb403f8fe9d8: function(arg0) {
                const ret = getObject(arg0) === undefined;
                return ret;
            },
            __wbg___wbindgen_string_get_0380ccaa2f57f0d9: function(arg0, arg1) {
                const obj = getObject(arg1);
                const ret = typeof(obj) === 'string' ? obj : undefined;
                var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_export, wasm.__wbindgen_export2);
                var len1 = WASM_VECTOR_LEN;
                getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
                getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
            },
            __wbg___wbindgen_throw_41e9ee4f547fc59a: function(arg0, arg1) {
                throw new Error(getStringFromWasm0(arg0, arg1));
            },
            __wbg_parse_0fc53dead14b3b42: function() { return handleError(function (arg0, arg1) {
                const ret = JSON.parse(getStringFromWasm0(arg0, arg1));
                return addHeapObject(ret);
            }, arguments); },
            __wbg_stringify_52ff602c1cc4fbb6: function() { return handleError(function (arg0) {
                const ret = JSON.stringify(getObject(arg0));
                return addHeapObject(ret);
            }, arguments); },
            __wbindgen_object_clone_ref: function(arg0) {
                const ret = getObject(arg0);
                return addHeapObject(ret);
            },
            __wbindgen_object_drop_ref: function(arg0) {
                takeObject(arg0);
            },
        };
        return {
            __proto__: null,
            "./cooklang_wasm_bg.js": import0,
        };
    }

    const FallibleResultFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_fallibleresult_free(ptr, 1));
    const ParserFinalization = (typeof FinalizationRegistry === 'undefined')
        ? { register: () => {}, unregister: () => {} }
        : new FinalizationRegistry(ptr => wasm.__wbg_parser_free(ptr, 1));

    function addHeapObject(obj) {
        if (heap_next === heap.length) heap.push(heap.length + 1);
        const idx = heap_next;
        heap_next = heap[idx];

        heap[idx] = obj;
        return idx;
    }

    function addBorrowedObject(obj) {
        if (stack_pointer == 1) throw new Error('out of js stack');
        heap[--stack_pointer] = obj;
        return stack_pointer;
    }

    function dropObject(idx) {
        if (idx < 1028) return;
        heap[idx] = heap_next;
        heap_next = idx;
    }

    function getArrayJsValueFromWasm0(ptr, len) {
        ptr = ptr >>> 0;
        const mem = getDataViewMemory0();
        const result = [];
        for (let i = ptr; i < ptr + 4 * len; i += 4) {
            result.push(takeObject(mem.getUint32(i, true)));
        }
        return result;
    }

    let cachedDataViewMemory0 = null;
    function getDataViewMemory0() {
        if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
            cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
        }
        return cachedDataViewMemory0;
    }

    function getStringFromWasm0(ptr, len) {
        return decodeText(ptr >>> 0, len);
    }

    let cachedUint8ArrayMemory0 = null;
    function getUint8ArrayMemory0() {
        if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
            cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
        }
        return cachedUint8ArrayMemory0;
    }

    function getObject(idx) { return heap[idx]; }

    function handleError(f, args) {
        try {
            return f.apply(this, args);
        } catch (e) {
            wasm.__wbindgen_export3(addHeapObject(e));
        }
    }

    let heap = new Array(1024).fill(undefined);
    heap.push(undefined, null, true, false);

    let heap_next = heap.length;

    function isLikeNone(x) {
        return x === undefined || x === null;
    }

    function passStringToWasm0(arg, malloc, realloc) {
        if (realloc === undefined) {
            const buf = cachedTextEncoder.encode(arg);
            const ptr = malloc(buf.length, 1) >>> 0;
            getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
            WASM_VECTOR_LEN = buf.length;
            return ptr;
        }

        let len = arg.length;
        let ptr = malloc(len, 1) >>> 0;

        const mem = getUint8ArrayMemory0();

        let offset = 0;

        for (; offset < len; offset++) {
            const code = arg.charCodeAt(offset);
            if (code > 0x7F) break;
            mem[ptr + offset] = code;
        }
        if (offset !== len) {
            if (offset !== 0) {
                arg = arg.slice(offset);
            }
            ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
            const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
            const ret = cachedTextEncoder.encodeInto(arg, view);

            offset += ret.written;
            ptr = realloc(ptr, len, offset, 1) >>> 0;
        }

        WASM_VECTOR_LEN = offset;
        return ptr;
    }

    let stack_pointer = 1024;

    function takeObject(idx) {
        const ret = getObject(idx);
        dropObject(idx);
        return ret;
    }

    let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
    cachedTextDecoder.decode();
    function decodeText(ptr, len) {
        return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
    }

    const cachedTextEncoder = new TextEncoder();

    if (!('encodeInto' in cachedTextEncoder)) {
        cachedTextEncoder.encodeInto = function (arg, view) {
            const buf = cachedTextEncoder.encode(arg);
            view.set(buf);
            return {
                read: arg.length,
                written: buf.length
            };
        };
    }

    let WASM_VECTOR_LEN = 0;

    let wasmModule, wasmInstance, wasm;
    function __wbg_finalize_init(instance, module) {
        wasmInstance = instance;
        wasm = instance.exports;
        wasmModule = module;
        cachedDataViewMemory0 = null;
        cachedUint8ArrayMemory0 = null;
        return wasm;
    }

    async function __wbg_load(module, imports) {
        if (typeof Response === 'function' && module instanceof Response) {
            if (!module.ok) {
                throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
            }

            if (typeof WebAssembly.instantiateStreaming === 'function') {
                try {
                    return await WebAssembly.instantiateStreaming(module, imports);
                } catch (e) {
                    const validResponse = expectedResponseType(module.type);

                    if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                        console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                    } else { throw e; }
                }
            }

            const bytes = await module.arrayBuffer();
            return await WebAssembly.instantiate(bytes, imports);
        } else {
            const instance = await WebAssembly.instantiate(module, imports);

            if (instance instanceof WebAssembly.Instance) {
                return { instance, module };
            } else {
                return instance;
            }
        }

        function expectedResponseType(type) {
            switch (type) {
                case 'basic': case 'cors': case 'default': return true;
            }
            return false;
        }
    }

    function initSync(module) {
        if (wasm !== undefined) return wasm;


        if (module !== undefined) {
            if (Object.getPrototypeOf(module) === Object.prototype) {
                ({module} = module)
            } else {
                console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
            }
        }

        const imports = __wbg_get_imports();
        if (!(module instanceof WebAssembly.Module)) {
            module = new WebAssembly.Module(module);
        }
        const instance = new WebAssembly.Instance(module, imports);
        return __wbg_finalize_init(instance, module);
    }

    async function __wbg_init(module_or_path) {
        if (wasm !== undefined) return wasm;


        if (module_or_path !== undefined) {
            if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
                ({module_or_path} = module_or_path)
            } else {
                console.warn('using deprecated parameters for the initialization function; pass a single object instead')
            }
        }

        if (module_or_path === undefined && script_src !== undefined) {
            module_or_path = script_src.replace(/\.js$/, "_bg.wasm");
        }
        const imports = __wbg_get_imports();

        if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
            module_or_path = fetch(module_or_path);
        }

        const { instance, module } = await __wbg_load(await module_or_path, imports);

        return __wbg_finalize_init(instance, module);
    }

    return Object.assign(__wbg_init, { initSync }, exports);
})({ __proto__: null });
