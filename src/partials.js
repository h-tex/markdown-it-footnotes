// / /////////////////////////////////////////////////////////////////////////////
// Renderer partials

// helper (only used in other rules, no tokens are attached to this)
export function render_footnote_anchor_name (tokens, idx, options, env/* , slf */) {
	const n = Number(tokens[idx].meta.id + 1).toString();
	let prefix = "";

	if (typeof env.id === "string") {
		prefix = `${env.id}-`; // use the document ID as a prefix to make the footnote anchor unique
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

	let a_attrs = `href="#fn-${id}" id="fn-ref-${refid}" class="footnote-ref"`;

	if (options.epub) {
		a_attrs += ` epub:type="noteref"`;
	}

	return `<a ${ a_attrs }>${caption}</a>`;
}

export function render_footnote_open (tokens, idx, options, env, slf) {
	let id = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf);
	let caption = slf.rules.footnote_caption(tokens, idx, options, env, slf);

	if (tokens[idx].meta.subId > 0) {
		id += `:${tokens[idx].meta.subId}`;
	}

	let attrs = `id="fn-${id}" class="footnote"`;

	if (options.epub) {
		attrs += ` epub:type="footnote"`;
	}

	return `<article ${ attrs }><a href="#fn-${ id }" class="footnote-marker">${ caption }</a>`;
}

export function render_footnote_close () {
	return "</article>\n";
}

// Footnote backlinks
export function render_footnote_anchor (tokens, idx, options, env, slf) {
	let id = slf.rules.footnote_anchor_name(tokens, idx, options, env, slf);

	if (tokens[idx].meta.subId > 0) {
		id += `:${tokens[idx].meta.subId}`;
	}

	let attrs = "";
	if (options.epub) {
		attrs += ` aria-label="${options.backrefLabel ?? "back to text"}"`;
	}

	return ` <a href="#fn-ref-${id}" class="footnote-backref"${attrs}>⤴️</a>`;
}
