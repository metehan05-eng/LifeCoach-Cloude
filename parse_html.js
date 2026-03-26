const fs = require('fs');
let html = fs.readFileSync('public/life-coach-ui.html', 'utf8');

// The goal is to extract the <head>, the #section-chat, and the bottom scripts, combining them into a clean asistan.html.
const headMatch = html.match(/<head>[\s\S]*?<\/head>/);
const head = headMatch ? headMatch[0] : '';

// Find section-chat
// It starts with <div id="section-chat" and ends before <div id="section-plans"
const sectionChatStart = html.indexOf('<div id="section-chat"');
const sectionPlansStart = html.indexOf('<div id="section-plans"');
let sectionChat = html.substring(sectionChatStart, sectionPlansStart);
// Close it properly. Since we cut before section-plans, we might have extra closing divs or missing ones.
// It's safer to use a regex or a DOM parser to extract #section-chat.
