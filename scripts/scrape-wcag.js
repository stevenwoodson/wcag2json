'use strict';

// Import libraries
let request   = require('request');
let fs        = require('fs');
let parseWcag20 = require('../lib/parseWcag20');
let parseWcag21 = require('../lib/parseWcag21');

// Set up some data
let translationUrls = require('../translations.json');
let currLang        = process.argv[2] || 'en';
let currVersion     = process.argv[3] || '21';
let htmlFilePath    = './wcag' + currVersion + '-html/wcag' + currVersion + '-' + currLang + '.html';
let jsonFilePath    = './wcag' + currVersion + '-json/wcag' + currVersion + '-' + currLang + '.json';
let parseHtml       = currVersion === 21 ? parseWcag21.parseHtml : parseWcag20.parseHtml


// Check if we know the file already
new Promise(function (resolve, reject) {
    fs.exists(htmlFilePath, resolve);

// Get the HTML
}).then(function (exists) {
    return new Promise(function (resolve, reject) {
        if (exists) {
            // Load locally
            console.log('reading ' + htmlFilePath);
            fs.readFile(htmlFilePath, 'utf8', function (error, data) {
                if (error) {
                    reject(error);
                }
                resolve(data);
            });

        } else {
            // Load from URL and store locally
            let url = translationUrls[currVersion][currLang];
            console.log('loading ' + url);

            request(url, function (error, response, html) {
                if (error || response.statusCode != 200) {
                    reject(error || response);
                }

                console.log('writing ' + htmlFilePath);
                fs.writeFile(htmlFilePath, html, 'utf8', function (error) {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(html);
                    }
                });
            });
        }
    });

// Scrape the HTML
}).then(parseHtml)
// Save the JSON data
.then(function (json) {
    let data = JSON.stringify(json, null, '    ');

    console.log('Creating ' + jsonFilePath);
    fs.writeFile(jsonFilePath, data, 'utf8', function (error) {
        if (error) {
            console.log(error)
        }
    });
})
// Catch any errors
.catch(console.error.bind(console, 'ERR'));
