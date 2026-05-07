const exprView = document.getElementById("exprView");
const result = document.getElementById("result");
const copyResultBtn = document.getElementById("copyResultBtn");
const menuBtn = document.getElementById("menuBtn");
const menuDropdown = document.getElementById("menuDropdown");
const themeToggleBtn = document.getElementById("themeToggleBtn");
const backspaceBtn = document.getElementById("backspaceBtn");
const toast = document.getElementById("toast");
const powerBtn = document.getElementById("powerBtn");

const actionScientificBtn = document.getElementById("actionScientificBtn");
const sciDrawer = document.getElementById("sciDrawer");
const sciOverlay = document.getElementById("sciOverlay");
const closeSciBtn = document.getElementById("closeSciBtn");
const drawerCloseBottom = document.getElementById("drawerCloseBottom");
const invToggleBtn = document.getElementById("invToggleBtn");
const angleToggleBtn = document.getElementById("angleToggleBtn");

let expression = localStorage.getItem("calc_expression_live") || "";
let cursorIndex = expression.length;
let lastValidResult = "0";
let toastTimer = null;

let sciInvMode = false;
let sciAngleMode = "deg";
let exprTouchTimer = null;

/* ===============================
   CORE
================================*/
function syncExpression() {
  localStorage.setItem("calc_expression_live", expression);
}

function showToast(message = "Copied") {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 1400);
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function isOperator(ch) {
  return ["+", "−", "×", "÷", "^"].includes(ch);
}

function normalizeBasic(raw) {
  return raw
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-");
}

/* ===============================
   SCIENTIFIC DRAWER
================================*/
function openScientificDrawer() {
  sciDrawer?.classList.add("show");
  sciOverlay?.classList.add("show");
}

function closeScientificDrawer() {
  sciDrawer?.classList.remove("show");
  sciOverlay?.classList.remove("show");
}

function updateSciButtons() {
  document.querySelectorAll(".sci-btn[data-normal]").forEach((btn) => {
    const current = sciInvMode
      ? (btn.dataset.inv || btn.dataset.normal)
      : btn.dataset.normal;

    const labelMap = {
      "sin("   : "sin",
      "asin("  : "sin⁻¹",
      "cos("   : "cos",
      "acos("  : "cos⁻¹",
      "tan("   : "tan",
      "atan("  : "tan⁻¹",
      "π"      : "π",
      "e"      : "e",
      "ln("    : "ln",
      "exp("   : "eˣ",
      "log("   : "log",
      "pow10(" : "10ˣ",
      "√("     : "√",
      "∛("     : "∛",
      "^"      : "xʸ",
      "("      : "( )",
      "abs("   : "abs",
      "1/abs(" : "1/abs",
      "1/"     : "1/x",
      "%"      : "%",
      "sinh("  : "sinh",
      "asinh(" : "sinh⁻¹",
      "cosh("  : "cosh",
      "acosh(" : "cosh⁻¹",
      "tanh("  : "tanh",
      "atanh(" : "tanh⁻¹",
      "!"      : "x!",
      "sq("    : "x²",
      "cube("  : "x³",
      "00"     : "00"
    };

    btn.textContent = labelMap[current] || current;
  });

  if (invToggleBtn) invToggleBtn.classList.toggle("active", sciInvMode);
  if (angleToggleBtn) {
    angleToggleBtn.classList.toggle("active", sciAngleMode === "rad");
    angleToggleBtn.textContent = sciAngleMode === "deg" ? "DEG" : "RAD";
  }
}

/* ===============================
   DISPLAY / CURSOR
================================*/
function tokenizeExpression(value) {
  const tokens = [];
  let i = 0;

  while (i < value.length) {
    const ch = value[i];

    if (/\d|\./.test(ch)) {
      let num = ch;
      i++;
      while (i < value.length && /[\d.]/.test(value[i])) {
        num += value[i];
        i++;
      }
      tokens.push({ text: num, start: i - num.length, end: i });
      continue;
    }

    if (isOperator(ch)) {
      tokens.push({ text: ch, start: i, end: i + 1 });
      i++;
      continue;
    }

    if (ch === "(" || ch === ")" || ch === "%" || ch === "π" || ch === "!" || ch === ",") {
      tokens.push({ text: ch, start: i, end: i + 1 });
      i++;
      continue;
    }

    if (/[a-zA-Z√∛]/.test(ch)) {
      let fn = ch;
      i++;
      while (i < value.length && /[a-zA-Z]/.test(value[i])) {
        fn += value[i];
        i++;
      }
      tokens.push({ text: fn, start: i - fn.length, end: i });
      continue;
    }

    tokens.push({ text: ch, start: i, end: i + 1 });
    i++;
  }

  return tokens;
}

function buildExpressionHTML() {
  const tokens = tokenizeExpression(expression);
  let html = "";
  let probePlaced = false;

  if (tokens.length === 0) {
    html = `<span class="cursor-probe" id="cursorProbe">|</span>`;
    return `<div class="expr-line">${html}</div>`;
  }

  for (const token of tokens) {
    if (cursorIndex === token.start) {
      html += `<span class="cursor-probe" id="cursorProbe">|</span>`;
      probePlaced = true;
    }

    if (cursorIndex > token.start && cursorIndex < token.end) {
      const split = cursorIndex - token.start;
      const left = escapeHtml(token.text.slice(0, split));
      const right = escapeHtml(token.text.slice(split));
      html += `<span class="expr-token">${left}<span class="cursor-probe" id="cursorProbe">|</span>${right}</span>`;
      probePlaced = true;
    } else {
      html += `<span class="expr-token">${escapeHtml(token.text)}</span>`;
    }
  }

  if (!probePlaced) {
    html += `<span class="cursor-probe" id="cursorProbe">|</span>`;
  }

  return `<div class="expr-line">${html}</div>`;
}

function placeCursorOverlay() {
  const oldOverlay = exprView?.querySelector(".cursor-overlay");
  if (oldOverlay) oldOverlay.remove();

  const probe = exprView?.querySelector("#cursorProbe");
  if (!probe || !exprView) return;

  const probeRect = probe.getBoundingClientRect();
  const viewRect = exprView.getBoundingClientRect();

  const overlay = document.createElement("div");
  overlay.className = "cursor-overlay";

  const lineHeight =
    parseFloat(getComputedStyle(exprView).lineHeight) || (probeRect.height || 24);

  overlay.style.height = `${Math.max(lineHeight * 0.95, probeRect.height || 22)}px`;
  overlay.style.left = `${probeRect.left - viewRect.left + exprView.scrollLeft}px`;
  overlay.style.top = `${probeRect.top - viewRect.top + exprView.scrollTop}px`;

  exprView.appendChild(overlay);
  probe.remove();
}

function fitExpressionText() {
  if (!exprView) return;

  const len = expression.length;

  // প্রতি লাইনে আনুমানিক কতটি character ধরে তার উপর ভিত্তি করে font size
  // 48px এ screen width ~360px এ প্রায় 8-9 char ধরে
  // তাই:
  // ১ম লাইন (1-9 char)   → 48px
  // ২য় লাইন (10-18 char) → 34px
  // ৩য় লাইন (19+ char)   → 24px

  if (len <= 9) {
    exprView.style.fontSize = "39px";
  } else if (len <= 18) {
    exprView.style.fontSize = "34px";
  } else {
    exprView.style.fontSize = "24px";
  }
}

function renderExpression(mode = "preserve") {
  if (!exprView) return;

  const previousScrollTop = exprView.scrollTop;

  // ১. আগেই font size set করো (expression variable দিয়ে)
  fitExpressionText();

  // ২. তারপর HTML set করো
  exprView.innerHTML = buildExpressionHTML();

  // ৩. render হওয়ার পরে scroll ও cursor ঠিক করো
  requestAnimationFrame(() => {
    exprView.scrollTop = mode === "bottom" ? exprView.scrollHeight : previousScrollTop;
    placeCursorOverlay();
  });
}

function renderAfterEdit() {
  syncExpression();
  updateResult();
  renderExpression("preserve"); // backspace/delete → scroll ধরে রাখো
}

function renderAfterTap() {
  renderExpression("preserve");
}

/* ===============================
   RESULT FONT
================================*/
function fitResultText() {
  if (!result) return;

  const text = result.textContent || "";

  if (text === "0" || text === "") {
    result.style.fontSize = "35px";
    return;
  }

  // ধাপে ধাপে font size কমাতে থাকো যতক্ষণ না text box এ ফেটে যায়
  const maxSize = 35;
  const minSize = 8;
  const step = 1;

  result.style.fontSize = maxSize + "px";

  for (let size = maxSize; size >= minSize; size -= step) {
    result.style.fontSize = size + "px";
    // scrollWidth > clientWidth মানে text বাইরে বেরিয়ে যাচ্ছে
    if (result.scrollWidth <= result.clientWidth) {
      break;
    }
  }
}

function setResultText(value) {
  if (result.textContent === value) return;
  result.textContent = value;
  requestAnimationFrame(fitResultText);
}

/* ===============================
   INSERT / DELETE
================================*/
function insertAtCursor(text) {
  expression = expression.slice(0, cursorIndex) + text + expression.slice(cursorIndex);
  cursorIndex += text.length;
  syncExpression();
  updateResult();
  renderExpression("bottom"); // নতুন character → নিচে scroll
}

function insertOperator(op) {
  if (!expression) {
    if (op === "−") insertAtCursor("−");
    return;
  }

  const prev = expression[cursorIndex - 1] || "";
  const next = expression[cursorIndex] || "";

  if (isOperator(prev) && (cursorIndex === expression.length || !isOperator(next))) {
    expression = expression.slice(0, cursorIndex - 1) + op + expression.slice(cursorIndex);
    cursorIndex = cursorIndex - 1 + op.length;
    renderAfterEdit();
    return;
  }

  if (cursorIndex === 0) {
    if (op === "−") insertAtCursor("−");
    return;
  }

  if (prev === "(" && op !== "−") return;
  insertAtCursor(op);
}

function getCurrentNumberSegmentLeft() {
  const left = expression.slice(0, cursorIndex);
  const match = left.match(/(?:^|[+\−×÷^%(,])(\d*\.?\d*)$/);
  return match ? match[1] : "";
}

function insertDot() {
  const prev = expression[cursorIndex - 1] || "";
  const currentNum = getCurrentNumberSegmentLeft();

  if (currentNum.includes(".")) return;

  if (
    cursorIndex === 0 ||
    isOperator(prev) ||
    prev === "(" ||
    prev === "%" ||
    prev === ","
  ) {
    insertAtCursor("0.");
    return;
  }

  if (prev === ")") return;
  insertAtCursor(".");
}

function insertPercent() {
  const prev = expression[cursorIndex - 1] || "";
  if (!prev) return;
  if (isOperator(prev) || prev === "(" || prev === "." || prev === "%" || prev === ",") return;
  insertAtCursor("%");
}

function smartBracket() {
  const left = expression.slice(0, cursorIndex);
  const open = (left.match(/\(/g) || []).length;
  const close = (left.match(/\)/g) || []).length;
  const prev = left.slice(-1);

  if (!left || isOperator(prev) || prev === "(" || prev === ",") {
    insertAtCursor("(");
  } else if (open > close && !isOperator(prev) && prev !== "(") {
    insertAtCursor(")");
  } else {
    insertAtCursor("(");
  }
}

/* ===== FIX: backspace multi-char tokens (sin(, cos(, etc.) ===== */
function backspaceAtCursor() {
  if (cursorIndex <= 0) return;

  // Multi-char function names যেগুলো একসাথে মুছে ফেলা উচিত
  const multiCharTokens = [
    "asinh(", "acosh(", "atanh(",
    "asin(", "acos(", "atan(",
    "sinh(", "cosh(", "tanh(",
    "sin(", "cos(", "tan(",
    "pow10(", "cube(", "log(",
    "abs(", "exp(", "ln(", "sq(",
    "√(", "∛(", "0"
  ];

  const left = expression.slice(0, cursorIndex);
  for (const token of multiCharTokens) {
    if (left.endsWith(token)) {
      const deleteLen = token.length;
      expression = expression.slice(0, cursorIndex - deleteLen) + expression.slice(cursorIndex);
      cursorIndex -= deleteLen;
      renderAfterEdit();
      return;
    }
  }

  expression = expression.slice(0, cursorIndex - 1) + expression.slice(cursorIndex);
  cursorIndex -= 1;
  renderAfterEdit();
}

function clearAll() {
  expression = "";
  cursorIndex = 0;
  lastValidResult = "0";
  syncExpression();
  renderExpression("preserve");
  updateResult();
}

/* ===============================
   OPERAND WRAP
================================*/
function findOperandBoundsAroundCursor(expr, index) {
  if (!expr) return null;

  if (index > 0 && expr[index - 1] === ")") {
    let depth = 0;
    for (let i = index - 1; i >= 0; i--) {
      if (expr[i] === ")") depth++;
      else if (expr[i] === "(") {
        depth--;
        if (depth === 0) {
          let start = i;
          while (start > 0 && /[a-zA-Z√∛]/.test(expr[start - 1])) start--;
          return { start, end: index };
        }
      }
    }
  }

  let start = index;
  while (start > 0) {
    const ch = expr[start - 1];
    if (isOperator(ch) || ch === "(" || ch === "," ) break;
    start--;
  }

  let end = index;
  while (end < expr.length) {
    const ch = expr[end];
    if (isOperator(ch) || ch === ")" || ch === ",") break;
    end++;
  }

  if (start === end) return null;
  return { start, end };
}

function wrapCurrentOperand(prefix, suffix = ")") {
  const bounds = findOperandBoundsAroundCursor(expression, cursorIndex);

  if (!bounds) {
    expression = expression.slice(0, cursorIndex) + prefix + suffix + expression.slice(cursorIndex);
    cursorIndex += prefix.length;
    renderAfterEdit();
    return;
  }

  const target = expression.slice(bounds.start, bounds.end);
  expression =
    expression.slice(0, bounds.start) +
    prefix +
    target +
    suffix +
    expression.slice(bounds.end);

  cursorIndex = bounds.start + prefix.length + target.length + suffix.length;
  renderAfterEdit();
}

/* ===============================
   PARSER / EVALUATOR
================================*/
function formatResultNumber(v) {
  if (typeof v !== "number" || !isFinite(v)) return "Error";

  const abs = Math.abs(v);

  if (abs !== 0 && (abs >= 1e12 || abs < 1e-10)) {
    return Number(v).toExponential(10).replace(/\.?0+e/, "e");
  }

  return Number(v).toLocaleString("en-US", {
    maximumFractionDigits: 10
  });
}

/* ===== FIX: math.js এর উপর নির্ভর না করে নিজেই factorial ===== */
function factorialSafe(n) {
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    throw new Error("Invalid factorial");
  }
  if (n > 170) throw new Error("Factorial too large");
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

function createFunctionScope() {
  const toRad = (x) => x * Math.PI / 180;
  const toDeg = (x) => x * 180 / Math.PI;

  return {
    sin: sciAngleMode === "deg" ? (x) => Math.sin(toRad(x)) : (x) => Math.sin(x),
    cos: sciAngleMode === "deg" ? (x) => Math.cos(toRad(x)) : (x) => Math.cos(x),
    tan: sciAngleMode === "deg" ? (x) => Math.tan(toRad(x)) : (x) => Math.tan(x),

    asin: sciAngleMode === "deg" ? (x) => toDeg(Math.asin(x)) : (x) => Math.asin(x),
    acos: sciAngleMode === "deg" ? (x) => toDeg(Math.acos(x)) : (x) => Math.acos(x),
    atan: sciAngleMode === "deg" ? (x) => toDeg(Math.atan(x)) : (x) => Math.atan(x),

    sinh: (x) => Math.sinh(x),
    cosh: (x) => Math.cosh(x),
    tanh: (x) => Math.tanh(x),
    asinh: (x) => Math.asinh(x),
    acosh: (x) => Math.acosh(x),
    atanh: (x) => Math.atanh(x),

    sqrt: (x) => Math.sqrt(x),
    cbrt: (x) => Math.cbrt(x),
    abs: (x) => Math.abs(x),
    exp: (x) => Math.exp(x),
    log: (x) => Math.log10(x),
    ln: (x) => Math.log(x),
    sq: (x) => x * x,
    cube: (x) => x * x * x,
    pow10: (x) => 10 ** x,
    fact: (x) => factorialSafe(x)
  };
}

function tokenizeForParser(raw) {
  const s = raw.replace(/\s+/g, "");
  const tokens = [];
  let i = 0;

  while (i < s.length) {
    const ch = s[i];

    if (/\d|\./.test(ch)) {
      let num = ch;
      i++;
      while (i < s.length && /[\d.]/.test(s[i])) {
        num += s[i];
        i++;
      }
      if ((num.match(/\./g) || []).length > 1) throw new Error("Invalid number");
      if (num === ".") throw new Error("Invalid number");
      tokens.push({ type: "number", value: Number(num) });
      continue;
    }

    if (ch === "π") {
      tokens.push({ type: "number", value: Math.PI });
      i++;
      continue;
    }

    if (ch === "e") {
      const prev = s[i - 1] || "";
      const next = s[i + 1] || "";
      if (!/[a-zA-Z]/.test(prev) && !/[a-zA-Z]/.test(next)) {
        tokens.push({ type: "number", value: Math.E });
        i++;
        continue;
      }
    }

    if (ch === "√") {
      tokens.push({ type: "func", value: "sqrt" });
      i++;
      continue;
    }

    if (ch === "∛") {
      tokens.push({ type: "func", value: "cbrt" });
      i++;
      continue;
    }

    if (/[a-zA-Z]/.test(ch)) {
      let name = ch;
      i++;
      while (i < s.length && /[a-zA-Z0-9]/.test(s[i])) {
        name += s[i];
        i++;
      }
      tokens.push({ type: "func", value: name });
      continue;
    }

    if ("+-*/^()%!,".includes(ch)) {
      tokens.push({ type: "symbol", value: ch });
      i++;
      continue;
    }

    throw new Error("Invalid character");
  }

  return tokens;
}

class Parser {
  constructor(tokens, fnScope) {
    this.tokens = tokens;
    this.pos = 0;
    this.fnScope = fnScope;
    // additive এর right side parse করার সময় true → % কে postfix এ consume করবে না
    this.skipPercentPostfix = false;
  }

  peek(offset = 0) {
    return this.tokens[this.pos + offset];
  }

  consume() {
    return this.tokens[this.pos++];
  }

  expect(type, value = null) {
    const token = this.peek();
    if (!token || token.type !== type || (value !== null && token.value !== value)) {
      throw new Error("Unexpected token");
    }
    return this.consume();
  }

  parse() {
    const value = this.parseAdditive();
    if (this.peek()) throw new Error("Unexpected trailing token");
    if (!Number.isFinite(value)) throw new Error("Invalid result");
    return value;
  }

  /*
   * PERCENT LOGIC:
   *   একা:        50%        = 0.5
   *   গুণ/ভাগ:    500000%2.5 = 500000 × (2.5/100) = 12500
   *   যোগ/বিয়োগ: 100+10%    = 100 + (100×10/100)  = 110
   *               200-50%    = 200 - (200×50/100)   = 100
   */
  parseAdditive() {
    let left = this.parseMul();

    while (true) {
      const token = this.peek();
      if (!token || token.type !== "symbol") break;
      if (token.value !== "+" && token.value !== "-") break;

      this.consume();
      const op = token.value;

      // right side এ % কে postfix এ consume করতে দেবো না
      this.skipPercentPostfix = true;
      const right = this.parseMul();
      this.skipPercentPostfix = false;

      // right এর পরে % আছে কিনা দেখো
      const pct = this.peek();
      if (pct && pct.type === "symbol" && pct.value === "%") {
        this.consume(); // % consume
        const amt = left * (right / 100);
        left = op === "+" ? left + amt : left - amt;
      } else {
        left = op === "+" ? left + right : left - right;
      }
    }

    return left;
  }

  parseMul() {
    let left = this.parsePower();

    while (true) {
      const token = this.peek();
      if (!token || token.type !== "symbol") break;

      // A%B multiplicative: 500000%2.5 = 500000*(2.5/100)
      if (token.value === "%") {
        const next = this.peek(1);
        if (
          next &&
          (next.type === "number" ||
            next.type === "func" ||
            (next.type === "symbol" && next.value === "("))
        ) {
          this.consume(); // % consume
          const right = this.parsePower();
          left = left * (right / 100);
          continue;
        }
        break;
      }

      if (token.value !== "*" && token.value !== "/") break;

      this.consume();
      const op = token.value;
      const right = this.parsePower();

      if (op === "*") {
        left *= right;
      } else {
        if (right === 0) throw new Error("Division by zero");
        left /= right;
      }
    }

    return left;
  }

  parsePower() {
    let left = this.parseUnary();
    const token = this.peek();

    if (token && token.type === "symbol" && token.value === "^") {
      this.consume();
      left = left ** this.parsePower(); // right-associative
    }

    return left;
  }

  parseUnary() {
    const token = this.peek();

    if (token && token.type === "symbol" && token.value === "+") {
      this.consume();
      return +this.parseUnary();
    }

    if (token && token.type === "symbol" && token.value === "-") {
      this.consume();
      return -this.parseUnary();
    }

    return this.parsePostfix();
  }

  parsePostfix() {
    let value = this.parsePrimary();

    while (true) {
      const token = this.peek();
      if (!token || token.type !== "symbol") break;

      if (token.value === "!") {
        this.consume();
        value = factorialSafe(value);
        continue;
      }

      if (token.value === "%") {
        // additive এর right side এ আছি → consume করো না, additive handle করবে
        if (this.skipPercentPostfix) break;
        // পরে number/func থাকলে parseMul এ handle হবে
        const next = this.peek(1);
        if (
          next &&
          (next.type === "number" ||
            next.type === "func" ||
            (next.type === "symbol" && next.value === "("))
        ) break;
        // একা % → /100
        this.consume();
        value = value / 100;
        continue;
      }

      break;
    }

    return value;
  }

  parsePrimary() {
    const token = this.peek();
    if (!token) throw new Error("Unexpected end");

    if (token.type === "number") {
      this.consume();
      return token.value;
    }

    if (token.type === "symbol" && token.value === "(") {
      this.consume();
      const value = this.parseAdditive();
      this.expect("symbol", ")");
      return value;
    }

    if (token.type === "func") {
      this.consume();
      const fnName = token.value;
      this.expect("symbol", "(");
      const arg = this.parseAdditive();
      this.expect("symbol", ")");

      const fn = this.fnScope[fnName];
      if (typeof fn !== "function") throw new Error("Unknown function");

      const out = fn(arg);
      if (!Number.isFinite(out) || Number.isNaN(out)) throw new Error("Invalid function result");
      return out;
    }

    throw new Error("Invalid primary");
  }
}

/* ===== FIX: sanitizeForPreview এ "−" যোগ করা হয়েছে ===== */
function sanitizeForPreview(raw) {
  let s = raw.trim();
  if (!s) return "";

  while (s.length) {
    const last = s[s.length - 1];
    // "−" (minus) যোগ করা হয়েছে
    if (["+", "−", "×", "÷", "^", ".", ","].includes(last)) {
      s = s.slice(0, -1).trim();
      continue;
    }
    break;
  }

  let balance = 0;
  for (const ch of s) {
    if (ch === "(") balance++;
    else if (ch === ")") balance--;
  }
  while (balance > 0 && s.length) {
    s = s.slice(0, -1).trim();
    balance = 0;
    for (const ch of s) {
      if (ch === "(") balance++;
      else if (ch === ")") balance--;
    }
  }

  return s;
}

function safeEval(text) {
  try {
    if (!text) return "";
    const normalized = normalizeBasic(text);
    const tokens = tokenizeForParser(normalized);
    const parser = new Parser(tokens, createFunctionScope());
    const out = parser.parse();

    if (!Number.isFinite(out) || Number.isNaN(out)) return null;
    return out;
  } catch (err) {
    console.log("Eval error:", err);
    return null;
  }
}

/* ===============================
   RESULT
================================*/
function updateResult() {
  const raw = expression.trim();

  if (!raw) {
    setResultText("0");
    lastValidResult = "0";
    return;
  }

  const previewExpr = sanitizeForPreview(raw);

  if (!previewExpr) {
    setResultText("0");
    return;
  }

  const out = safeEval(previewExpr);

  if (out === null) {
    setResultText("Error");
    return;
  }

  lastValidResult = formatResultNumber(out);
  setResultText(lastValidResult);
}

function finalAnswer() {
  const previewExpr = sanitizeForPreview(expression.trim());
  const out = safeEval(previewExpr);

  if (out === null || out === "") {
    setResultText("Error");
    return;
  }

  const formatted = formatResultNumber(out);

  // expression fade out করো
  if (exprView) {
    exprView.style.transition = "opacity 0.15s ease";
    exprView.style.opacity = "0";
  }

  setTimeout(() => {
    expression = String(out);
    cursorIndex = expression.length;
    lastValidResult = formatted;
    syncExpression();
    renderExpression("bottom");
    setResultText(formatted);

    // expression fade in করো
    if (exprView) {
      exprView.style.opacity = "1";
      setTimeout(() => {
        exprView.style.transition = "";
      }, 180);
    }
  }, 140);
}

/* ===============================
   THEME
================================*/
function setTheme(theme, save = true) {
  document.documentElement.classList.remove("theme-dark", "theme-light");
  document.documentElement.classList.add(theme);

  if (save) localStorage.setItem("calc_theme", theme);

  if (themeToggleBtn) {
    themeToggleBtn.textContent = theme === "theme-dark" ? "Light Mode" : "Dark Mode";
  }

  const themeColor = theme === "theme-dark" ? "#000000" : "#f5f7fb";
  const meta = document.getElementById("themeColorMeta");
  if (meta) meta.setAttribute("content", themeColor);

  document.documentElement.style.backgroundColor = themeColor;
  document.body.style.backgroundColor = themeColor;
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains("theme-dark");
  setTheme(isDark ? "theme-light" : "theme-dark", true);
  menuDropdown?.classList.remove("show");
  renderExpression("preserve");
}

/* ===============================
   MENU
================================*/
function toggleMenu() {
  menuDropdown?.classList.toggle("show");
}

function closeMenu() {
  menuDropdown?.classList.remove("show");
}

/* ===============================
   CURSOR TAP
================================*/
function setCursorFromPoint(event) {
  if (!exprView) return;

  const x = event.clientX;
  const y = event.clientY;

  let total = 0;
  let found = false;
  const walker = document.createTreeWalker(exprView, NodeFilter.SHOW_TEXT);

  if (document.caretPositionFromPoint) {
    const pos = document.caretPositionFromPoint(x, y);
    if (pos && pos.offsetNode && exprView.contains(pos.offsetNode)) {
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node === pos.offsetNode) {
          total += pos.offset;
          found = true;
          break;
        }
        total += node.textContent.length;
      }
    }
  } else if (document.caretRangeFromPoint) {
    const range = document.caretRangeFromPoint(x, y);
    if (range && range.startContainer && exprView.contains(range.startContainer)) {
      while (walker.nextNode()) {
        const node = walker.currentNode;
        if (node === range.startContainer) {
          total += range.startOffset;
          found = true;
          break;
        }
        total += node.textContent.length;
      }
    }
  }

  cursorIndex = found ? Math.max(0, Math.min(expression.length, total)) : expression.length;
  renderAfterTap();
}

/* ===============================
   COPY
================================*/
async function copyResult() {
  const value = result?.textContent.trim();
  if (!value || value === "Error") return;

  try {
    await navigator.clipboard.writeText(value);
    showToast("Copied");
  } catch {
    const temp = document.createElement("textarea");
    temp.value = value;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    document.body.removeChild(temp);
    showToast("Copied");
  }
}

/* ===============================
   HAPTIC
================================*/
function haptic() {
  // navigator.vibrate অনেক WebView এ কাজ করে না
  // CSS class দিয়ে visual + physical feel দেওয়া হচ্ছে
  try { if (navigator.vibrate) navigator.vibrate(6); } catch {}
}

/* ===============================
   EVENTS
================================*/
copyResultBtn?.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  haptic();
  copyResult();
});

copyResultBtn?.addEventListener("contextmenu", (e) => e.preventDefault());

menuBtn?.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  toggleMenu();
});

themeToggleBtn?.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  toggleTheme();
});

backspaceBtn?.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  haptic();
  backspaceAtCursor();
});

actionScientificBtn?.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  openScientificDrawer();
});

closeSciBtn?.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  closeScientificDrawer();
});

drawerCloseBottom?.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  closeScientificDrawer();
});

sciOverlay?.addEventListener("pointerdown", () => closeScientificDrawer());

invToggleBtn?.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  sciInvMode = !sciInvMode;
  updateSciButtons();
});

angleToggleBtn?.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  sciAngleMode = sciAngleMode === "deg" ? "rad" : "deg";
  updateSciButtons();
  updateResult();
});

document.addEventListener("pointerdown", (e) => {
  if (menuDropdown && menuBtn && !menuDropdown.contains(e.target) && !menuBtn.contains(e.target)) {
    closeMenu();
  }
});

document.addEventListener("contextmenu", (e) => {
  if (result?.contains(e.target) || copyResultBtn?.contains(e.target)) {
    e.preventDefault();
  }
});

exprView?.addEventListener("pointerdown", (e) => {
  if (e.pointerType === "mouse") {
    e.preventDefault();
    setCursorFromPoint(e);
    return;
  }

  clearTimeout(exprTouchTimer);
  exprTouchTimer = setTimeout(() => {
    try {
      setCursorFromPoint(e);
    } catch {}
  }, 180);
});

document.querySelectorAll(".grid .btn").forEach((btn) => {
  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    haptic();

    const insert = btn.dataset.insert;
    const action = btn.dataset.action;

    if (insert) {
      if (isOperator(insert)) insertOperator(insert);
      else insertAtCursor(insert);
      return;
    }

    if (action === "clear") clearAll();
    if (action === "bracket") smartBracket();
    if (action === "percent") insertPercent();
    if (action === "dot") insertDot();
    if (action === "equals") finalAnswer();
  });
});

document.querySelectorAll(".sci-btn[data-normal]").forEach((btn) => {
  btn.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    haptic();

    const value = sciInvMode ? (btn.dataset.inv || btn.dataset.normal) : btn.dataset.normal;
    if (!value) return;

    if (value === "!") {
      wrapCurrentOperand("fact(", ")");
      closeScientificDrawer();
      return;
    }

    if (value === "1/") {
      wrapCurrentOperand("1/(", ")");
      closeScientificDrawer();
      return;
    }

    if (value === "(") {
      insertAtCursor("(");
      insertAtCursor(")");
      cursorIndex -= 1;
      renderExpression("preserve");
      closeScientificDrawer();
      return;
    }

    if (value === "sq(") {
      wrapCurrentOperand("sq(", ")");
      closeScientificDrawer();
      return;
    }

    if (value === "cube(") {
      wrapCurrentOperand("cube(", ")");
      closeScientificDrawer();
      return;
    }

    if (value === "pow10(") {
      wrapCurrentOperand("pow10(", ")");
      closeScientificDrawer();
      return;
    }

    if (
      ["abs(", "1/abs(", "sin(", "cos(", "tan(", "asin(", "acos(", "atan(",
       "ln(", "log(", "exp(", "√(", "∛(", "sinh(", "cosh(", "tanh(",
       "asinh(", "acosh(", "atanh("].includes(value)
    ) {
      insertAtCursor(value);
      closeScientificDrawer();
      return;
    }

    if (isOperator(value)) insertOperator(value);
    else insertAtCursor(value);

    closeScientificDrawer();
  });
});

powerBtn?.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  insertOperator("^");
});

/* ===============================
   INIT
================================*/
const savedTheme = localStorage.getItem("calc_theme") || "theme-light";
setTheme(savedTheme, false);
renderExpression("preserve");
updateResult();
updateSciButtons();

requestAnimationFrame(() => {
  fitExpressionText();
  fitResultText();
});

window.addEventListener("resize", () => {
  fitExpressionText();
  fitResultText();
});
