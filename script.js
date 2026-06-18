const sourceInput = document.querySelector("#sourceInput");
const formatSelect = document.querySelector("#formatSelect");
const ruleSelect = document.querySelector("#ruleSelect");
const normalizeWhitespace = document.querySelector("#normalizeWhitespace");
const caseSensitive = document.querySelector("#caseSensitive");
const openButton = document.querySelector("#openButton");
const scanButton = document.querySelector("#scanButton");
const copyButton = document.querySelector("#copyButton");
const saveButton = document.querySelector("#saveButton");
const clearButton = document.querySelector("#clearButton");
const fileInput = document.querySelector("#fileInput");
const status = document.querySelector("#status");
const stats = document.querySelector("#stats");
const sourceCount = document.querySelector("#sourceCount");
const resultCount = document.querySelector("#resultCount");
const resultRows = document.querySelector("#resultRows");
const groupCount = document.querySelector("#groupCount");
const occurrenceCount = document.querySelector("#occurrenceCount");
const duplicateCount = document.querySelector("#duplicateCount");
const uniqueCount = document.querySelector("#uniqueCount");
const errorCount = document.querySelector("#errorCount");
const releaseStamp = document.querySelector("#releaseStamp");

const appRelease = "20260617-2059";

const sampleXml = `<properties>
  <property name="Property.Duplicate.1" value="true" />
  <property name="Property.Duplicate.1" value="false" />
  <property name="Property.NotDuplicate.2" value="true" />
</properties>`;

let currentGroups = [];
let currentStats = makeEmptyStats();

sourceInput.value = sampleXml;
renderReleaseStamp();
scanDocument();

openButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", openSelectedFile);
scanButton.addEventListener("click", scanDocument);
copyButton.addEventListener("click", copyReport);
saveButton.addEventListener("click", saveReport);
clearButton.addEventListener("click", clearAll);
sourceInput.addEventListener("input", () => {
  updateCounts();
  setStatus("Ready", "idle");
});
normalizeWhitespace.addEventListener("change", scanDocument);
caseSensitive.addEventListener("change", scanDocument);

document.querySelectorAll("[data-filter]").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.filter === "errors") {
      setStatus("Errors appear here when XML cannot be parsed", "idle");
    }
  });
});

async function openSelectedFile() {
  const [file] = fileInput.files;
  fileInput.value = "";

  if (!file) {
    return;
  }

  try {
    sourceInput.value = await file.text();
    updateCounts();
    scanDocument();
    setStatus(`Opened ${file.name}`, "valid");
  } catch {
    setStatus("Could not open file", "error");
  }
}

function scanDocument() {
  if (formatSelect.value !== "xml") {
    setStatus("Only XML is supported right now", "error");
    return;
  }

  let root;

  try {
    root = parseXml(sourceInput.value);
  } catch (error) {
    currentGroups = [];
    currentStats = makeEmptyStats();
    currentStats.errors = 1;
    renderResults();
    updateCounts();
    setStatus(error.message, "error");
    return;
  }

  const scan = scanXmlDuplicates(root);
  currentGroups = scan.groups;
  currentStats = scan.stats;
  renderResults();
  updateCounts();
  setStatus(currentGroups.length ? `Found ${currentGroups.length} duplicate groups` : "No duplicates found", "valid");
}

function parseXml(input) {
  const source = input.trim();

  if (!source) {
    throw new Error("Enter XML to scan");
  }

  const document = new DOMParser().parseFromString(source, "application/xml");
  const parserError = document.querySelector("parsererror");

  if (parserError) {
    throw new Error(parserError.textContent.trim().replace(/\s+/g, " "));
  }

  return document.documentElement;
}

function scanXmlDuplicates(root) {
  const groups = [];
  const stats = makeEmptyStats();

  scanElement(root, `/${root.nodeName}`, groups, stats);
  stats.groups = groups.length;
  stats.occurrences = groups.reduce((sum, group) => sum + group.count, 0);
  stats.extraDuplicates = groups.reduce((sum, group) => sum + group.count - 1, 0);

  return { groups, stats };
}

function scanElement(parent, parentPath, groups, stats) {
  const buckets = new Map();
  const children = getElementChildren(parent);

  children.forEach((child, index) => {
    const duplicateKey = getDuplicateKey(child);
    const value = getDisplayValue(child);
    const bucketKey = normalizeBucketKey(duplicateKey);

    stats.uniqueKeys.add(bucketKey);

    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, {
        parent: parentPath,
        key: duplicateKey,
        value,
        locations: []
      });
    }

    buckets.get(bucketKey).locations.push(`${parentPath}/${child.nodeName}[${index}]`);
  });

  buckets.forEach((bucket) => {
    if (bucket.locations.length > 1) {
      groups.push({
        parent: bucket.parent,
        key: bucket.key,
        value: bucket.value,
        count: bucket.locations.length,
        locations: bucket.locations
      });
    }
  });

  children.forEach((child, index) => {
    scanElement(child, `${parentPath}/${child.nodeName}[${index}]`, groups, stats);
  });
}

function normalizeValue(value) {
  let normalized = normalizeWhitespace.checked ? value.trim().replace(/\s+/g, " ") : value;

  if (!caseSensitive.checked) {
    normalized = normalized.toLocaleLowerCase();
  }

  return normalized;
}

function normalizeBucketKey(key) {
  return caseSensitive.checked ? key : key.toLocaleLowerCase();
}

function getDuplicateKey(element) {
  const attributeName = ["name", "key", "id"].find((name) => element.hasAttribute(name));

  if (attributeName) {
    return `${element.nodeName}[@${attributeName}=${normalizeValue(element.getAttribute(attributeName))}]`;
  }

  return `${element.nodeName}=${normalizeValue(element.textContent)}`;
}

function getDisplayValue(element) {
  const attributeNames = element.getAttributeNames();

  if (attributeNames.length) {
    return attributeNames
      .map((name) => `${name}=${JSON.stringify(element.getAttribute(name))}`)
      .join(", ");
  }

  return normalizeValue(element.textContent);
}

function getElementChildren(element) {
  return Array.from(element.children);
}

function renderResults() {
  resultRows.textContent = "";

  if (!currentGroups.length) {
    const empty = document.createElement("div");
    empty.className = "empty-results";
    empty.textContent = currentStats.errors ? "Fix the XML error and scan again." : "No duplicate groups yet.";
    resultRows.append(empty);
  } else {
    const fragment = document.createDocumentFragment();

    currentGroups.forEach((group) => {
      const row = document.createElement("div");
      row.className = "result-row";
      row.setAttribute("role", "row");
      row.append(
        makeCell(group.parent, "Parent"),
        makeCell(group.key, "Key"),
        makeCell(formatValue(group.value), "Value"),
        makeCell(group.count, "Occurrences"),
        makeCell(group.locations.join(", "), "Locations")
      );
      fragment.append(row);
    });

    resultRows.append(fragment);
  }

  groupCount.textContent = currentGroups.length;
  occurrenceCount.textContent = currentStats.occurrences;
  duplicateCount.textContent = currentStats.extraDuplicates;
  uniqueCount.textContent = currentStats.uniqueKeys.size;
  errorCount.textContent = currentStats.errors;
  resultCount.textContent = `${currentGroups.length} ${currentGroups.length === 1 ? "row" : "rows"}`;
  stats.textContent = `${currentGroups.length} groups · ${currentStats.occurrences} occurrences · ${currentStats.extraDuplicates} extra duplicates`;
}

function makeCell(value, label) {
  const cell = document.createElement("span");
  cell.setAttribute("role", "cell");
  cell.dataset.label = label;
  cell.textContent = value;
  return cell;
}

function formatValue(value) {
  return value ? JSON.stringify(value) : "(empty)";
}

async function copyReport() {
  const report = JSON.stringify(buildReport(), null, 2);

  try {
    if (!navigator.clipboard) {
      throw new Error("Clipboard API unavailable");
    }

    await navigator.clipboard.writeText(report);
    setStatus("Copied duplicate report", "valid");
  } catch {
    if (copyTextFallback(report)) {
      setStatus("Copied duplicate report", "valid");
    } else {
      setStatus("Could not copy report", "error");
    }
  }
}

function copyTextFallback(text) {
  const scratch = document.createElement("textarea");
  scratch.value = text;
  scratch.setAttribute("readonly", "");
  scratch.style.position = "fixed";
  scratch.style.inset = "0 auto auto 0";
  scratch.style.opacity = "0";
  document.body.append(scratch);
  scratch.select();

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    scratch.remove();
  }
}

function saveReport() {
  const blob = new Blob([JSON.stringify(buildReport(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "duplicate-lizard-report.json";
  link.click();
  URL.revokeObjectURL(url);
  setStatus("Saved duplicate report", "valid");
}

function buildReport() {
  return {
    app: "Duplicate Lizard",
    release: appRelease,
    options: {
      format: formatSelect.value,
      scope: "same-parent",
      match: ruleSelect.value,
      normalizeWhitespace: normalizeWhitespace.checked,
      caseSensitive: caseSensitive.checked
    },
    summary: {
      groups: currentGroups.length,
      occurrences: currentStats.occurrences,
      extraDuplicates: currentStats.extraDuplicates,
      uniqueValues: currentStats.uniqueKeys.size,
      errors: currentStats.errors
    },
    groups: currentGroups
  };
}

function clearAll() {
  sourceInput.value = "";
  currentGroups = [];
  currentStats = makeEmptyStats();
  renderResults();
  updateCounts();
  setStatus("Ready", "idle");
}

function makeEmptyStats() {
  return {
    groups: 0,
    occurrences: 0,
    extraDuplicates: 0,
    errors: 0,
    uniqueKeys: new Set()
  };
}

function setStatus(message, type) {
  status.textContent = message;
  status.className = `status-pill status-${type}`;
}

function updateCounts() {
  sourceCount.textContent = `${sourceInput.value.length} chars`;
}

function renderReleaseStamp() {
  releaseStamp.textContent = `Version: ${appRelease}`;
}
