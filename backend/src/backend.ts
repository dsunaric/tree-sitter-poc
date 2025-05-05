import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import {Language, Parser, Tree} from 'web-tree-sitter';
const cors = require('cors');

const app = express();
const port = 3001;


app.use(cors());
app.get('/read-java-files', async (req, res) => {
    const dirPath = "C:\\Users\\sunaridr\\Documents\\STUDIUM\\project\\vanilla-transformer";
    const fileMap: Record<string, Tree|null> = {};


    await Parser.init();
    const { Language } = require('web-tree-sitter');
    const JavaScript = await Language.load('./tree-sitter-java.wasm');
    const parser = new Parser();
    parser.setLanguage(JavaScript);

    async function readDirRecursive(currentPath: string | null) {
        if (!currentPath) return;
        const entries = await fs.readdir(currentPath, {withFileTypes: true});


        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            if (entry.isDirectory()) {
                await readDirRecursive(fullPath);
            } else if (entry.isFile() && entry.name.endsWith('.java')) {
                const content = await fs.readFile(fullPath, 'utf-8');
                fileMap[entry.name.replace(/\.java$/, '')] = parser.parse(content);
            }
        }
    }
    const start = Date.now();
    console.log("starting parsing at", start);
    await readDirRecursive(dirPath);
    console.log("end parsing duration in ms:", Date.now() - start);

    if(!fileMap["NoMapping"]) return res.json(fileMap);
    console.log("Classname : ",getClassName(fileMap["NoMapping"]))

    res.json(fileMap);
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});

function getClassName(tree: Tree): string | null {
    const rootNode = tree.rootNode;

    // Look for class_declaration node
    const classNode = rootNode.descendantsOfType('class_declaration')[0];

    if (classNode) {
        const identifierNode = classNode.childForFieldName('name');
        return identifierNode?.text || null;
    }

    return null;
}