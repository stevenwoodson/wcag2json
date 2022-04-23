'use strict';

let cheerio = require('cheerio');
let wcagVersions = require('./wcagversions.json');


function parseHtml(html) {
    let $ = cheerio.load(html);
    let $principles = $('section.principle');
    let principles = [];


    $principles.each(function () {
        let principle = parsePrinciple($(this));
        principles.push(principle);
    });

    return { principles: principles };
}

/**
 * Parse the DOM of a principle into it's JSON format
 */
function parsePrinciple($principle) {
    let content     = $principle.find('h2').text();
    let id          = $principle.attr('id');
    let altid       = $principle.find('h2').attr('id');
    let subContent  = splitOnce(content, /\d./)[1]
    let num         = content.match(/\d/)[0];
    // Get the handle
    let subContentParts = splitOnce(subContent, / §/).map(cleanString);
    // Get the text
    let text        = $principle.find('h2 + p').text();

    let guidelines  = [];
    $principle.find('section.guideline').each(function () {
        let guidline = parseGuideline($principle.find(this));
        guidelines.push(guidline);
    });

    let output = {
        id:     id,
        alt_id:     [altid],
        num:    num,
        versions: wcagVersions[num],
        handle: subContentParts[0],
        text:  text,
        guidelines: guidelines
    };

    return output;
}

/**
 * Parse the DOM of a guideline into it's JSON format
 */
function parseGuideline($guideline) {
    let headline    = $guideline.find('h3').text();
    let text        = $guideline.find('h3 + p').text();
    let id          = $guideline.attr("id");
    let altid       = $guideline.find('h3').attr("id");
    let num         = headline.match(/\d\.\d/)[0];

    // Get the handle
    let subContent = splitOnce(headline, /\d\.\d/)[1];
    let subContentParts  = splitOnce(subContent, /§/).map(cleanString);

    let criteria    = [];
    $guideline.find('section.sc').each(function () {
        let criterion = parseCriterion($guideline.find(this));
        criteria.push(criterion);
    });

    return {
        'id': id,
        'alt_id': [altid],
        'num': num,
        'versions': wcagVersions[num],
        'handle': subContentParts[0],
        'text': text,
        'successcriteria': criteria
    };
}

/**
 * Parse the DOM of a criterion into it's JSON format
 */
function parseCriterion($criterion) {
    let content     = $criterion.find('h4').text();
    let levelText   = $criterion.find('p.conformance-level').text();
    let text        = $criterion.find('p').not('.conformance-level').first().text().replace(/\n/g, "").replace(/  +/g, ' ').trim();
    let id          = $criterion.attr("id");
    let altid       = $criterion.find('h4').attr("id");
    let num         = content.match(/\d\.\d\.\d+/)[0];

    // Get the handle
    let subContent = splitOnce(content, /\d\.\d\.\d+/)[1]
    let subContentParts  = splitOnce(subContent, /§/).map(cleanString);

    let level;
    if (levelText.indexOf('AAA') !== -1) {
        level = 'AAA';
    } else if (levelText.indexOf('AA') !== -1) {
        level = 'AA';
    } else {
        level = 'A'
    }

    return {
        'id': id,
        'alt_id': [altid],
        'num': num,
        'versions': wcagVersions[num],
        'level':  level,
        'handle': subContentParts[0],
        'text':   text,
        'details': parseCriterionDetails($criterion)
    };
}

/** Get the details value of the  */
function parseCriterionDetails($criterion) {
    let details = [];
    let noteCount = 1;

    $criterion.find('ul, dl, .note').each(function () {
        let $elm = $criterion.find(this);

        if ($elm.is('ul')) {
            let detail = {
                type: 'olist',
                items: []
            };

            $elm.find('li').each(function () {
                let $li    = $elm.find(this);
                let handle = cleanString($li.find('strong').text());
                let text   = cleanString($li.text().replace(handle, ''));
                detail.items.push({
                    handle: handle.replace(':', ''),
                    text: text
                });
            });
            details.push(detail);

        } else if ($elm.is('dl')) {
            let detail = {
                type: 'ulist',
                items: []
            };

            $elm.find('dt').each(function () {
                let handle = $elm.find(this).text();
                let text = $elm.find(this).next().text().replace(/\n/g, "").replace(/  +/g, ' ').trim();
                detail.items.push({
                    handle: handle,
                    text: text
                });
            });
            details.push(detail);

        } else {
            let handle = cleanString($elm.find('.note-title').text());
            let text   = cleanString($elm.text().replace(handle, ''));
            details.push({
                type: 'note',
                handle: handle + ' ' + noteCount,
                text: text
            });
            noteCount++;
        }
    });

    if (details.length > 0) {
        return details;
    }
}


/** Some string helpers **/
function cleanString(str) {
    return str.trim().replace(/\s+/g, ' ');
}

function splitOnIndex(str, index) {
    return [str.substr(0, index), str.substr(index)];
}

function splitOnce(str, regex) {
    let match = str.match(regex);
    if (match) {
        let match_i = str.indexOf(match[0]);
        return [str.substring(0, match_i),
        str.substring(match_i + match[0].length)];
    } else {
        return [str, ""];
    }
}


exports.parseHtml             = parseHtml;
exports.parsePrinciple        = parsePrinciple;
exports.parseGuideline        = parseGuideline;
exports.parseCriterion        = parseCriterion;
exports.parseCriterionDetails = parseCriterionDetails;