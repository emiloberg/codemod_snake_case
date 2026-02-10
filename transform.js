'use strict';

// Built-in globals that should never be renamed
const BUILTIN_GLOBALS = new Set([
  // Global objects
  'globalThis', 'global', 'window', 'self', 'document', 'navigator', 'location', 'history',
  'screen', 'localStorage', 'sessionStorage', 'indexedDB', 'crypto', 'performance',
  'console', 'alert', 'confirm', 'prompt', 'fetch', 'Headers', 'Request', 'Response',
  'URL', 'URLSearchParams', 'FormData', 'Blob', 'File', 'FileReader', 'AbortController',
  'AbortSignal', 'Event', 'EventTarget', 'CustomEvent', 'MessageChannel', 'MessagePort',
  'BroadcastChannel', 'Worker', 'SharedWorker', 'ServiceWorker', 'WebSocket',
  'XMLHttpRequest', 'MutationObserver', 'IntersectionObserver', 'ResizeObserver',
  'PerformanceObserver',

  // Constructors / Types
  'Object', 'Array', 'Function', 'String', 'Number', 'Boolean', 'Symbol', 'BigInt',
  'Date', 'RegExp', 'Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError',
  'URIError', 'EvalError', 'AggregateError',
  'Map', 'Set', 'WeakMap', 'WeakSet', 'WeakRef', 'FinalizationRegistry',
  'Promise', 'Proxy', 'Reflect',
  'ArrayBuffer', 'SharedArrayBuffer', 'DataView',
  'Int8Array', 'Uint8Array', 'Uint8ClampedArray', 'Int16Array', 'Uint16Array',
  'Int32Array', 'Uint32Array', 'Float32Array', 'Float64Array', 'BigInt64Array',
  'BigUint64Array',
  'Intl', 'JSON', 'Math',
  'Iterator', 'AsyncIterator', 'Generator', 'AsyncGenerator',
  'GeneratorFunction', 'AsyncGeneratorFunction', 'AsyncFunction',

  // Global functions
  'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'eval',
  'encodeURI', 'decodeURI', 'encodeURIComponent', 'decodeURIComponent',
  'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
  'setImmediate', 'clearImmediate',
  'requestAnimationFrame', 'cancelAnimationFrame',
  'requestIdleCallback', 'cancelIdleCallback',
  'queueMicrotask', 'structuredClone', 'atob', 'btoa',

  // Global values
  'undefined', 'NaN', 'Infinity',

  // Node.js globals
  'require', 'module', 'exports', '__dirname', '__filename', 'process', 'Buffer',

  // Testing globals
  'describe', 'it', 'test', 'expect', 'beforeAll', 'afterAll', 'beforeEach', 'afterEach',
  'jest', 'vi',

  // Special identifiers
  'arguments', 'this', 'super',
]);

/**
 * Convert a camelCase/PascalCase string to snake_case.
 * Handles acronyms: XMLParser → xml_parser, getHTTPSUrl → get_https_url
 */
function toSnakeCase(str) {
  if (!str) return str;

  // Preserve leading underscores and $ prefix
  let prefix = '';
  let rest = str;
  const prefixMatch = str.match(/^[_$]+/);
  if (prefixMatch) {
    prefix = prefixMatch[0];
    rest = str.slice(prefix.length);
  }

  if (!rest) return str;

  const converted = rest
    // Insert _ between lowercase/digit and uppercase: "getUser" → "get_User"
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    // Insert _ between consecutive uppercase and uppercase+lowercase: "XMLParser" → "XML_Parser"
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toLowerCase();

  return prefix + converted;
}

/**
 * Check if an identifier name has any uppercase letters (i.e., needs conversion).
 */
function hasUpperCase(str) {
  return /[A-Z]/.test(str);
}

/**
 * Check if an import source is external (not a relative path).
 */
function isExternalImport(source) {
  return source && !source.startsWith('.') && !source.startsWith('/');
}

/**
 * Check if an identifier is SCREAMING_SNAKE_CASE (e.g., MY_CONSTANT, MAX_VALUE).
 */
function isScreamingCase(str) {
  return /^[A-Z][A-Z0-9_]*$/.test(str);
}

/**
 * Walk up a MemberExpression / CallExpression chain to find the root object identifier name.
 * e.g., for `a.b.c.d`, returns 'a'.
 * e.g., for `Object.keys(obj).forEach(fn)`, returns 'Object'.
 */
function getRootObjectName(node) {
  let current = node;
  while (current) {
    if (current.type === 'MemberExpression' || current.type === 'OptionalMemberExpression') {
      current = current.object;
    } else if (current.type === 'CallExpression' || current.type === 'OptionalCallExpression') {
      current = current.callee;
    } else {
      break;
    }
  }
  if (current && current.type === 'Identifier') {
    return current.name;
  }
  // Root is `this`, `super`, or something else — not in skip set
  return null;
}

/**
 * Find the ImportDeclaration ancestor of a path (if any).
 */
function getImportDeclaration(path) {
  let current = path;
  while (current) {
    if (current.node && current.node.type === 'ImportDeclaration') {
      return current.node;
    }
    current = current.parent;
  }
  return null;
}

module.exports = function transformer(fileInfo, api) {
  const j = api.jscodeshift;
  const root = j(fileInfo.source);

  // Step 1: Collect external import local names
  const externalNames = new Set();
  root.find(j.ImportDeclaration).forEach((path) => {
    const source = path.node.source.value;
    if (isExternalImport(source)) {
      for (const specifier of path.node.specifiers) {
        if (specifier.local && specifier.local.name) {
          externalNames.add(specifier.local.name);
        }
      }
    }
  });

  // Also collect require() calls for external modules
  root.find(j.CallExpression, { callee: { name: 'require' } }).forEach((path) => {
    const arg = path.node.arguments[0];
    if (arg && arg.type === 'StringLiteral' && isExternalImport(arg.value)) {
      const parent = path.parent.node;
      if (parent.type === 'VariableDeclarator' && parent.id) {
        if (parent.id.type === 'Identifier') {
          externalNames.add(parent.id.name);
        } else if (parent.id.type === 'ObjectPattern') {
          for (const prop of parent.id.properties) {
            if (prop.value && prop.value.type === 'Identifier') {
              externalNames.add(prop.value.name);
            }
          }
        }
      }
    }
  });

  // Combined skip set
  const skipSet = new Set([...BUILTIN_GLOBALS, ...externalNames]);

  // Step 2: Walk all Identifier nodes and rename
  root.find(j.Identifier).forEach((path) => {
    const { node, parent } = path;
    const name = node.name;

    // Skip if no uppercase letters (already snake_case or lowercase)
    if (!hasUpperCase(name)) return;

    // Skip SCREAMING_SNAKE_CASE (e.g., MY_CONSTANT, MAX_VALUE)
    if (isScreamingCase(name)) return;

    // Skip single uppercase letters (common for generic type params: T, K, V)
    if (name.length === 1) return;

    // Skip if in the skip set
    if (skipSet.has(name)) return;

    // Skip labels
    if (parent.node.type === 'LabeledStatement' && parent.node.label === node) return;
    if (parent.node.type === 'BreakStatement' && parent.node.label === node) return;
    if (parent.node.type === 'ContinueStatement' && parent.node.label === node) return;

    // Skip if inside an external import declaration
    const importDecl = getImportDeclaration(path);
    if (importDecl && isExternalImport(importDecl.source.value)) return;

    // Skip the `imported` field of ImportSpecifier (for internal imports)
    // The source file's export gets renamed when the codemod runs on it
    if (
      parent.node.type === 'ImportSpecifier' &&
      parent.node.imported === node &&
      parent.node.local !== node
    ) {
      return;
    }

    // Skip JSX element names and attributes
    if (
      parent.node.type === 'JSXOpeningElement' ||
      parent.node.type === 'JSXClosingElement' ||
      parent.node.type === 'JSXMemberExpression' ||
      parent.node.type === 'JSXAttribute'
    ) {
      return;
    }

    // Handle MemberExpression properties
    if (
      parent.node.type === 'MemberExpression' &&
      parent.node.property === node &&
      !parent.node.computed
    ) {
      const rootName = getRootObjectName(parent.node);
      if (rootName && skipSet.has(rootName)) return;
    }

    // Handle OptionalMemberExpression (obj?.prop)
    if (
      parent.node.type === 'OptionalMemberExpression' &&
      parent.node.property === node &&
      !parent.node.computed
    ) {
      const rootName = getRootObjectName(parent.node);
      if (rootName && skipSet.has(rootName)) return;
    }

    // Rename
    node.name = toSnakeCase(name);
  });

  // Step 3: Handle TSEnumMember ids that might be string literals
  // (Identifiers are already handled above, but Enum members with string keys use Identifier nodes)

  return root.toSource();
};

module.exports.parser = 'tsx';
