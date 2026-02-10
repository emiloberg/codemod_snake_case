# codemod_snakecase

A jscodeshift codemod that transforms JavaScript/TypeScript identifiers from camelCase/PascalCase to snake_case.

## What it transforms

- Variable names, function names, parameters
- Object property keys, method names
- Class names, methods, properties
- Destructuring patterns
- TypeScript interfaces, type aliases, enums
- Member expression properties on local objects
- Acronyms: `XMLParser` → `xml_parser`, `getHTTPSUrl` → `get_https_url`

## What it skips

- Built-in globals (`console`, `Math`, `document`, `window`, etc.)
- External imports and their properties (`axios.get`, `React.createElement`)
- JSX tag names and attributes
- `SCREAMING_SNAKE_CASE` constants
- Single-letter identifiers
- String literals

## Usage

```bash
npm install

# Transform files
npx jscodeshift -t transform.js path/to/src/

# Dry run (preview without writing)
npx jscodeshift -t transform.js --dry path/to/src/

# Run tests
npm test
```
