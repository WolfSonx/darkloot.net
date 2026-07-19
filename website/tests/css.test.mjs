import assert from "node:assert/strict";
import test from "node:test";

import { minifyCss } from "../scripts/css.mjs";

test("CSS minification preserves strings and required calc spacing", () => {
  const css = `
    /* remove me */
    .row > span::before {
      content: "Sources: ";
      width: calc(100% - 8px);
      color: white;
    }
  `;
  const output = minifyCss(css);

  assert.equal(output, `.row>span::before{content:"Sources: ";width:calc(100% - 8px);color:white}`);
});
