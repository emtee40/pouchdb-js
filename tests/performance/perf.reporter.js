'use strict';
var isNode = process && !process.browser;
var UAParser = require('ua-parser-js');
var ua = !isNode && new UAParser(navigator.userAgent);
var marky = require('marky');
var median = require('median');
global.results = {};

// fix for Firefox max timing entries capped to 150:
// https://bugzilla.mozilla.org/show_bug.cgi?id=1331135
/* global performance */
if (typeof performance !== 'undefined' && performance.setResourceTimingBufferSize) {
  performance.setResourceTimingBufferSize(100000);
}

var pre = !isNode && global.document.getElementById('output');

function log(msg) {
  if (pre) {
    pre.textContent += msg;
  } else {
    console.log(msg);
  }
}

exports.log = log;

exports.startSuite = function (suiteName) {
  log('Starting suite: ' + suiteName + '\n\n');
};

exports.start = function (testCase, iter) {
  var key = testCase.name;
  log('Starting test: ' + key + ' with ' + testCase.assertions +
    ' assertions and ' + iter + ' iterations... ');
  global.results[key] = {
    iterations: []
  };
};

exports.end = function (testCase) {
  var key = testCase.name;
  var obj = global.results[key];
  obj.median = median(obj.iterations);
  log('median: ' + obj.median + ' ms\n');
};

exports.startIteration = function (testCase) {
  marky.mark(testCase.name);
};

exports.endIteration = function (testCase) {
  var entry = marky.stop(testCase.name);
  global.results[testCase.name].iterations.push(entry.duration);
};

exports.complete = function () {
  global.results.completed = true;
  if (isNode) {
    global.results.client = {node: process.version};
  } else {
    global.results.client = {
      browser: ua.getBrowser(),
      device: ua.getDevice(),
      engine: ua.getEngine(),
      cpu: ua.getCPU(),
      os : ua.getOS(),
      userAgent: navigator.userAgent
    };
  }
  console.log(global.results);
  log('\nTests Complete!\n\n');
};

