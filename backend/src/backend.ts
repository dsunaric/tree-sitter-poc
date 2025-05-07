import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import {Language, Parser, Tree} from 'web-tree-sitter';
const cors = require('cors');

const app = express();
const port = 3001;


app.use(cors());
app.get('/read-java-files', async (req, res) => {
    const dirPath = "C:\\Users\\sunaridr\\Documents\\STUDIUM\\model-engineering\\workspcae\\model-engineering-labs-2024-model-engineering-labs-2024-group-16\\lab4\\tuber\\src-gen\\tuber";
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

    Object.entries(fileMap).forEach(([key, value]) => {
        if(containsNormalClass(fileMap[key])) {
            console.log("==============================================");
            console.log("   CLASS - " +getClassName(fileMap[key])+ "   ");
            console.log("----------------------------------------- ");
            console.log("FIELDS:");
            getFields(fileMap[key]).forEach(function (field) {
                console.log(field.accessModifier +" "+ field.name +" : "+ field.type );
            });
            console.log("----------------------------------------- ");
            console.log("METHODS:");
            getMethods(fileMap[key]).forEach(function (method) {
                process.stdout.write(method.accessModifier +" "+ method.name +"(");
                method.parameters.forEach(function (parameter) {
                    process.stdout.write(parameter.name+":"+ parameter.type);
                })
                process.stdout.write(") : "+ method.type );
                console.log()
            });
            console.log("==============================================");
            console.log("\n\n");
        }

    });

    console.log("end parsing duration in ms:", Date.now() - start);

    res.json(fileMap);
});

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
function containsNormalClass(tree: Tree | null): boolean {
    if (!tree) return false;
    const rootNode = tree.rootNode;

    // Check if there's at least one class_declaration that is not enum/interface/record
    const classNodes = rootNode.descendantsOfType('class_declaration');

    return classNodes.length > 0;
}


function getClassName(tree: Tree | null): string | null {
    if(!tree) return null;
    const rootNode = tree.rootNode;

    // Look for class_declaration node
    const classNode = rootNode.descendantsOfType('class_declaration')[0];

    if (classNode) {
        const identifierNode = classNode.childForFieldName('name');
        return identifierNode?.text || null;
    }

    return null;
}


type FieldInfo = {
    name: string;
    type: string;
    accessModifier: '+' | '-' | '#' | '';
};

type MethodInfo = {
    name: string;
    type: string;
    accessModifier: '+' | '-' | '#' | '';
    parameters: { name: string; type: string }[];
};
function getMethods(tree: Tree | null): MethodInfo[] {
    if(!tree) return [];
    const methods: MethodInfo[] = [];
    const rootNode = tree.rootNode;

    const methodNodes = rootNode.descendantsOfType('method_declaration');

    for (const methodNode of methodNodes) {
        if(!methodNode) continue;

        const nameNode = methodNode.childForFieldName('name');
        const modifiersNode = methodNode.descendantsOfType('modifiers');
        const typeNode = methodNode.childForFieldName('type');
        const paramsNode = methodNode.childForFieldName('parameters');
        let accessModifier: MethodInfo['accessModifier'] = ''; // fallback

        if (!modifiersNode) continue
        for(const modifier of modifiersNode){
            const modifierTexts = modifier?.text
            if (modifierTexts?.includes('public')) {
                accessModifier = '+';
            } else if (modifierTexts?.includes('private')) {
                accessModifier = '-';
            } else if (modifierTexts?.includes('protected')) {
                accessModifier = '#';
            }
        }

        const parameters: { name: string; type: string }[] = [];

        if (paramsNode) {
            const paramNodes = paramsNode.namedChildren.filter(n => n?.type === 'formal_parameter');

            for (const param of paramNodes) {
                if(!param) continue;
                const typeNode = param.childForFieldName('type');
                const nameNode = param.childForFieldName('name');
                if (typeNode && nameNode) {
                    parameters.push({
                        type: typeNode.text,
                        name: nameNode.text,
                    });
                }
            }
        }

        if (nameNode && typeNode) {
            methods.push({
                name: nameNode.text,
                accessModifier,
                type: typeNode.text,
                parameters
            });
        }
    }

    return methods;
}


function getFields(tree: Tree | null): FieldInfo[] {
    if (!tree) return [];
    const fields: FieldInfo[] = [];

    const classNode = tree.rootNode.descendantsOfType('class_declaration')[0];
    if (!classNode) return [];

    const fieldNodes = classNode.descendantsOfType('field_declaration');

    for (const fieldNode of fieldNodes) {
        if(!fieldNode) continue;
        const modifiersNode = fieldNode.descendantsOfType('modifiers');
        const typeNode = fieldNode.childForFieldName('type');
        const varDeclarator = fieldNode.descendantsOfType('variable_declarator')[0];
        const nameNode = varDeclarator?.childForFieldName('name');

        let accessModifier: FieldInfo['accessModifier'] = '';

        if (!modifiersNode) continue
        for(const modifier of modifiersNode){
            const modifierTexts = modifier?.text
            if (modifierTexts?.includes('public')) {
                accessModifier = '+';
            } else if (modifierTexts?.includes('private')) {
                accessModifier = '-';
            } else if (modifierTexts?.includes('protected')) {
                accessModifier = '#';
            }
        }

        if (nameNode && typeNode) {
            fields.push({
                name: nameNode.text,
                type: typeNode.text,
                accessModifier,
            });
        }
    }

    return fields;
}
