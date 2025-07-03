#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { parseRules, nodeInit, getJSON } from '../fluidScale.js';
import { globby } from 'globby';
let parser;
let traverse;
try {
  const require = createRequire(
    pathToFileURL(path.join(process.cwd(), 'index.js')).href
  );
  parser = require('@babel/parser');
  traverse = require('@babel/traverse').default;
} catch (err) {
  // Handle module loading errors
}

Map.prototype.toJSON = function () {
  return {
    __type__: 'Map',
    value: Array.from(this.entries()),
  };
};

export default async function loadConfig() {
  const configJson = await fs.promises.readFile (path.join(process.cwd(), 'public', 'fluid-scale.config.json'), 'utf-8');

  if (!configJson)
    throw Error ('No config found!');

  return JSON.parse (configJson);
}

const {
  inputs,
  outputDir,
  breakpoints,
  minBreakpoint,
  maxBreakpoint,
  usingPartials,
} = await loadConfig();


nodeInit({
  bps: breakpoints,
  minBp: minBreakpoint,
  maxBp: maxBreakpoint,
  usingPartials,
});

//const time = performance.now ();
await generateFluidRulesJSON();
//console.log ('Fluid build time:', performance.now() - time, 'ms');

function resolvePath(cssPath, htmlFilePath) {
  if (/^(https?:)?\/\//.test(cssPath)) {
    // External URL or CDN
    return null;
  }
  if (cssPath.startsWith ('./'))
    return path.resolve(path.dirname(htmlFilePath), cssPath);

  return cssPath;
}

async function generateFluidRulesJSON() {
  for (const [key, globs] of Object.entries(inputs)) {
    const inputFiles = await globby(globs);
 
    const cssFiles = inputFiles.filter((file) => file.endsWith('.css'));
    for (const file of inputFiles) {
      const content = fs.readFileSync(file).toString();

      if (file.endsWith('.html'))
        cssFiles.push(
          ...[...content.matchAll(/<link\s+[^>]*href=["']([^"']+\.css)["']/g)].map(
            (m) => resolvePath (m[1], file)
          ).filter (m => m)
        );
      else if (/\.[jt]sx?$/.test(file)) {
        if (parser) {
          try {
            const ast = parser.parse(content, {
              sourceType: 'module',
              plugins: ['jsx', 'typescript'],
            });

            traverse(ast, {
              ImportDeclaration({ node }) {
                const importPath = node.source.value;
                if (importPath.endsWith('.css')) {
                  const resolved = path.resolve(path.dirname(file), importPath);
                  cssFiles.add(resolved);
                }
              },
            });
          } catch (err) {
            console.warn(`Failed to parse ${file}:`, err.message);
          }
        } else {
          cssFiles.push(
            ...[
              ...content.matchAll(
                /import\s+(?:(?:[\w{}*]+)\s+from\s+)?["']([^"']+\.css)["']/g
              ),
            ].map((m) => resolvePath (m[1], file)).filter (m => m)
          );
        }
      }
    }
    let html = '<!DOCTYPE html><html><head>';
    
    for (let cssFile of cssFiles) {
      //if (cssFile.startsWith ('/'))
       // cssFile = path.join(process.cwd(), cssFile.replace(/^\/+/, ''));
      
      const cssContent = fs.readFileSync(cssFile, 'utf8');
      html += `<style>${cssContent}</style>`;
    }

    html += '</head><body></body></html>';

    const dom = new JSDOM(html);
    const document = dom.window.document;

    const sheets = Array.from (document.styleSheets).filter (sheet => {
      try {
        sheet.cssRules;
        return true;
      }
      catch(e) {
        return false;
      }
    })

    const rules = sheets.map (sheet => Array.from (sheet.cssRules)).flat();
    parseRules(rules, 0);
    
    const outPath = path.join('public', outputDir, `${key}.json`);
    await fs.promises.mkdir (path.dirname(outPath), { recursive:true});
    await fs.promises.writeFile(
      outPath,
      JSON.stringify(getJSON(), null, 2)
    );
  }
}
