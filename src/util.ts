'use strict';

import { homedir } from "os";
import path, { resolve } from "path";
import { workspace } from "vscode";

/**
 * Retrieve configured notes root path
 * @returns
 */
export function getRootPath() {

    let location = workspace.getConfiguration().get('inote.location') as string;
    location = location.replace('~', homedir());
    location = location.replace('${HOME}', homedir());
    if (location) {
        location = resolve(location);
    }

    return location;
}

/**
 * get absolute path
 * @param relative 
 * @returns 
 */
export function getAbsolutePath(relative: string) {
    let root = getRootPath();
    return path.join(root, relative);
}

/**
 * Retrieve the file exclusion list
 * @returns
 */
export function getExclusionList() {

    const exclude = [];

    const filesExclude = workspace.getConfiguration().get('files.exclude') as Record<string, boolean>;
    for (const [key, value] of Object.entries(filesExclude)) {
        if( value ){
            exclude.push(key);
        }
    }

    const notesExclude = workspace.getConfiguration().get('inote.exclude') as Array<string>;
    for (const value of notesExclude) {
        if( value ){
            exclude.push(value);
        }
    }

    return exclude;
}

/**
 * Check if file is in the exclusion list.
 * NOTE: Glob pattern is simulated, and support only basic samples
 * @see https://code.visualstudio.com/docs/editor/codebasics#_advanced-search-options
 * @param filename
 * @returns
 */
export function isInExclusionList(filename: string) {

    const exclusionList = getExclusionList();
    const result = exclusionList.find((exclude) => {
        const pattern = exclude
            .replace('.', '\.') // Escape dot in string
            .replace('?', '.') // Match on one character in string
            .replace('**', '(.+)?') // Match any number segments, including none
            .replace('*', '(.+)?') // Match zero or more characters in string
            .replace('/', '([\\|/])'); // Cross-platform directory separator

        const regex = new RegExp(pattern + '$', 'i');
        return regex.test(filename);
    });

    return (result) ? true : false;
}