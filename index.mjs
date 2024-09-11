import * as partials from "./src/partials.js";
import * as parse from "./src/parse.js";

export default function footnote_plugin (md) {
	const parseLinkLabel = md.helpers.parseLinkLabel;

	for (let fn in partials) {
		let key = fn.replace("render_", "");
		md.renderer.rules[key] = partials[fn];
	}

	md.block.ruler.before("reference", "footnote_def", parse.footnote_def, { alt: ["paragraph", "reference"] });
	md.inline.ruler.after("image", "footnote_inline", parse.footnote_inline);
	md.inline.ruler.after("footnote_inline", "footnote_ref", parse.footnote_ref);
	md.core.ruler.after("inline", "footnote_tail", parse.footnote_tail);
}
