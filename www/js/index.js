const exprWrap = document.getElementById("exprWrap");
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

/* App open করলে আগের typed number থাকবে না */
let expression = "";
try {
  localStorage.removeItem("calc_expression_live");
} catch (e) {}

let lastValidResult = "0";
let toastTimer = null;
let sciInvMode = false;
let sciAngleMode = "deg";
let backspaceLongTimer = null;

function syncExpression() {
  try {
    localStorage.removeItem("calc_expression_live");
  } catch (e) {}
}

function escapeHTML(text) {
  return String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* Number কাটাকাটি বন্ধ করার জন্য token span */
function buildExpressionHTML(text) {
  const s = String(text || "");

  if (!s) return "";

  let html = "";
  let i = 0;

  while (i < s.length) {
    const ch = s[i];

    if (/[0-9.]/.test(ch)) {
      let token = ch;
      i++;

      while (i < s.length && /[0-9.]/.test(s[i])) {
        token += s[i];
        i++;
      }

      html += '<span class="expr-num">' + escapeHTML(token) + "</span>";
      continue;
    }

    if (/[a-zA-Zπe√∛]/.test(ch)) {
      let token = ch;
      i++;

      while (i < s.length && /[a-zA-Z0-9πe√∛]/.test(s[i])) {
        token += s[i];
        i++;
      }

      html += '<span class="expr-fn">' + escapeHTML(token) + "</span>";
      continue;
    }

    if (isOperator(ch) || ch === "%" || ch === "!" || ch === "(" || ch === ")") {
      html += '<span class="expr-op">' + escapeHTML(ch) + "</span>";
      i++;
      continue;
    }

    html += escapeHTML(ch);
    i++;
  }

  return html;
}

function renderExpressionHTML() {
  if (!exprView) return;
  exprView.innerHTML = buildExpressionHTML(expression);
}

function showToast(message = "Copied") {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(function () {
    toast.classList.remove("show");
  }, 1400);
}

function haptic() {
  try {
    if (navigator.vibrate) navigator.vibrate(6);
  } catch (e) {}
}

function isOperator(ch) {
  return ["+", "−", "×", "÷", "^"].includes(ch);
}

function normalizeBasic(raw) {
  return String(raw || "")
    .replace(/[,，٬،]/g, "")
    .replace(/\s+/g, "")
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/−/g, "-");
}

function cleanPastedText(text) {
  return String(text || "")
    .replace(/[,，٬،]/g, "")
    .replace(/\s+/g, "")
    .replace(/\*/g, "×")
    .replace(/\//g, "÷")
    .replace(/-/g, "−")
    .replace(/[^0-9.+−×÷()^%πe!a-zA-Z√∛]/g, "");
}

function hideAndroidKeyboard() {
  try {
    if (!exprView) return;

    exprView.setAttribute("inputmode", "none");
    exprView.setAttribute("virtualkeyboardpolicy", "manual");

    if (navigator.virtualKeyboard) {
      navigator.virtualKeyboard.hide();
    }

    if (window.Keyboard && typeof window.Keyboard.hide === "function") {
      window.Keyboard.hide();
    }

    if (
      window.cordova &&
      window.cordova.plugins &&
      window.cordova.plugins.Keyboard &&
      typeof window.cordova.plugins.Keyboard.close === "function"
    ) {
      window.cordova.plugins.Keyboard.close();
    }
  } catch (e) {}
}

function focusInput() {
  if (!exprView) return;

  try {
    exprView.setAttribute("inputmode", "none");
    exprView.setAttribute("virtualkeyboardpolicy", "manual");
    exprView.focus({ preventScroll: true });

    hideAndroidKeyboard();
    setTimeout(hideAndroidKeyboard, 20);
    setTimeout(hideAndroidKeyboard, 80);
  } catch (e) {}
}

function updateInputVerticalPosition() {
  if (!exprView) return;

  const boxHeight = exprView.clientHeight || 0;
  if (boxHeight <= 0) return;

  if (!expression || expression.length === 0) {
    exprView.style.paddingTop = Math.floor(boxHeight * 0.42) + "px";
    return;
  }

  if (expression.length <= 12) {
    exprView.style.paddingTop = Math.floor(boxHeight * 0.36) + "px";
    return;
  }

  if (expression.length <= 24) {
    exprView.style.paddingTop = Math.floor(boxHeight * 0.20) + "px";
    return;
  }

  exprView.style.paddingTop = "0px";
}

function scrollInputToBottom() {
  if (!exprView) return;

  requestAnimationFrame(function () {
    const maxScroll = exprView.scrollHeight - exprView.clientHeight;
    exprView.scrollTop = Math.max(0, maxScroll);
  });
}

function scrollCaretIntoView() {
  if (!exprView) return;

  requestAnimationFrame(function () {
    const sel = window.getSelection();

    if (!sel || sel.rangeCount === 0) return;

    const range = sel.getRangeAt(0);

    if (!exprView.contains(range.startContainer)) return;

    const rect = range.getBoundingClientRect();
    const box = exprView.getBoundingClientRect();

    if (rect.top < box.top + 10) {
      exprView.scrollTop -= box.top - rect.top + 24;
    } else if (rect.bottom > box.bottom - 10) {
      exprView.scrollTop += rect.bottom - box.bottom + 24;
    }
  });
}

function keepSameScroll(scrollTop, scrollLeft = 0) {
  if (!exprView) return;

  requestAnimationFrame(function () {
    exprView.scrollTop = scrollTop;
    exprView.scrollLeft = scrollLeft;

    setTimeout(function () {
      exprView.scrollTop = scrollTop;
      exprView.scrollLeft = scrollLeft;
    }, 0);

    setTimeout(function () {
      exprView.scrollTop = scrollTop;
      exprView.scrollLeft = scrollLeft;
    }, 40);

    setTimeout(function () {
      exprView.scrollTop = scrollTop;
      exprView.scrollLeft = scrollLeft;
    }, 120);

    setTimeout(function () {
      exprView.scrollTop = scrollTop;
      exprView.scrollLeft = scrollLeft;
    }, 220);
  });
}

function updateExpressionFromDom() {
  if (!exprView) return;

  const oldScrollTop = exprView.scrollTop;
  const oldScrollLeft = exprView.scrollLeft;
  const sel = getSelectionInfo();

  expression = cleanPastedText(exprView.textContent || "");

  renderExpressionHTML();
  syncExpression();
  updateResult();
  fitExpressionText();

  setCaretByIndex(Math.min(sel.start, expression.length), oldScrollTop, oldScrollLeft);
  keepSameScroll(oldScrollTop, oldScrollLeft);
  hideAndroidKeyboard();
}

function setInputText(text, moveEnd = true) {
  if (!exprView) return;

  expression = cleanPastedText(text);
  renderExpressionHTML();

  syncExpression();
  updateResult();
  fitExpressionText();

  if (moveEnd && expression.length > 0) {
    moveCursorToEnd();
    scrollInputToBottom();
  } else {
    exprView.scrollTop = 0;

    setTimeout(function () {
      focusInput();
      moveCursorToEnd();
      updateInputVerticalPosition();
      hideAndroidKeyboard();
    }, 120);
  }

  hideAndroidKeyboard();
}

function moveCursorToEnd() {
  if (!exprView) return;

  focusInput();

  const range = document.createRange();
  range.selectNodeContents(exprView);
  range.collapse(false);

  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  hideAndroidKeyboard();
}

function getSelectionInfo() {
  const sel = window.getSelection();

  if (!sel || sel.rangeCount === 0 || !exprView || !exprView.contains(sel.anchorNode)) {
    return {
      start: expression.length,
      end: expression.length,
      selected: false
    };
  }

  const range = sel.getRangeAt(0);

  const preStart = document.createRange();
  preStart.selectNodeContents(exprView);
  preStart.setEnd(range.startContainer, range.startOffset);

  const preEnd = document.createRange();
  preEnd.selectNodeContents(exprView);
  preEnd.setEnd(range.endContainer, range.endOffset);

  const start = preStart.toString().length;
  const end = preEnd.toString().length;

  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
    selected: start !== end
  };
}

function setCaretByIndex(index, keepScrollTop = null, keepScrollLeft = 0) {
  if (!exprView) return;

  const oldScrollTop = keepScrollTop !== null ? keepScrollTop : exprView.scrollTop;
  const oldScrollLeft = keepScrollLeft || 0;

  try {
    exprView.setAttribute("inputmode", "none");
    exprView.setAttribute("virtualkeyboardpolicy", "manual");
    exprView.focus({ preventScroll: true });
  } catch (e) {}

  const safeIndex = Math.max(0, Math.min(index, expression.length));
  const walker = document.createTreeWalker(exprView, NodeFilter.SHOW_TEXT);

  let node = walker.nextNode();

  if (!node) {
    exprView.innerHTML = "";
    node = document.createTextNode("");
    exprView.appendChild(node);
  }

  let remaining = safeIndex;

  while (node) {
    const len = node.nodeValue.length;

    if (remaining <= len) {
      const range = document.createRange();
      range.setStart(node, remaining);
      range.collapse(true);

      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      if (keepScrollTop !== null) {
        keepSameScroll(oldScrollTop, oldScrollLeft);
      }

      hideAndroidKeyboard();
      return;
    }

    remaining -= len;
    node = walker.nextNode();
  }

  moveCursorToEnd();

  if (keepScrollTop !== null) {
    keepSameScroll(oldScrollTop, oldScrollLeft);
  }

  hideAndroidKeyboard();
}

function replaceRange(start, end, text, keepScroll = true) {
  if (!exprView) return;

  const oldScrollTop = exprView.scrollTop;
  const oldScrollLeft = exprView.scrollLeft;
  const hadSelection = start !== end;

  expression = expression.slice(0, start) + text + expression.slice(end);
  renderExpressionHTML();

  const caret = start + text.length;

  syncExpression();
  updateResult();
  fitExpressionText();

  if (keepScroll || hadSelection) {
    setCaretByIndex(caret, oldScrollTop, oldScrollLeft);
    keepSameScroll(oldScrollTop, oldScrollLeft);
  } else {
    setCaretByIndex(caret);
    scrollCaretIntoView();
  }

  hideAndroidKeyboard();
}

function insertAtCursor(text) {
  const sel = getSelectionInfo();
  replaceRange(sel.start, sel.end, text, false);
}

function deleteBeforeCursor() {
  const sel = getSelectionInfo();

  if (sel.selected) {
    replaceRange(sel.start, sel.end, "", true);
    return;
  }

  if (sel.start <= 0) return;

  const tokens = [
    "asinh(", "acosh(", "atanh(",
    "asin(", "acos(", "atan(",
    "sinh(", "cosh(", "tanh(",
    "pow10(", "cube(",
    "sin(", "cos(", "tan(",
    "log(", "abs(", "exp(", "ln(", "sq(",
    "√(", "∛("
  ];

  for (const token of tokens) {
    const before = expression.slice(0, sel.start);

    if (before.endsWith(token)) {
      replaceRange(sel.start - token.length, sel.start, "", true);
      return;
    }
  }

  replaceRange(sel.start - 1, sel.start, "", true);
}

function selectAllInput() {
  if (!exprView) return;

  focusInput();

  const range = document.createRange();
  range.selectNodeContents(exprView);

  const sel = window.getSelection();
  sel.removeAllRanges();
  sel.addRange(range);

  hideAndroidKeyboard();
}

function openScientificDrawer() {
  sciDrawer?.classList.add("show");
  sciOverlay?.classList.add("show");
  hideAndroidKeyboard();
}

function closeScientificDrawer() {
  sciDrawer?.classList.remove("show");
  sciOverlay?.classList.remove("show");
  hideAndroidKeyboard();
}

function updateSciButtons() {
  document.querySelectorAll(".sci-btn[data-normal]").forEach(function (btn) {
    const current = sciInvMode ? (btn.dataset.inv || btn.dataset.normal) : btn.dataset.normal;

    const labelMap = {
      "sin(": "sin",
      "asin(": "sin⁻¹",
      "cos(": "cos",
      "acos(": "cos⁻¹",
      "tan(": "tan",
      "atan(": "tan⁻¹",
      "π": "π",
      "e": "e",
      "ln(": "ln",
      "exp(": "eˣ",
      "log(": "log",
      "pow10(": "10ˣ",
      "√(": "√",
      "∛(": "∛",
      "^": "xʸ",
      "(": "( )",
      "abs(": "abs",
      "1/abs(": "1/abs",
      "1/": "1/x",
      "%": "%",
      "sinh(": "sinh",
      "asinh(": "sinh⁻¹",
      "cosh(": "cosh",
      "acosh(": "cosh⁻¹",
      "tanh(": "tanh",
      "atanh(": "tanh⁻¹",
      "!": "x!",
      "sq(": "x²",
      "cube(": "x³",
      "00": "00"
    };

    btn.textContent = labelMap[current] || current;
  });

  if (invToggleBtn) invToggleBtn.classList.toggle("active", sciInvMode);

  if (angleToggleBtn) {
    angleToggleBtn.classList.toggle("active", sciAngleMode === "rad");
    angleToggleBtn.textContent = sciAngleMode === "deg" ? "DEG" : "RAD";
  }
}

function fitExpressionText() {
  if (!exprView) return;

  const len = expression.length;

  if (len <= 8) {
    exprView.style.fontSize = "39px";
  } else if (len <= 15) {
    exprView.style.fontSize = "34px";
  } else {
    exprView.style.fontSize = "24px";
  }

  updateInputVerticalPosition();
}

function fitResultText() {
  if (!result) return;

  const text = result.textContent || "";

  if (text === "0" || text === "") {
    result.style.fontSize = "35px";
    return;
  }

  const maxSize = 35;
  const minSize = 5;

  result.style.fontSize = maxSize + "px";

  for (let size = maxSize; size >= minSize; size -= 1) {
    result.style.fontSize = size + "px";

    if (result.scrollWidth <= result.clientWidth) {
      break;
    }
  }
}

function setResultText(value) {
  if (!result) return;

  if (result.textContent === value) return;

  result.textContent = value;
  requestAnimationFrame(fitResultText);
}

function insertOperator(op) {
  const sel = getSelectionInfo();

  if (sel.selected) {
    insertAtCursor(op);
    return;
  }

  if (!expression) {
    if (op === "−") insertAtCursor("−");
    return;
  }

  const pos = sel.start;
  const prev = expression[pos - 1] || "";
  const next = expression[pos] || "";

  if (isOperator(prev)) {
    replaceRange(pos - 1, pos, op, false);
    return;
  }

  if (prev === "(" && op !== "−") return;

  if (isOperator(next)) {
    replaceRange(pos, pos + 1, op, false);
    return;
  }

  insertAtCursor(op);
}

function getCurrentNumberSegmentLeft() {
  const sel = getSelectionInfo();
  const left = expression.slice(0, sel.start);
  const match = left.match(/(?:^|[+\−×÷^%(])(\d*\.?\d*)$/);
  return match ? match[1] : "";
}

function insertDot() {
  const sel = getSelectionInfo();
  const prev = expression[sel.start - 1] || "";
  const currentNum = getCurrentNumberSegmentLeft();

  if (currentNum.includes(".")) return;

  if (!expression || isOperator(prev) || prev === "(" || prev === "%" || prev === ",") {
    insertAtCursor("0.");
    return;
  }

  if (prev === ")") return;

  insertAtCursor(".");
}

function insertPercent() {
  const sel = getSelectionInfo();
  const prev = expression[sel.start - 1] || "";

  if (!prev || isOperator(prev) || prev === "(" || prev === "." || prev === "%" || prev === ",") {
    return;
  }

  insertAtCursor("%");
}

function smartBracket() {
  const sel = getSelectionInfo();
  const left = expression.slice(0, sel.start);
  const open = (left.match(/\(/g) || []).length;
  const close = (left.match(/\)/g) || []).length;
  const prev = expression[sel.start - 1] || "";

  if (!expression || isOperator(prev) || prev === "(" || prev === ",") {
    insertAtCursor("(");
  } else if (open > close && !isOperator(prev) && prev !== "(") {
    insertAtCursor(")");
  } else {
    insertAtCursor("(");
  }
}

function clearAll() {
  expression = "";
  renderExpressionHTML();

  if (result) {
    result.textContent = "0";
    result.classList.remove("error");
  }

  lastValidResult = "0";
  syncExpression();
  fitExpressionText();
  focusInput();

  requestAnimationFrame(function () {
    exprView.scrollTop = 0;
    moveCursorToEnd();
    updateInputVerticalPosition();
  });

  hideAndroidKeyboard();
}

function wrapCurrentOperand(prefix, suffix = ")") {
  const sel = getSelectionInfo();

  if (sel.selected) {
    replaceRange(sel.start, sel.end, prefix + expression.slice(sel.start, sel.end) + suffix, true);
    return;
  }

  const index = sel.start;

  if (!expression) {
    insertAtCursor(prefix + suffix);
    setCaretByIndex(prefix.length);
    return;
  }

  let start = index;

  if (index > 0 && expression[index - 1] === ")") {
    let depth = 0;

    for (let i = index - 1; i >= 0; i--) {
      if (expression[i] === ")") depth++;
      else if (expression[i] === "(") {
        depth--;

        if (depth === 0) {
          start = i;

          while (start > 0 && /[a-zA-Z√∛]/.test(expression[start - 1])) {
            start--;
          }

          replaceRange(start, index, prefix + expression.slice(start, index) + suffix, true);
          return;
        }
      }
    }
  }

  while (start > 0) {
    const ch = expression[start - 1];

    if (isOperator(ch) || ch === "(" || ch === ",") {
      break;
    }

    start--;
  }

  if (start === index) {
    insertAtCursor(prefix + suffix);
    setCaretByIndex(index + prefix.length);
    return;
  }

  replaceRange(start, index, prefix + expression.slice(start, index) + suffix, true);
}

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

function factorialSafe(n) {
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 0) {
    throw new Error("Invalid factorial");
  }

  if (n > 170) {
    throw new Error("Factorial too large");
  }

  let out = 1;

  for (let i = 2; i <= n; i++) {
    out *= i;
  }

  return out;
}

function createFunctionScope() {
  const toRad = function (x) {
    return x * Math.PI / 180;
  };

  const toDeg = function (x) {
    return x * 180 / Math.PI;
  };

  return {
    sin: sciAngleMode === "deg" ? function (x) { return Math.sin(toRad(x)); } : function (x) { return Math.sin(x); },
    cos: sciAngleMode === "deg" ? function (x) { return Math.cos(toRad(x)); } : function (x) { return Math.cos(x); },
    tan: sciAngleMode === "deg" ? function (x) { return Math.tan(toRad(x)); } : function (x) { return Math.tan(x); },
    asin: sciAngleMode === "deg" ? function (x) { return toDeg(Math.asin(x)); } : function (x) { return Math.asin(x); },
    acos: sciAngleMode === "deg" ? function (x) { return toDeg(Math.acos(x)); } : function (x) { return Math.acos(x); },
    atan: sciAngleMode === "deg" ? function (x) { return toDeg(Math.atan(x)); } : function (x) { return Math.atan(x); },
    sinh: function (x) { return Math.sinh(x); },
    cosh: function (x) { return Math.cosh(x); },
    tanh: function (x) { return Math.tanh(x); },
    asinh: function (x) { return Math.asinh(x); },
    acosh: function (x) { return Math.acosh(x); },
    atanh: function (x) { return Math.atanh(x); },
    sqrt: function (x) { return Math.sqrt(x); },
    cbrt: function (x) { return Math.cbrt(x); },
    abs: function (x) { return Math.abs(x); },
    exp: function (x) { return Math.exp(x); },
    log: function (x) { return Math.log10(x); },
    ln: function (x) { return Math.log(x); },
    sq: function (x) { return x * x; },
    cube: function (x) { return x * x * x; },
    pow10: function (x) { return 10 ** x; },
    fact: function (x) { return factorialSafe(x); }
  };
}

function tokenizeForParser(raw) {
  const s = String(raw || "")
    .replace(/[,，٬،]/g, "")
    .replace(/\s+/g, "");

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

      tokens.push({
        type: "number",
        value: Number(num)
      });

      continue;
    }

    if (ch === "π") {
      tokens.push({
        type: "number",
        value: Math.PI
      });

      i++;
      continue;
    }

    if (ch === "e") {
      const prev = s[i - 1] || "";
      const next = s[i + 1] || "";

      if (!/[a-zA-Z]/.test(prev) && !/[a-zA-Z]/.test(next)) {
        tokens.push({
          type: "number",
          value: Math.E
        });

        i++;
        continue;
      }
    }

    if (ch === "√") {
      tokens.push({
        type: "func",
        value: "sqrt"
      });

      i++;
      continue;
    }

    if (ch === "∛") {
      tokens.push({
        type: "func",
        value: "cbrt"
      });

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

      tokens.push({
        type: "func",
        value: name
      });

      continue;
    }

    if ("+-*/^()%!,".includes(ch)) {
      tokens.push({
        type: "symbol",
        value: ch
      });

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

    if (this.peek()) {
      throw new Error("Unexpected trailing token");
    }

    if (!Number.isFinite(value)) {
      throw new Error("Invalid result");
    }

    return value;
  }

  parseAdditive() {
    let left = this.parseMul();

    while (true) {
      const token = this.peek();

      if (!token || token.type !== "symbol") break;
      if (token.value !== "+" && token.value !== "-") break;

      this.consume();

      const op = token.value;

      this.skipPercentPostfix = true;
      const right = this.parseMul();
      this.skipPercentPostfix = false;

      const pct = this.peek();

      if (pct && pct.type === "symbol" && pct.value === "%") {
        this.consume();

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

      if (token.value === "%") {
        const next = this.peek(1);

        if (
          next &&
          (
            next.type === "number" ||
            next.type === "func" ||
            (next.type === "symbol" && next.value === "(")
          )
        ) {
          this.consume();

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
      left = left ** this.parsePower();
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
        if (this.skipPercentPostfix) break;

        const next = this.peek(1);

        if (
          next &&
          (
            next.type === "number" ||
            next.type === "func" ||
            (next.type === "symbol" && next.value === "(")
          )
        ) {
          break;
        }

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

      if (!Number.isFinite(out) || Number.isNaN(out)) {
        throw new Error("Invalid function result");
      }

      return out;
    }

    throw new Error("Invalid primary");
  }
}

function sanitizeForPreview(raw) {
  let s = String(raw || "")
    .replace(/[,，٬،]/g, "")
    .replace(/\s+/g, "")
    .trim();

  if (!s) return "";

  while (s.length) {
    const last = s[s.length - 1];

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

    if (!Number.isFinite(out) || Number.isNaN(out)) {
      return null;
    }

    return out;
  } catch (err) {
    console.log("Eval error:", err);
    return null;
  }
}

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

  if (exprView) {
    exprView.style.transition = "opacity 0.15s ease";
    exprView.style.opacity = "0";
  }

  setTimeout(function () {
    setInputText(String(out), true);
    lastValidResult = formatted;
    setResultText(formatted);

    if (exprView) {
      exprView.style.opacity = "1";

      setTimeout(function () {
        exprView.style.transition = "";
      }, 180);
    }
  }, 140);
}

function setTheme(theme, save = true) {
  document.documentElement.classList.remove("theme-dark", "theme-light");
  document.documentElement.classList.add(theme);

  if (save) {
    localStorage.setItem("calc_theme", theme);
  }

  if (themeToggleBtn) {
    themeToggleBtn.textContent = theme === "theme-dark" ? "Light Mode" : "Dark Mode";
  }

  const isLight = theme !== "theme-dark";
  const themeColor = isLight ? "#f5f7fb" : "#000000";

  const meta = document.getElementById("themeColorMeta");

  if (meta) {
    meta.setAttribute("content", themeColor);
  }

  document.documentElement.style.backgroundColor = themeColor;
  document.body.style.backgroundColor = themeColor;

  if (window.StatusBar) {
    StatusBar.backgroundColorByHexString(themeColor);

    if (isLight) {
      StatusBar.styleDefault();
    } else {
      StatusBar.styleLightContent();
    }
  }

  if (window.NavigationBar) {
    NavigationBar.backgroundColorByHexString(themeColor, isLight);
  }
}

function toggleTheme() {
  const isDark = document.documentElement.classList.contains("theme-dark");

  setTheme(isDark ? "theme-light" : "theme-dark", true);

  menuDropdown?.classList.remove("show");
  hideAndroidKeyboard();
}

function toggleMenu() {
  menuDropdown?.classList.toggle("show");
  hideAndroidKeyboard();
}

function closeMenu() {
  menuDropdown?.classList.remove("show");
}

async function copyResult() {
  const value = result?.textContent.trim();

  if (!value || value === "Error") return;

  try {
    await navigator.clipboard.writeText(value);
  } catch (e) {
    const temp = document.createElement("textarea");
    temp.value = value;
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    document.body.removeChild(temp);
  }

  copyResultBtn?.classList.remove("copied");
  void copyResultBtn?.offsetWidth;
  copyResultBtn?.classList.add("copied");

  setTimeout(function () {
    copyResultBtn?.classList.remove("copied");
  }, 150);

  showToast("Copied Amount: " + value);
  hideAndroidKeyboard();
}

exprView?.addEventListener("input", function () {
  updateExpressionFromDom();
  hideAndroidKeyboard();
});

exprView?.addEventListener("focus", function () {
  hideAndroidKeyboard();
  setTimeout(hideAndroidKeyboard, 50);
  setTimeout(hideAndroidKeyboard, 150);
});

exprView?.addEventListener("pointerdown", function () {
  hideAndroidKeyboard();
  setTimeout(hideAndroidKeyboard, 50);
});

exprView?.addEventListener("touchstart", function () {
  hideAndroidKeyboard();
  setTimeout(hideAndroidKeyboard, 50);
}, { passive:true });

exprView?.addEventListener("paste", function (e) {
  e.preventDefault();

  const pastedText = (e.clipboardData || window.clipboardData).getData("text");

  insertAtCursor(cleanPastedText(pastedText));
  hideAndroidKeyboard();
});

exprView?.addEventListener("keydown", function (e) {
  hideAndroidKeyboard();

  if (e.ctrlKey || e.metaKey) return;

  const allowed = [
    "ArrowLeft",
    "ArrowRight",
    "ArrowUp",
    "ArrowDown",
    "Backspace",
    "Delete",
    "Home",
    "End",
    "Tab"
  ];

  if (allowed.includes(e.key)) {
    if (e.key === "Backspace") {
      e.preventDefault();
      deleteBeforeCursor();
    }

    if (e.key === "Delete") {
      e.preventDefault();

      const sel = getSelectionInfo();

      if (sel.selected) {
        replaceRange(sel.start, sel.end, "", true);
      } else if (sel.start < expression.length) {
        replaceRange(sel.start, sel.start + 1, "", true);
      }
    }

    return;
  }

  if (/^[0-9.]$/.test(e.key)) return;
  if (["+", "-", "*", "/", "(", ")", "^", "%"].includes(e.key)) return;

  e.preventDefault();
});

exprView?.addEventListener("keyup", function () {
  updateExpressionFromDom();
  hideAndroidKeyboard();
});

exprView?.addEventListener("dblclick", function () {
  selectAllInput();
  hideAndroidKeyboard();
});

exprView?.addEventListener("scroll", function () {
  /* Manual scroll allowed */
});

document.querySelector(".copy-icon")?.addEventListener("pointerdown", function (e) {
  e.stopPropagation();
  haptic();
  copyResult();
  hideAndroidKeyboard();
});

menuBtn?.addEventListener("pointerdown", function (e) {
  e.preventDefault();
  toggleMenu();
  hideAndroidKeyboard();
});

themeToggleBtn?.addEventListener("pointerdown", function (e) {
  e.preventDefault();
  toggleTheme();
  hideAndroidKeyboard();
});

backspaceBtn?.addEventListener("pointerdown", function (e) {
  e.preventDefault();
  e.stopPropagation();
  haptic();

  hideAndroidKeyboard();
  deleteBeforeCursor();

  backspaceLongTimer = setTimeout(function () {
    haptic();
    clearAll();
    hideAndroidKeyboard();
  }, 600);
});

backspaceBtn?.addEventListener("pointerup", function () {
  clearTimeout(backspaceLongTimer);
  hideAndroidKeyboard();
});

backspaceBtn?.addEventListener("pointerleave", function () {
  clearTimeout(backspaceLongTimer);
  hideAndroidKeyboard();
});

actionScientificBtn?.addEventListener("pointerdown", function (e) {
  e.preventDefault();
  openScientificDrawer();
  hideAndroidKeyboard();
});

closeSciBtn?.addEventListener("pointerdown", function (e) {
  e.preventDefault();
  closeScientificDrawer();
  hideAndroidKeyboard();
});

drawerCloseBottom?.addEventListener("pointerdown", function (e) {
  e.preventDefault();
  closeScientificDrawer();
  hideAndroidKeyboard();
});

sciOverlay?.addEventListener("pointerdown", function () {
  closeScientificDrawer();
  hideAndroidKeyboard();
});

invToggleBtn?.addEventListener("pointerdown", function (e) {
  e.preventDefault();
  sciInvMode = !sciInvMode;
  updateSciButtons();
  hideAndroidKeyboard();
});

angleToggleBtn?.addEventListener("pointerdown", function (e) {
  e.preventDefault();
  sciAngleMode = sciAngleMode === "deg" ? "rad" : "deg";
  updateSciButtons();
  updateResult();
  hideAndroidKeyboard();
});

document.addEventListener("pointerdown", function (e) {
  if (
    menuDropdown &&
    menuBtn &&
    !menuDropdown.contains(e.target) &&
    !menuBtn.contains(e.target)
  ) {
    closeMenu();
  }

  hideAndroidKeyboard();
});

document.querySelectorAll(".grid .btn").forEach(function (btn) {
  btn.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    haptic();

    hideAndroidKeyboard();

    const insert = btn.dataset.insert;
    const action = btn.dataset.action;

    if (insert) {
      if (isOperator(insert)) {
        insertOperator(insert);
      } else {
        insertAtCursor(insert);
      }

      hideAndroidKeyboard();
      return;
    }

    if (action === "clear") clearAll();
    if (action === "bracket") smartBracket();
    if (action === "percent") insertPercent();
    if (action === "dot") insertDot();
    if (action === "equals") finalAnswer();

    hideAndroidKeyboard();
  });
});

document.querySelectorAll(".sci-btn[data-normal]").forEach(function (btn) {
  btn.addEventListener("pointerdown", function (e) {
    e.preventDefault();
    haptic();

    hideAndroidKeyboard();

    const value = sciInvMode ? (btn.dataset.inv || btn.dataset.normal) : btn.dataset.normal;

    if (!value) return;

    if (value === "!") {
      wrapCurrentOperand("fact(", ")");
      closeScientificDrawer();
      hideAndroidKeyboard();
      return;
    }

    if (value === "1/") {
      wrapCurrentOperand("1/(", ")");
      closeScientificDrawer();
      hideAndroidKeyboard();
      return;
    }

    if (value === "(") {
      insertAtCursor("(");
      closeScientificDrawer();
      hideAndroidKeyboard();
      return;
    }

    if (value === "sq(") {
      wrapCurrentOperand("sq(", ")");
      closeScientificDrawer();
      hideAndroidKeyboard();
      return;
    }

    if (value === "cube(") {
      wrapCurrentOperand("cube(", ")");
      closeScientificDrawer();
      hideAndroidKeyboard();
      return;
    }

    if (value === "pow10(") {
      wrapCurrentOperand("pow10(", ")");
      closeScientificDrawer();
      hideAndroidKeyboard();
      return;
    }

    if (
      [
        "abs(",
        "1/abs(",
        "sin(",
        "cos(",
        "tan(",
        "asin(",
        "acos(",
        "atan(",
        "ln(",
        "log(",
        "exp(",
        "√(",
        "∛(",
        "sinh(",
        "cosh(",
        "tanh(",
        "asinh(",
        "acosh(",
        "atanh("
      ].includes(value)
    ) {
      insertAtCursor(value);
      closeScientificDrawer();
      hideAndroidKeyboard();
      return;
    }

    if (isOperator(value)) {
      insertOperator(value);
    } else {
      insertAtCursor(value);
    }

    closeScientificDrawer();
    hideAndroidKeyboard();
  });
});

powerBtn?.addEventListener("pointerdown", function (e) {
  e.preventDefault();

  hideAndroidKeyboard();
  insertOperator("^");
  hideAndroidKeyboard();
});

const savedTheme = localStorage.getItem("calc_theme") || "theme-light";

setTheme(savedTheme, false);
setInputText("", false);
updateSciButtons();

requestAnimationFrame(function () {
  fitExpressionText();
  fitResultText();
  updateInputVerticalPosition();
  hideAndroidKeyboard();
});

setTimeout(function () {
  focusInput();
  moveCursorToEnd();
  updateInputVerticalPosition();
  hideAndroidKeyboard();
}, 120);

setTimeout(function () {
  focusInput();
  moveCursorToEnd();
  updateInputVerticalPosition();
  hideAndroidKeyboard();
}, 450);

setTimeout(hideAndroidKeyboard, 900);

window.addEventListener("resize", function () {
  fitExpressionText();
  fitResultText();
  updateInputVerticalPosition();
  hideAndroidKeyboard();
});

document.addEventListener("visibilitychange", function () {
  if (!document.hidden) {
    setTimeout(function () {
      focusInput();
      moveCursorToEnd();
      updateInputVerticalPosition();
      hideAndroidKeyboard();
    }, 120);

    setTimeout(hideAndroidKeyboard, 250);
    setTimeout(hideAndroidKeyboard, 600);
  }
});

document.addEventListener("resume", function () {
  setTimeout(function () {
    focusInput();
    moveCursorToEnd();
    updateInputVerticalPosition();
    hideAndroidKeyboard();
  }, 120);

  setTimeout(hideAndroidKeyboard, 250);
  setTimeout(hideAndroidKeyboard, 600);
}, false);

document.addEventListener("deviceready", function () {
  const saved = localStorage.getItem("calc_theme") || "theme-light";
  setTheme(saved, false);

  setTimeout(function () {
    focusInput();
    moveCursorToEnd();
    updateInputVerticalPosition();
    hideAndroidKeyboard();
  }, 120);

  setTimeout(hideAndroidKeyboard, 250);
  setTimeout(hideAndroidKeyboard, 700);
}, false);
