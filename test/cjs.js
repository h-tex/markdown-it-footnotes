"use strict";
/* eslint-env mocha */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const assert = require("node:assert");
const fn = require("../");

describe("CJS", () => {
	it("require", () => {
		assert.ok(typeof fn === "function");
	});
});
