// Process footnote block definition
export function footnote_def (state, startLine, endLine, silent) {
	const start = state.bMarks[startLine] + state.tShift[startLine];
	const max = state.eMarks[startLine];

	// line should be at least 5 chars - "[^x]:"
	if (start + 5 >= max) {
		return false;
	}

	if (state.src[start] !== "[" || state.src[start + 1] !== "^") {
		// quick fail on non-footnote start
		return false;
	}

	let pos;

	for (pos = start + 2; pos < max; pos++) {
		let char = state.src[pos];

		if (char === " ") {
			// Spaces not allowed in id
			return false;
		}
		if (char === "]") {
			if (pos === start + 2 || pos >= max - 1) {
				// no empty footnotes or empty labels
				return false;
			}

			break;
		}
	}

	if (state.src[++pos] !== ":") {
		return false;
	}

	if (silent) {
		return true;
	}

	pos++;

	state.env.footnotes ??= {};
	state.env.footnotes.refs ??= {};

	const label = state.src.slice(start + 2, pos - 2);
	state.env.footnotes.refs[`:${label}`] = -1;

	const token_fref_o = new state.Token("footnote_reference_open", "", 1);
	token_fref_o.meta  = { label };
	token_fref_o.level = state.level++;
	state.tokens.push(token_fref_o);

	// Store current state so it can be restored
	let old = {
		parentType: state.parentType, // usually "paragraph"
		bMarks: state.bMarks[startLine], // bMarks: Index of the beginning of each line
		tShift: state.tShift[startLine], // tShift: indentation offset of the current line
		sCount: state.sCount[startLine], // computed indentation level of the current line (including tab expansions)
	};

	const posAfterColon = pos;
	let posFirstNonWhitespace = state.bMarks[startLine] + state.tShift[startLine];

	const initial = state.sCount[startLine] + pos - posFirstNonWhitespace;
	let offset = initial;

	// Find position of first non-space character after footnote marker and its offset
	while (pos < max) {
		let char = state.src[pos];

		if (char === " ") {
			offset++;
		}
		else if (char === "\t") {
			offset += 4 - offset % 4;
		}
		else {
			break;
		}

		pos++;
	}

	// Set state for parsing block
	state.tShift[startLine] = pos - posAfterColon;
	state.sCount[startLine] = offset - initial;
	state.bMarks[startLine] = posAfterColon;
	state.blkIndent += 4;
	state.parentType = "footnote";

	if (state.sCount[startLine] < state.blkIndent) {
		state.sCount[startLine] += state.blkIndent;
	}

	state.md.block.tokenize(state, startLine, endLine, true);

	// Restore original state
	state.parentType = old.parentType;
	state.blkIndent -= 4;
	state.tShift[startLine] = old.tShift;
	state.sCount[startLine] = old.sCount;
	state.bMarks[startLine] = old.bMarks;

	const token_ref_close = new state.Token("footnote_reference_close", "", -1);
	token_ref_close.level = --state.level;
	state.tokens.push(token_ref_close);

	return true;
}

// Originally from https://github.com/markdown-it/markdown-it/blob/0fe7ccb4b7f30236fb05f623be6924961d296d3d/lib/helpers/parse_link_label.mjs#L7C1-L49C2
export default function parseLinkLabel (state, start, disableNested) {
	let level, found, marker, prevPos;

	const max = state.posMax
	const oldPos = state.pos

	state.pos = start + 1;
	level = 1;

	while (state.pos < max) {
		marker = state.src[state.pos];

		if (marker === "]") {
			level--;

			if (level === 0) {
				found = true;
				break;
			}
		}

		prevPos = state.pos;
		state.md.inline.skipToken(state);

		if (marker === "[") {
			if (prevPos === state.pos - 1) {
				// increase level if we find text `[`, which is not a part of any token
				level++;
			}
			else if (disableNested) {
				state.pos = oldPos;
				return -1;
			}
		}
	}

	let labelEnd = -1;

	if (found) {
		labelEnd = state.pos;
	}

	// restore old state
	state.pos = oldPos;

	return labelEnd;
}

// Process inline footnotes (^[...])
export function footnote_inline (state, silent) {
	const max = state.posMax;
	const start = state.pos;

	// Inline footnotes are at least 4 chars - "^[x]"
	if (start + 4 >= max) {
		return false;
	}

	if (state.src[start] !== "^" || state.src[start + 1] !== "[") {
		// Doesn’t start with "^["
		return false;
	}

	const labelStart = start + 2;
	const labelEnd = parseLinkLabel(state, start + 1);

	// parser failed to find "]", so it"s not a valid note
	if (labelEnd < 0) {
		return false;
	}

	// We found the end of the link, and know for a fact it"s a valid link;
	// so all that"s left to do is to call tokenizer.
	//
	if (!silent) {
		state.env.footnotes ??= {};
		state.env.footnotes.list ??= [];

		const footnoteId = state.env.footnotes.list.length;
		const tokens = [];

		state.md.inline.parse(
			state.src.slice(labelStart, labelEnd),
			state.md,
			state.env,
			tokens,
		);

		const token = state.push("footnote_ref", "", 0);
		token.meta = { id: footnoteId };

		state.env.footnotes.list[footnoteId] = {
			content: state.src.slice(labelStart, labelEnd),
			tokens,
		};
	}

	state.pos = labelEnd + 1;
	state.posMax = max;
	return true;
}

// Process footnote references ([^...])
export function footnote_ref (state, silent) {
	const max = state.posMax;
	const start = state.pos;

	// should be at least 4 chars - "[^x]"
	if (start + 4 >= max) {
		return false;
	}

	if (!state.env.footnotes || !state.env.footnotes.refs) {
		return false;
	}

	let char = state.src[start];

	if (char !== "[" || state.src[start + 1] !== "^") {
		return false;
	}

	let pos;

	for (pos = start + 2; pos < max; pos++) {
		let char = state.src[pos];

		if (char === " " || char === "\n") {
			// Spaces and newlines not allowed in id
			return false;
		}

		if (char === "]") {
			if (pos === start + 2) {
				// label is empty ([^])
				return false;
			}

			break;
		}
	}

	if (pos >= max) {
		return false;
	}

	pos++;

	const label = state.src.slice(start + 2, pos - 1);
	if (state.env.footnotes.refs[`:${label}`] === undefined) {
		return false;
	}

	if (!silent) {
		state.env.footnotes.list ??= [];

		let footnoteId;

		if (state.env.footnotes.refs[`:${label}`] < 0) {
			footnoteId = state.env.footnotes.list.length;
			state.env.footnotes.list[footnoteId] = { label, count: 0 };
			state.env.footnotes.refs[`:${label}`] = footnoteId;
		}
		else {
			footnoteId = state.env.footnotes.refs[`:${label}`];
		}

		const footnoteSubId = state.env.footnotes.list[footnoteId].count;
		state.env.footnotes.list[footnoteId].count++;

		const token = state.push("footnote_ref", "", 0);
		token.meta = { id: footnoteId, subId: footnoteSubId, label };
	}

	state.pos = pos;
	state.posMax = max;
	return true;
}

// Glue footnote tokens to end of token stream
export function footnote_tail (state) {
	let tokens;
	let current;
	let currentLabel;
	let insideRef = false;
	const refTokens = {};

	if (!state.env.footnotes) {
		return;
	}

	state.tokens = state.tokens.filter(function (tok) {
		if (tok.type === "footnote_reference_open") {
			insideRef = true;
			current = [];
			currentLabel = tok.meta.label;
			return false;
		}

		if (tok.type === "footnote_reference_close") {
			insideRef = false;
			// prepend ":" to avoid conflict with Object.prototype members
			refTokens[":" + currentLabel] = current;
			return false;
		}

		if (insideRef) {
			current.push(tok);
		}

		return !insideRef;
	});

	if (!state.env.footnotes.list) {
		return;
	}
	const list = state.env.footnotes.list;

	for (let i = 0, l = list.length; i < l; i++) {
		const token_fo = new state.Token("footnote_open", "", 1);
		token_fo.meta = { id: i, label: list[i].label };
		state.tokens.push(token_fo);

		if (list[i].tokens) {
			tokens = [];

			const token_po = new state.Token("paragraph_open", "p", 1);
			token_po.block = true;
			tokens.push(token_po);

			const token_i = new state.Token("inline", "", 0);
			token_i.children = list[i].tokens;
			token_i.content = list[i].content;
			tokens.push(token_i);

			const token_pc = new state.Token("paragraph_close", "p", -1);
			token_pc.block    = true;
			tokens.push(token_pc);
		}
		else if (list[i].label) {
			tokens = refTokens[`:${list[i].label}`];
		}

		if (tokens) {
			state.tokens = state.tokens.concat(tokens);
		}

		let lastToken = state.tokens.at(-1);
		let lastParagraph = lastToken.type === "paragraph_close" ? state.tokens.pop() : null;

		const t = list[i].count > 0 ? list[i].count : 1;
		for (let j = 0; j < t; j++) {
			const token_a = new state.Token("footnote_anchor", "", 0);
			token_a.meta = { id: i, subId: j, label: list[i].label };
			state.tokens.push(token_a);
		}

		if (lastParagraph) {
			state.tokens.push(lastParagraph);
		}

		state.tokens.push(new state.Token("footnote_close", "", -1));
	}
}
