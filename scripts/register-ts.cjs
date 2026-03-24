const fs = require("node:fs");
const path = require("node:path");
const Module = require("node:module");
const ts = require("typescript");

const originalResolveFilename = Module._resolveFilename;
const projectRoot = path.resolve(__dirname, "..");
const srcRoot = path.join(projectRoot, "src");

Module._resolveFilename = function resolveFilenamePatched(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    const mappedRequest = path.join(srcRoot, request.slice(2));
    return originalResolveFilename.call(this, mappedRequest, parent, isMain, options);
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

function registerTypeScriptExtension(extension) {
  const previousLoader = Module._extensions[extension];

  Module._extensions[extension] = function compileTypeScript(module, filename) {
    if (filename.includes(`${path.sep}node_modules${path.sep}`)) {
      if (previousLoader) {
        previousLoader(module, filename);
        return;
      }
    }

    const source = fs.readFileSync(filename, "utf8");
    const output = ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        moduleResolution: ts.ModuleResolutionKind.NodeJs,
        jsx: ts.JsxEmit.ReactJSX,
        esModuleInterop: true,
        resolveJsonModule: true,
      },
      fileName: filename,
    });

    module._compile(output.outputText, filename);
  };
}

registerTypeScriptExtension(".ts");
registerTypeScriptExtension(".tsx");
