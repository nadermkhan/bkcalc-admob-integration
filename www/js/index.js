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
let lastValidResult = "0";
let toastTimer = null;

let sciInvMode = false;
let sciAngleMode = "deg";

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

  if (tokens.length === 0) {
    return `<div class="expr-line">&#8203;</div>`;
  }

  let html = "";
  for (const token of tokens) {
    if (/[+\-×÷]/.test(token.text)) {
      html += `<span class="operator-token">${escapeHtml(token.text)}</span>`;
    } else {
      html += `<span>${escapeHtml(token.text)}</span>`;
    }
  }

  return `<div class="expr-line">${html}</div>`;
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
}

function renderExpression(mode = "preserve") {
  if (!exprView) return;
  const previousScrollTop = exprView.scrollTop;
  fitExpressionText();
  exprView.innerHTML = buildExpressionHTML();
  requestAnimationFrame(() => {
    exprView.scrollTop = mode === "bottom" ? exprView.scrollHeight : previousScrollTop;
    moveCaretToEnd();
  });
}

function moveCaretToEnd() {
  if (!exprView) return;
  
  // Create a range that selects the contents of our math view
  const range = document.createRange();
  const selection = window.getSelection();
  
  range.selectNodeContents(exprView);
  // collapse(false) means "collapse the selection to the END of the range"
  range.collapse(false); 
  
  // Apply the new cursor position
  selection.removeAllRanges();
  selection.addRange(range);
}

function renderAfterEdit() {
  syncExpression();
  updateResult();
  renderExpression("preserve");
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
  const maxSize = 35;
  const minSize = 5;
  const step = 1;
  result.style.fontSize = maxSize + "px";
  for (let size = maxSize; size >= minSize; size -= step) {
    result.style.fontSize = size + "px";
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
function clearIfSelected() {
  const selection = window.getSelection();
  // Check if the user has highlighted text in the calculator
  if (selection.toString().trim().length > 0) {
    expression = ""; // Erase the old equation
    selection.removeAllRanges(); // Dismiss the native OS highlight
  }
}

function insertAtCursor(text) {
  clearIfSelected();
  expression += text;
  renderAfterEdit();
}

function insertOperator(op) {
  if (!expression) {
    if (op === "−") insertAtCursor("−");
    return;
  }
  const prev = expression.slice(-1);
  if (isOperator(prev)) {
    expression = expression.slice(0, -1) + op;
    renderAfterEdit();
    return;
  }
  if (prev === "(" && op !== "−") return;
  insertAtCursor(op);
}

function getCurrentNumberSegmentLeft() {
  const match = expression.match(/(?:^|[+\−×÷^%(,])(\d*\.?\d*)$/);
  return match ? match[1] : "";
}

function insertDot() {
  const prev = expression.slice(-1);
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
  const prev = expression.slice(-1);
  if (!prev || isOperator(prev) || prev === "(" || prev === "." || prev === "%" || prev === ",") return;
  insertAtCursor("%");
}

function smartBracket() {
  const open = (expression.match(/\(/g) || []).length;
  const close = (expression.match(/\)/g) || []).length;
  const prev = expression.slice(-1);

  if (!expression || isOperator(prev) || prev === "(" || prev === ",") {
    insertAtCursor("(");
  } else if (open > close && !isOperator(prev) && prev !== "(") {
    insertAtCursor(")");
  } else {
    insertAtCursor("(");
  }
}

function backspaceAtCursor() {
  if (expression.length === 0) return;

  const multiCharTokens = [
    "asinh(", "acosh(", "atanh(",
    "asin(", "acos(", "atan(",
    "sinh(", "cosh(", "tanh(",
    "sin(", "cos(", "tan(",
    "pow10(", "cube(", "log(",
    "abs(", "exp(", "ln(", "sq(",
    "√(", "∛(", "0"
  ];

  for (const token of multiCharTokens) {
    if (expression.endsWith(token)) {
      expression = expression.slice(0, -token.length);
      renderAfterEdit();
      return;
    }
  }

  expression = expression.slice(0, -1);
  renderAfterEdit();
}

function clearAll() {
  expression = "";
  if (result) {
    result.textContent = "0";
    result.classList.remove("error");
  }
  lastValidResult = "0";
  syncExpression();
  renderExpression("preserve");
}

/* ===============================
   OPERAND WRAP
================================*/
function wrapCurrentOperand(prefix, suffix = ")") {
  if (!expression) {
    insertAtCursor(prefix + suffix);
    return;
  }

  let index = expression.length;
  if (index > 0 && expression[index - 1] === ")") {
    let depth = 0;
    for (let i = index - 1; i >= 0; i--) {
      if (expression[i] === ")") depth++;
      else if (expression[i] === "(") {
        depth--;
        if (depth === 0) {
          let start = i;
          while (start > 0 && /[a-zA-Z√∛]/.test(expression[start - 1])) start--;
          const target = expression.slice(start, index);
          expression = expression.slice(0, start) + prefix + target + suffix;
          renderAfterEdit();
          return;
        }
      }
    }
  }

  let start = index;
  while (start > 0) {
    const ch = expression[start - 1];
    if (isOperator(ch) || ch === "(" || ch === ",") break;
    start--;
  }

  if (start === index) {
    insertAtCursor(prefix + suffix);
    return;
  }

  const target = expression.slice(start, index);
  expression = expression.slice(0, start) + prefix + target + suffix;
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
          (next.type === "number" ||
            next.type === "func" ||
            (next.type === "symbol" && next.value === "("))
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
          (next.type === "number" ||
            next.type === "func" ||
            (next.type === "symbol" && next.value === "("))
        ) break;
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

function sanitizeForPreview(raw) {
  let s = raw.trim();
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

  if (exprView) {
    exprView.style.transition = "opacity 0.15s ease";
    exprView.style.opacity = "0";
  }

  setTimeout(() => {
    expression = String(out);
    lastValidResult = formatted;
    syncExpression();
    renderExpression("bottom");
    setResultText(formatted);

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

  const isLight = theme !== "theme-dark";
  const themeColor = isLight ? "#f5f7fb" : "#000000";

  const meta = document.getElementById("themeColorMeta");
  if (meta) meta.setAttribute("content", themeColor);

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
   COPY
================================*/
async function copyResult() {
  const value = result?.textContent.trim();
  if (!value || value === "Error") return;

  try {
    await navigator.clipboard.writeText(value);
  } catch {
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
  setTimeout(() => {
    copyResultBtn?.classList.remove("copied");
  }, 150);

  showToast(`Copied Amount: ${value}`);
}

/* ===============================
   HAPTIC
================================*/
function haptic() {
  try { if (navigator.vibrate) navigator.vibrate(6); } catch { }
}

/* ===============================
   EVENTS
================================*/
// Target specifically the copy icon inside the container
const actualCopyIcon = document.querySelector(".copy-icon");

actualCopyIcon?.addEventListener("pointerdown", (e) => {
  e.stopPropagation(); // Prevents the click from interfering with anything else
  haptic();
  copyResult();
});

// copyResultBtn?.addEventListener("contextmenu", (e) => e.preventDefault());

menuBtn?.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  toggleMenu();
});

themeToggleBtn?.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  toggleTheme();
});

let backspaceLongTimer = null;

backspaceBtn?.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  haptic();
  backspaceAtCursor();

  backspaceLongTimer = setTimeout(() => {
    haptic();
    clearAll();
  }, 600);
});

backspaceBtn?.addEventListener("pointerup", () => {
  clearTimeout(backspaceLongTimer);
});

backspaceBtn?.addEventListener("pointerleave", () => {
  clearTimeout(backspaceLongTimer);
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

// document.addEventListener("contextmenu", (e) => {
//   if (result?.contains(e.target) || copyResultBtn?.contains(e.target)) {
//     e.preventDefault();
//   }
// });



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

/* ===============================
   DEVICE READY
================================*/
document.addEventListener("deviceready", function () {
  const saved = localStorage.getItem("calc_theme") || "theme-light";
  setTheme(saved, false);
}, false);

exprView?.addEventListener("paste", (e) => {
  e.preventDefault();
  
  const pastedText = (e.clipboardData || window.clipboardData).getData("text");
  if (pastedText) {
    const cleanText = pastedText.replace(/[^0-9\.+\-×÷\*\/\(\)\^\%]/g, "");
    
    // Check for Select All / Highlighted text and clear it first
    clearIfSelected();
    
    insertAtCursor(cleanText);
  }
});

// Optional: Prevent hardware keyboards from messing up the state since we use buttons
exprView?.addEventListener("keydown", (e) => {
  if (!e.metaKey && !e.ctrlKey) {
    e.preventDefault();
  }
});
