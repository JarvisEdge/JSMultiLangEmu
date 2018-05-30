'use strict';

// lib
const Rx = require('rx');
const $ = Rx.Observable;

const {str, obj} = require('iblokz-data');

const prettify = require('code-prettify');
const vm = require('../../util/vm');
const caret = require('../../util/caret');

const libs = require('../../libs');

// Python
// let Sk = require('../../util/sk');
let Sk = require('skulpt');
// let Sk = require('skulptjs');
// window.Sk = Sk;
// Sk = require('../../util/skulpt-stdin-node')(Sk);
// skulpt experiment

console.log(Sk.builtinFiles);
function builtinRead(x)
{
    if (Sk.builtinFiles === undefined || Sk.builtinFiles["files"][x] === undefined)
        throw "File not found: '" + x + "'";
    return Sk.builtinFiles["files"][x];
}

Sk.builtinFiles.files[`src/lib/testlib1/__init__.js`] = `
var $builtinmodule = function(name)
{
	var mod = {};

	Sk.testlib1 = {};

	mod.test_func = new Sk.builtin.func(function(test_arg) {
		console.log({test_arg});
	});

	return mod;
}
`;

const skulptExtensions = {
	domClear: elQuery => {
		const body = document.querySelector('.output > iframe').contentWindow.document;
		const el = body.querySelector(elQuery.v);
		el.innerHTML = '';
	},
	domCreate: (tagName, id, parentQuery) => {
		const body = document.querySelector('.output > iframe').contentWindow.document;
		const el = document.createElement(tagName.v);
		el.setAttribute('id', id.v);
		body.querySelector(parentQuery.v).appendChild(el);
	},
	domSet: (elQuery, prop, value) => {
		const body = document.querySelector('.output > iframe').contentWindow.document;
		const el = body.querySelector(elQuery.v);
		el[prop.v] = value.v;
	},
	domGet: (elQuery, prop, value) => {
		const body = document.querySelector('.output > iframe').contentWindow.document;
		const el = body.querySelector(elQuery.v);
		return el[prop.v];
	},
	domAttr: (elQuery, attr, value) => {
		const body = document.querySelector('.output > iframe').contentWindow.document;
		const el = body.querySelector(elQuery.v);
		console.log(value);
		if (value && value.v !== undefined) {
			el.setAttribute(attr.v, value.v);
		} else {
			return el.getAttribute(attr.v);
		}
	},
	domOn: (elQuery, evName, callback) => {
		const body = document.querySelector('.output > iframe').contentWindow.document;
		const el = body.querySelector(elQuery.v);
		el.addEventListener(evName.v, ev => callback.tp$call(ev));
		console.log(callback);
	}
};

// Object.keys(skulptExtensions)
// 	.forEach(ext => {
// 		const pyExt = str.fromCamelCase(ext, '_');
// 		Sk.builtin[pyExt] = skulptExtensions[ext];
// 		Sk.builtins[pyExt] = Sk.builtin[pyExt];
// 	});

// load libs
Object.keys(libs)
	.forEach(lib => {
		// const sklib = obj.map(libs[lib], (key, func) => new Sk.builtin.func(func));
		// console.log(sklib);
		// const pyExt = str.fromCamelCase(ext, '_');
		// Sk.builtin[lib] = sklib;
		// Sk.builtins[lib] = Sk.builtin[lib];
		Sk.builtinFiles.files[`src/lib/${lib}/__init__.js`] = `
		var $builtinmodule = function(name)
		{
			var mod = {};

			Sk.${lib} = {};
` +
			Object.keys(libs[lib]).map(func => `
			mod.${func} = ${libs[lib][func].toString()}
`) + `

			return mod;
		}
		`;
	});

// Sk.builtin['test_func'] = function(test_arg) {
// 	console.log({test_arg});
// };
// Sk.builtins['test_func'] = Sk.builtin['test_func'];

// Java
const javaconves6func = require('esjava');

// components
const vdom = require('iblokz-snabbdom-helpers');
const {section, button, span, code, h} = vdom;

const unprettify = html => {
	const tDiv = document.createElement('div');
	tDiv.innerHTML = html
		.replace(/<\/?ol[^>]*>/g, '')
		.replace(/<li[^>]*>/g, '')
		.replace(/<\/li>/g, '^^nl^^')
		.replace('<br>', '');
	// console.log(tDiv.innerHTML);
	const text = tDiv.textContent
		.replace(/\^\^nl\^\^/g, '\n');
	// console.log(text);
	// tDiv.innerHTML = html;
	// const text = tDiv.textContent;
	return text;
};

const sandbox = (source, iframe, context = {}, cb) => {
	let log = [];
	let err = null;
	let res = null;
	try {
		res = vm.runInIFrame(source, iframe, Object.assign(context, {
			console: {log: (...args) => {
				console.log(args);
				log.push(args);
			}},
			Rx,
			$,
			vdom
		}));
	} catch (e) {
		err = e;
	}
	cb({res, log, err});
};

const cleanupCode = code => code
	.split('\n')
	.map(s => s.trimRight())
	.map(s => s.replace(new RegExp('&nbps;', 'ig'), ''))
	.filter(s => s !== '' && s !== ' ')
	.join('\n');

const removeChildren = (el, selector = '*') => Array.from(el.querySelectorAll(selector)).forEach(child => {
	el.removeChild(child);
});

const createBefore = (type, el) => {
	removeChildren(el.parentNode, 'iframe');
	let newEl = document.createElement(type);
	el.parentNode.insertBefore(newEl, el);
	return newEl;
};

	// clear and prep output and console
const prepOutput = parentNode => {
	removeChildren(parentNode, 'iframe');
	let iframe = createBefore('IFRAME', parentNode.querySelector('.console'));
	iframe.contentWindow.document.body.innerHTML =
		'<style>* {font-size: 24px;}</style><section id="ui"></section>';
	parentNode.querySelector('.console').innerHTML = '';
	return iframe;
};

const process = (type, sourceCode, iframe) => {
	const console$ = new Rx.ReplaySubject();
	if (type === 'js') {
		sandbox(sourceCode, iframe, libs, ({res, log, err}) => {
			if (err) console$.onNext(`<p class="err">${err}</p>\n`);
			if (log) log.map(l => prettify.prettyPrintOne(JSON.stringify(l)))
				.forEach(l => console$.onNext(`${l}\n`));
		});
	}
	if (type === 'java') {
		let jsSourceCode;
		try {
			jsSourceCode = javaconves6func(sourceCode);
		} catch (err) {
			console.log(err);
			console$.onNext(`<p class="err">${
				typeof err === 'string'
					? err
					: err.message || JSON.stringify(err, false, 2)
			}</p>`);
		}
		// let ts = transformSync(jsSourceCode);
		// console.log(ts);
		jsSourceCode += '\ntypeof HelloWorldExample !== "undefined" && HelloWorldExample.main && HelloWorldExample.main(1);';
		sandbox(jsSourceCode, iframe, {
			System: {
				out: {
					println: (...args) => console$.onNext(`${args}\n`)
				}
			}
		}, ({res, log, err}) => {
			if (err) console$.onNext(`<p class="err">${err}</p>\n`);
			if (log) log.map(l => prettify.prettyPrintOne(JSON.stringify(l)))
				.forEach(l => console$.onNext(`${l}\n`));
		});
	}
	if (type === 'py') {
		Sk.configure({
			output: text => {
				console.log(text);
				console$.onNext(`${text}`);
			},
			read: builtinRead
		});

		let module;
		if (sourceCode.trim() !== '') try {
			module = Sk.importMainWithBody('<stdin>', false, sourceCode, true);
		} catch (err) {
			console.log(err);
			console$.onNext(`<p class="err">${
				typeof err === 'string'
					? err
					: JSON.stringify(err, false, 2)
			}</p>`);
		}
	}
	return console$;
};

// ui
module.exports = ({source, type}) => span('.codebin', [
	code(`.source[type="${type}"][contenteditable="true"][spellcheck="false"]`, {
		props: {
			innerHTML: prettify.prettyPrintOne(source, type, true),
			spellcheck: false
		},
		on: {
			focus: ({target}) => [$.fromEvent(target, 'input')
				.map(ev => ev.target)
				.takeUntil($.fromEvent(target, 'blur'))
				.share()
			].map(inputs$ => $.merge(
					inputs$.debounce(200).map(el => {
						const pos = caret.get(el);
						const sourceCode = unprettify(el.innerHTML);
						el.innerHTML = prettify.prettyPrintOne(sourceCode, type, true);
						caret.set(el, pos);
						return 1;
					}),
					inputs$.debounce(500).map(el => {
						const sourceCode = cleanupCode(unprettify(el.innerHTML));

						// clear and prep output and console
						let iframe = prepOutput(el.parentNode.querySelector('.output'));

						// process code
						process(type, sourceCode, iframe)
							.catch(err => console.log(err))
							.subscribe(l => {
								console.log(l);
								el.parentNode.querySelector('.console').innerHTML += l;
							});

						return 1;
					})
			)).pop().subscribe(),
			keyup: ev => {
				const pos = caret.get(ev.target);
				console.log(pos);
			}
		}
	}),
	span('.output', [
		h('iframe.sandbox', {
			hook: {
				insert: ({elm}) => {
					elm.contentWindow.document.body.innerHTML = '<section id="ui"></section>';
				}
			}
		}),
		code('.console', {
			hook: {
				insert: ({elm}) => {
					// clear and prep output and console
					let iframe = prepOutput(elm.parentNode);

					// process code
					process(type, cleanupCode(source), iframe)
						.catch(err => console.log(err))
						.subscribe(l => {
							console.log(l);
							elm.innerHTML += l;
						});
				},
				update: ({elm}) => {
					// clear and prep output and console
					let iframe = prepOutput(elm.parentNode);

					// process code
					process(type, cleanupCode(source), iframe)
						.catch(err => console.log(err))
						.subscribe(l => {
							console.log(l);
							elm.innerHTML += l;
						});
				}
			}
		})
	])
]);
