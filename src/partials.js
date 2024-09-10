// / /////////////////////////////////////////////////////////////////////////////
// Renderer partials

// helper (only used in other rules, no tokens are attached to this)
export function render_footnote_anchor_name (tokens, idx, options, env/* , slf */) {
	const n = Number(tokens[idx].meta.id + 1).toString();
	let prefix = "";

	if (typeof env.docId === "string") {
		prefix = `-${env.docId}-`;
	}

	return prefix + n;
}

// helper (only used in other rules, no tokens are attached to this)
export function render_footnote_caption (tokens, idx/* , options, env, slf */) {
	let n = Number(tokens[idx].meta.id + 1).toString();

	if (tokens[idx].meta.subId > 0) {
		n += `:${tokens[idx].meta.subId}`;
	}

	return n;
}

export function render_footnote_ref (tokens, idx, options, env, slf) {
	const id = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf);
	const caption = slf.rules.footnote_caption(tokens, idx, options, env, slf);
	let refid = id;

	if (tokens[idx].meta.subId > 0) {
		refid += `:${tokens[idx].meta.subId}`;
	}

	let a_attrs = `href="#fn${id}" id="fnref${refid}" class="footnote-ref"`;

	if (options.epub) {
		a_attrs += ` epub:type="noteref"`;
	}

	return `<a ${ a_attrs }>${caption}</a>`;
}

export function render_footnote_block_open (tokens, idx, options) {
	return '<hr class="footnotes-sep" />\n' +
		'<section class="footnotes">\n' +
		'<ol class="footnotes-list">\n';
}

export function render_footnote_block_close () {
	return "</ol>\n</section>\n";
}

export function render_footnote_open (tokens, idx, options, env, slf) {
	let id = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf);

	if (tokens[idx].meta.subId > 0) {
		id += `:${tokens[idx].meta.subId}`;
	}

	let li_attrs = `id="fn${id}" class="footnote-item"`;

	if (options.epub) {
		li_attrs += ` epub:type="footnote"`;
	}

	return `<li ${ li_attrs }>`;
}

export function render_footnote_close () {
	return "</li>\n";
}

export function render_footnote_anchor (tokens, idx, options, env, slf) {
	let id = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf);

	if (tokens[idx].meta.subId > 0) {
		id += `:${tokens[idx].meta.subId}`;
	}

	let attrs = "";
	if (options.epub) {
		attrs += ` aria-label="${options.backrefLabel ?? "back to text"}"`;
	}

	/* ↩ with escape code to prevent display as Apple Emoji on iOS */
	return ` <a href="#fnref${id}" class="footnote-backref"${attrs}>\u21a9\uFE0E</a>`;
}
