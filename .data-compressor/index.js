import { readFileSync } from 'fs';

const content = readFileSync('./imh/data.js', {
	encoding: 'utf-8',
});

console.log(content.replace('import g from "../src/models/galleries.js";', ''));
