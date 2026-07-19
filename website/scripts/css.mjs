const TIGHT = new Set(["{", "}", ":", ";", ",", ">", "+", "~"]);

export function minifyCss(source) {
  let output = "";
  let quote = "";
  let pendingSpace = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1] || "";

    if (quote) {
      output += char;
      if (char === "\\") {
        output += next;
        index += 1;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }

    if (char === "/" && next === "*") {
      const end = source.indexOf("*/", index + 2);
      index = end === -1 ? source.length : end + 1;
      pendingSpace = true;
      continue;
    }

    if (char === '"' || char === "'") {
      if (pendingSpace && output && !TIGHT.has(output.at(-1))) output += " ";
      pendingSpace = false;
      quote = char;
      output += char;
      continue;
    }

    if (/\s/.test(char)) {
      pendingSpace = true;
      continue;
    }

    if (TIGHT.has(char)) {
      output = output.replace(/ $/, "");
      output += char;
      pendingSpace = false;
      continue;
    }

    if (pendingSpace && output && !TIGHT.has(output.at(-1))) output += " ";
    pendingSpace = false;
    output += char;
  }

  return output.trim().replaceAll(";}", "}");
}
