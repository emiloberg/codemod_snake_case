'use strict';

const { applyTransform } = require('jscodeshift/dist/testUtils');
const transform = require('../transform');

function run(source) {
  return applyTransform(transform, {}, { source }, { parser: 'tsx' });
}

describe('snake_case codemod', () => {
  // ─── Variable declarations ───────────────────────────────────────

  describe('variable declarations', () => {
    test('renames camelCase variables', () => {
      expect(run('const myVariable = 1;')).toBe('const my_variable = 1;');
    });

    test('renames PascalCase variables', () => {
      expect(run('const MyVariable = 1;')).toBe('const my_variable = 1;');
    });

    test('leaves snake_case variables alone', () => {
      expect(run('const my_variable = 1;')).toBe('const my_variable = 1;');
    });

    test('leaves single-letter variables alone', () => {
      expect(run('const x = 1;')).toBe('const x = 1;');
    });

    test('renames let and var', () => {
      const input = 'let myLet = 1;\nvar myVar = 2;';
      const output = 'let my_let = 1;\nvar my_var = 2;';
      expect(run(input)).toBe(output);
    });

    test('renames variable references', () => {
      const input = 'const myVal = 1;\nconsole.log(myVal);';
      const output = 'const my_val = 1;\nconsole.log(my_val);';
      expect(run(input)).toBe(output);
    });
  });

  // ─── Function declarations ───────────────────────────────────────

  describe('function declarations', () => {
    test('renames function names', () => {
      expect(run('function getUser() {}')).toBe('function get_user() {}');
    });

    test('renames function parameters', () => {
      expect(run('function fn(firstName, lastName) {}')).toBe(
        'function fn(first_name, last_name) {}'
      );
    });

    test('renames arrow function parameters', () => {
      expect(run('const fn = (myParam) => myParam;')).toBe(
        'const fn = (my_param) => my_param;'
      );
    });

    test('renames function expression names', () => {
      expect(run('const fn = function getData() {};')).toBe(
        'const fn = function get_data() {};'
      );
    });
  });

  // ─── Object literals ─────────────────────────────────────────────

  describe('object literals', () => {
    test('renames object property keys', () => {
      const input = 'const obj = { firstName: "Alice", lastName: "Bob" };';
      const output = 'const obj = { first_name: "Alice", last_name: "Bob" };';
      expect(run(input)).toBe(output);
    });

    test('renames shorthand properties', () => {
      const input = 'const firstName = "Alice";\nconst obj = { firstName };';
      const output = 'const first_name = "Alice";\nconst obj = { first_name };';
      expect(run(input)).toBe(output);
    });

    test('skips computed property keys but renames the expression', () => {
      const input = 'const myKey = "a";\nconst obj = { [myKey]: 1 };';
      const output = 'const my_key = "a";\nconst obj = { [my_key]: 1 };';
      expect(run(input)).toBe(output);
    });

    test('renames method definitions in objects', () => {
      const input = 'const obj = { getUser() { return null; } };';
      const output = 'const obj = { get_user() { return null; } };';
      expect(run(input)).toBe(output);
    });
  });

  // ─── Destructuring ───────────────────────────────────────────────

  describe('destructuring', () => {
    test('renames destructuring variable names', () => {
      const input = 'const { firstName, lastName } = obj;';
      const output = 'const { first_name, last_name } = obj;';
      expect(run(input)).toBe(output);
    });

    test('renames destructuring with aliases', () => {
      const input = 'const { firstName: myFirst } = obj;';
      const output = 'const { first_name: my_first } = obj;';
      expect(run(input)).toBe(output);
    });

    test('renames rest element in destructuring', () => {
      const input = 'const { a, ...restProps } = obj;';
      const output = 'const { a, ...rest_props } = obj;';
      expect(run(input)).toBe(output);
    });

    test('renames nested destructuring', () => {
      const input = 'const { userData: { firstName } } = response;';
      const output = 'const { user_data: { first_name } } = response;';
      expect(run(input)).toBe(output);
    });
  });

  // ─── Classes ─────────────────────────────────────────────────────

  describe('classes', () => {
    test('renames class names', () => {
      expect(run('class MyClass {}')).toBe('class my_class {}');
    });

    test('renames class method names', () => {
      const input = 'class Foo { getUserName() {} }';
      const output = 'class foo { get_user_name() {} }';
      expect(run(input)).toBe(output);
    });

    test('renames class property names', () => {
      const input = 'class Foo { myProp = 1; }';
      const output = 'class foo { my_prop = 1; }';
      expect(run(input)).toBe(output);
    });

    test('renames constructor parameters', () => {
      const input = 'class Foo { constructor(firstName) { this.firstName = firstName; } }';
      const output = 'class foo { constructor(first_name) { this.first_name = first_name; } }';
      expect(run(input)).toBe(output);
    });
  });

  // ─── Member expressions ──────────────────────────────────────────

  describe('member expressions', () => {
    test('renames properties on local objects', () => {
      const input = 'const obj = {};\nobj.firstName = "Alice";';
      const output = 'const obj = {};\nobj.first_name = "Alice";';
      expect(run(input)).toBe(output);
    });

    test('skips properties on built-in globals', () => {
      expect(run('console.log("hi");')).toBe('console.log("hi");');
    });

    test('skips chained properties on built-in globals', () => {
      expect(run('Object.keys(obj).forEach(fn);')).toBe('Object.keys(obj).forEach(fn);');
    });

    test('skips properties on Math', () => {
      expect(run('const x = Math.random();')).toBe('const x = Math.random();');
    });

    test('renames this.property', () => {
      expect(run('this.firstName = "Alice";')).toBe('this.first_name = "Alice";');
    });

    test('renames super.method', () => {
      const input = 'class A extends B { foo() { super.getData(); } }';
      // A and B are single-letter uppercase — skipped (like generic type params)
      const output = 'class A extends B { foo() { super.get_data(); } }';
      expect(run(input)).toBe(output);
    });

    test('skips document methods', () => {
      expect(run('document.getElementById("x");')).toBe('document.getElementById("x");');
    });

    test('skips window properties', () => {
      expect(run('window.addEventListener("click", fn);')).toBe(
        'window.addEventListener("click", fn);'
      );
    });
  });

  // ─── Imports (external) ──────────────────────────────────────────

  describe('external imports', () => {
    test('leaves external named imports completely unchanged', () => {
      const input = 'import { useQuery } from "react-query";';
      expect(run(input)).toBe(input);
    });

    test('leaves external default imports completely unchanged', () => {
      const input = 'import React from "react";';
      expect(run(input)).toBe(input);
    });

    test('leaves external namespace imports unchanged', () => {
      const input = 'import * as ReactDOM from "react-dom";';
      expect(run(input)).toBe(input);
    });

    test('skips references to external imports', () => {
      const input =
        'import axios from "axios";\nconst myData = axios.get("/api");';
      const output =
        'import axios from "axios";\nconst my_data = axios.get("/api");';
      expect(run(input)).toBe(output);
    });

    test('skips member access on external imports', () => {
      const input =
        'import React from "react";\nReact.createElement("div");';
      expect(run(input)).toBe(input);
    });
  });

  // ─── Imports (internal) ──────────────────────────────────────────

  describe('internal imports', () => {
    test('renames internal import specifiers', () => {
      const input = 'import { getUser } from "./utils";';
      const output = 'import { get_user } from "./utils";';
      expect(run(input)).toBe(output);
    });

    test('renames internal default imports', () => {
      const input = 'import myModule from "./myModule";';
      const output = 'import my_module from "./myModule";';
      expect(run(input)).toBe(output);
    });

    test('preserves imported name and renames local for aliased internal imports', () => {
      const input = 'import { getUser as fetchUser } from "./utils";';
      const output = 'import { getUser as fetch_user } from "./utils";';
      expect(run(input)).toBe(output);
    });
  });

  // ─── Exports ─────────────────────────────────────────────────────

  describe('exports', () => {
    test('renames named exports', () => {
      const input = 'const myFunc = () => {};\nexport { myFunc };';
      const output = 'const my_func = () => {};\nexport { my_func };';
      expect(run(input)).toBe(output);
    });

    test('renames export declarations', () => {
      const input = 'export const myConst = 1;';
      const output = 'export const my_const = 1;';
      expect(run(input)).toBe(output);
    });

    test('renames export function declarations', () => {
      const input = 'export function getUser() {}';
      const output = 'export function get_user() {}';
      expect(run(input)).toBe(output);
    });

    test('renames default export function', () => {
      const input = 'export default function myFunc() {}';
      const output = 'export default function my_func() {}';
      expect(run(input)).toBe(output);
    });
  });

  // ─── JSX ─────────────────────────────────────────────────────────

  describe('JSX', () => {
    test('skips JSX component names', () => {
      const input = 'const el = <MyComponent />;';
      expect(run(input)).toBe(input);
    });

    test('skips JSX attributes', () => {
      const input = 'const el = <div onClick={fn} />;';
      expect(run(input)).toBe(input);
    });

    test('renames expressions inside JSX', () => {
      const input = 'const myVal = 1;\nconst el = <div>{myVal}</div>;';
      const output = 'const my_val = 1;\nconst el = <div>{my_val}</div>;';
      expect(run(input)).toBe(output);
    });

    test('skips JSX member expression components', () => {
      const input = 'const el = <Foo.Bar />;';
      expect(run(input)).toBe(input);
    });
  });

  // ─── TypeScript ──────────────────────────────────────────────────

  describe('TypeScript', () => {
    test('renames interface property names', () => {
      const input = 'interface User { firstName: string; lastName: string; }';
      const output = 'interface user { first_name: string; last_name: string; }';
      expect(run(input)).toBe(output);
    });

    test('renames type alias properties', () => {
      const input = 'type MyType = { myProp: number; };';
      const output = 'type my_type = { my_prop: number; };';
      expect(run(input)).toBe(output);
    });

    test('renames enum names and members', () => {
      const input = 'enum MyEnum { FirstValue, SecondValue }';
      const output = 'enum my_enum { first_value, second_value }';
      expect(run(input)).toBe(output);
    });

    test('renames typed function parameters', () => {
      const input = 'function getUser(userId: number): string { return ""; }';
      const output = 'function get_user(user_id: number): string { return ""; }';
      expect(run(input)).toBe(output);
    });

    test('renames generic type parameters with meaningful names', () => {
      const input = 'function identity<TValue>(val: TValue): TValue { return val; }';
      const output = 'function identity<t_value>(val: t_value): t_value { return val; }';
      expect(run(input)).toBe(output);
    });

    test('leaves single-letter generic type params alone', () => {
      const input = 'function identity<T>(val: T): T { return val; }';
      expect(run(input)).toBe(input);
    });
  });

  // ─── Acronyms ────────────────────────────────────────────────────

  describe('acronym handling', () => {
    test('XMLParser → xml_parser', () => {
      expect(run('const XMLParser = null;')).toBe('const xml_parser = null;');
    });

    test('getHTTPSUrl → get_https_url', () => {
      expect(run('function getHTTPSUrl() {}')).toBe('function get_https_url() {}');
    });

    test('IOError → io_error', () => {
      expect(run('const IOError = null;')).toBe('const io_error = null;');
    });

    test('parseJSON → parse_json', () => {
      expect(run('function parseJSON() {}')).toBe('function parse_json() {}');
    });

    test('HTMLElement → html_element', () => {
      expect(run('const HTMLElement_ = null;')).toBe('const html_element_ = null;');
    });
  });

  // ─── Edge cases ──────────────────────────────────────────────────

  describe('edge cases', () => {
    test('preserves leading underscores', () => {
      expect(run('const _myPrivate = 1;')).toBe('const _my_private = 1;');
    });

    test('preserves $ prefix', () => {
      expect(run('const $myElement = 1;')).toBe('const $my_element = 1;');
    });

    test('leaves SCREAMING_CASE alone', () => {
      expect(run('const MY_CONSTANT = 1;')).toBe('const MY_CONSTANT = 1;');
    });

    test('renames catch clause parameters', () => {
      const input = 'try {} catch (myError) { console.log(myError); }';
      const output = 'try {} catch (my_error) { console.log(my_error); }';
      expect(run(input)).toBe(output);
    });

    test('renames template literal expressions', () => {
      const input = 'const firstName = "A";\nconst msg = `Hello ${firstName}`;';
      const output = 'const first_name = "A";\nconst msg = `Hello ${first_name}`;';
      expect(run(input)).toBe(output);
    });

    test('does not modify string literals', () => {
      expect(run('const x = "camelCase";')).toBe('const x = "camelCase";');
    });

    test('skips labels', () => {
      const input = 'myLoop: for (;;) { break myLoop; }';
      expect(run(input)).toBe(input);
    });

    test('handles for-in variable renaming', () => {
      const input = 'for (const myKey in obj) {}';
      const output = 'for (const my_key in obj) {}';
      expect(run(input)).toBe(output);
    });

    test('handles for-of variable renaming', () => {
      const input = 'for (const myItem of items) {}';
      const output = 'for (const my_item of items) {}';
      expect(run(input)).toBe(output);
    });

    test('handles require() from external module', () => {
      const input = 'const myLib = require("my-lib");\nmyLib.doSomething();';
      expect(run(input)).toBe(input);
    });

    test('handles destructured require() from external module', () => {
      const input = 'const { getUser } = require("my-lib");';
      expect(run(input)).toBe(input);
    });

    test('returns unchanged source when no transforms needed', () => {
      const input = 'const x = 1;\nconst y = 2;';
      expect(run(input)).toBe(input);
    });
  });

  // ─── Complex scenarios ───────────────────────────────────────────

  describe('complex scenarios', () => {
    test('full function with multiple identifier types', () => {
      const input = [
        'function getUserData(userId) {',
        '  const userData = { firstName: "Alice", lastName: "Bob" };',
        '  return userData;',
        '}',
      ].join('\n');
      const output = [
        'function get_user_data(user_id) {',
        '  const user_data = { first_name: "Alice", last_name: "Bob" };',
        '  return user_data;',
        '}',
      ].join('\n');
      expect(run(input)).toBe(output);
    });

    test('class with methods and properties', () => {
      const input = [
        'class UserService {',
        '  baseUrl = "/api";',
        '  async getUser(userId) {',
        '    const userData = await this.fetchData(userId);',
        '    return userData;',
        '  }',
        '}',
      ].join('\n');
      const output = [
        'class user_service {',
        '  base_url = "/api";',
        '  async get_user(user_id) {',
        '    const user_data = await this.fetch_data(user_id);',
        '    return user_data;',
        '  }',
        '}',
      ].join('\n');
      expect(run(input)).toBe(output);
    });

    test('mixed external and internal usage', () => {
      const input = [
        'import axios from "axios";',
        'import { getConfig } from "./config";',
        '',
        'async function fetchUser(userId) {',
        '  const config = getConfig();',
        '  const response = await axios.get(config.apiUrl);',
        '  return response;',
        '}',
      ].join('\n');
      const output = [
        'import axios from "axios";',
        'import { get_config } from "./config";',
        '',
        'async function fetch_user(user_id) {',
        '  const config = get_config();',
        '  const response = await axios.get(config.api_url);',
        '  return response;',
        '}',
      ].join('\n');
      expect(run(input)).toBe(output);
    });
  });
});
