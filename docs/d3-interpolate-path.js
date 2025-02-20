(function (global, factory) {
typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
typeof define === 'function' && define.amd ? define(['exports'], factory) :
(global = global || self, factory(global.d3 = global.d3 || {}));
}(this, function (exports) { 'use strict';

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

function _extends() {
  _extends = Object.assign || function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];

      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }

    return target;
  };

  return _extends.apply(this, arguments);
}

function _objectSpread(target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i] != null ? arguments[i] : {};
    var ownKeys = Object.keys(source);

    if (typeof Object.getOwnPropertySymbols === 'function') {
      ownKeys = ownKeys.concat(Object.getOwnPropertySymbols(source).filter(function (sym) {
        return Object.getOwnPropertyDescriptor(source, sym).enumerable;
      }));
    }

    ownKeys.forEach(function (key) {
      _defineProperty(target, key, source[key]);
    });
  }

  return target;
}

function _toConsumableArray(arr) {
  return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _nonIterableSpread();
}

function _arrayWithoutHoles(arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = new Array(arr.length); i < arr.length; i++) arr2[i] = arr[i];

    return arr2;
  }
}

function _iterableToArray(iter) {
  if (Symbol.iterator in Object(iter) || Object.prototype.toString.call(iter) === "[object Arguments]") return Array.from(iter);
}

function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance");
}

/**
 * de Casteljau's algorithm for drawing and splitting bezier curves.
 * Inspired by https://pomax.github.io/bezierinfo/
 *
 * @param {Number[][]} points Array of [x,y] points: [start, control1, control2, ..., end]
 *   The original segment to split.
 * @param {Number} t Where to split the curve (value between [0, 1])
 * @return {Object} An object { left, right } where left is the segment from 0..t and
 *   right is the segment from t..1.
 */
function decasteljau(points, t) {
  var left = [];
  var right = [];

  function decasteljauRecurse(points, t) {
    if (points.length === 1) {
      left.push(points[0]);
      right.push(points[0]);
    } else {
      var newPoints = Array(points.length - 1);

      for (var i = 0; i < newPoints.length; i++) {
        if (i === 0) {
          left.push(points[0]);
        }

        if (i === newPoints.length - 1) {
          right.push(points[i + 1]);
        }

        newPoints[i] = [(1 - t) * points[i][0] + t * points[i + 1][0], (1 - t) * points[i][1] + t * points[i + 1][1]];
      }

      decasteljauRecurse(newPoints, t);
    }
  }

  if (points.length) {
    decasteljauRecurse(points, t);
  }

  return {
    left: left,
    right: right.reverse()
  };
}
/**
 * Convert segments represented as points back into a command object
 *
 * @param {Number[][]} points Array of [x,y] points: [start, control1, control2, ..., end]
 *   Represents a segment
 * @return {Object} A command object representing the segment.
 */


function pointsToCommand(points) {
  var command = {};

  if (points.length === 4) {
    command.x2 = points[2][0];
    command.y2 = points[2][1];
  }

  if (points.length >= 3) {
    command.x1 = points[1][0];
    command.y1 = points[1][1];
  }

  command.x = points[points.length - 1][0];
  command.y = points[points.length - 1][1];

  if (points.length === 4) {
    // start, control1, control2, end
    command.type = 'C';
  } else if (points.length === 3) {
    // start, control, end
    command.type = 'Q';
  } else {
    // start, end
    command.type = 'L';
  }

  return command;
}
/**
 * Runs de Casteljau's algorithm enough times to produce the desired number of segments.
 *
 * @param {Number[][]} points Array of [x,y] points for de Casteljau (the initial segment to split)
 * @param {Number} segmentCount Number of segments to split the original into
 * @return {Number[][][]} Array of segments
 */


function splitCurveAsPoints(points, segmentCount) {
  segmentCount = segmentCount || 2;
  var segments = [];
  var remainingCurve = points;
  var tIncrement = 1 / segmentCount; // x-----x-----x-----x
  // t=  0.33   0.66   1
  // x-----o-----------x
  // r=  0.33
  //       x-----o-----x
  // r=         0.5  (0.33 / (1 - 0.33))  === tIncrement / (1 - (tIncrement * (i - 1))
  // x-----x-----x-----x----x
  // t=  0.25   0.5   0.75  1
  // x-----o----------------x
  // r=  0.25
  //       x-----o----------x
  // r=         0.33  (0.25 / (1 - 0.25))
  //             x-----o----x
  // r=         0.5  (0.25 / (1 - 0.5))

  for (var i = 0; i < segmentCount - 1; i++) {
    var tRelative = tIncrement / (1 - tIncrement * i);
    var split = decasteljau(remainingCurve, tRelative);
    segments.push(split.left);
    remainingCurve = split.right;
  } // last segment is just to the end from the last point


  segments.push(remainingCurve);
  return segments;
}
/**
 * Convert command objects to arrays of points, run de Casteljau's algorithm on it
 * to split into to the desired number of segments.
 *
 * @param {Object} commandStart The start command object
 * @param {Object} commandEnd The end command object
 * @param {Number} segmentCount The number of segments to create
 * @return {Object[]} An array of commands representing the segments in sequence
 */


function splitCurve(commandStart, commandEnd, segmentCount) {
  var points = [[commandStart.x, commandStart.y]];

  if (commandEnd.x1 != null) {
    points.push([commandEnd.x1, commandEnd.y1]);
  }

  if (commandEnd.x2 != null) {
    points.push([commandEnd.x2, commandEnd.y2]);
  }

  points.push([commandEnd.x, commandEnd.y]);
  return splitCurveAsPoints(points, segmentCount).map(pointsToCommand);
}

var commandTokenRegex = /[MLCSTQAHVmlcstqahv]|[\d.-]+/g;
/**
 * List of params for each command type in a path `d` attribute
 */

var numberInterpolate = function numberInterpolate(t, a, b) {
  return (1 - t) * a + t * b;
};

var intInterpolate = function intInterpolate(t, a, b) {
  return Math.round((1 - t) * a + t * b);
};

var toNumberCommand = function toNumberCommand(command) {
  return {
    name: command,
    interpolate: numberInterpolate
  };
};

var toIntCommand = function toIntCommand(command) {
  return {
    name: command,
    interpolate: intInterpolate
  };
};

var typeMap = {
  M: ['x', 'y'].map(toNumberCommand),
  L: ['x', 'y'].map(toNumberCommand),
  H: ['x'].map(toNumberCommand),
  V: ['y'].map(toNumberCommand),
  C: ['x1', 'y1', 'x2', 'y2', 'x', 'y'].map(toNumberCommand),
  S: ['x2', 'y2', 'x', 'y'].map(toNumberCommand),
  Q: ['x1', 'y1', 'x', 'y'].map(toNumberCommand),
  T: ['x', 'y'].map(toNumberCommand),
  A: [].concat(_toConsumableArray(['rx', 'ry', 'xAxisRotation'].map(toNumberCommand)), _toConsumableArray(['largeArcFlag', 'sweepFlag'].map(toIntCommand)), _toConsumableArray(['x', 'y'].map(toNumberCommand)))
}; // A: ['rx', 'ry', 'xAxisRotation', 'largeArcFlag', 'sweepFlag', 'x', 'y'].map(toNumberCommand),
// Add lower case entries too matching uppercase (e.g. 'm' == 'M')

Object.keys(typeMap).forEach(function (key) {
  typeMap[key.toLowerCase()] = typeMap[key];
});

function arrayOfLength(length, value) {
  var array = Array(length);

  for (var i = 0; i < length; i++) {
    array[i] = value;
  }

  return array;
}
/**
 * Converts a command object to a string to be used in a `d` attribute
 * @param {Object} command A command object
 * @return {String} The string for the `d` attribute
 */


function commandToString(command) {
  return "".concat(command.type).concat(typeMap[command.type].map(function (p) {
    return command[p.name];
  }).join(','));
}
/**
 * Converts command A to have the same type as command B.
 *
 * e.g., L0,5 -> C0,5,0,5,0,5
 *
 * Uses these rules:
 * x1 <- x
 * x2 <- x
 * y1 <- y
 * y2 <- y
 * rx <- 0
 * ry <- 0
 * xAxisRotation <- read from B
 * largeArcFlag <- read from B
 * sweepflag <- read from B
 *
 * @param {Object} aCommand Command object from path `d` attribute
 * @param {Object} bCommand Command object from path `d` attribute to match against
 * @return {Object} aCommand converted to type of bCommand
 */


function convertToSameType(aCommand, bCommand) {
  var conversionMap = {
    x1: 'x',
    y1: 'y',
    x2: 'x',
    y2: 'y'
  };
  var readFromBKeys = ['xAxisRotation', 'largeArcFlag', 'sweepFlag']; // convert (but ignore M types)

  if (aCommand.type !== bCommand.type && bCommand.type.toUpperCase() !== 'M') {
    var aConverted = {};
    Object.keys(bCommand).forEach(function (bKey) {
      var bValue = bCommand[bKey]; // first read from the A command

      var aValue = aCommand[bKey]; // if it is one of these values, read from B no matter what

      if (aValue === undefined) {
        if (readFromBKeys.includes(bKey)) {
          aValue = bValue;
        } else {
          // if it wasn't in the A command, see if an equivalent was
          if (aValue === undefined && conversionMap[bKey]) {
            aValue = aCommand[conversionMap[bKey]];
          } // if it doesn't have a converted value, use 0


          if (aValue === undefined) {
            aValue = 0;
          }
        }
      }

      aConverted[bKey] = aValue;
    }); // update the type to match B

    aConverted.type = bCommand.type;
    aCommand = aConverted;
  }

  return aCommand;
}
/**
 * Interpolate between command objects commandStart and commandEnd segmentCount times.
 * If the types are L, Q, or C then the curves are split as per de Casteljau's algorithm.
 * Otherwise we just copy commandStart segmentCount - 1 times, finally ending with commandEnd.
 *
 * @param {Object} commandStart Command object at the beginning of the segment
 * @param {Object} commandEnd Command object at the end of the segment
 * @param {Number} segmentCount The number of segments to split this into. If only 1
 *   Then [commandEnd] is returned.
 * @return {Object[]} Array of ~segmentCount command objects between commandStart and
 *   commandEnd. (Can be segmentCount+1 objects if commandStart is type M).
 */


function splitSegment(commandStart, commandEnd, segmentCount) {
  var segments = []; // line, quadratic bezier, or cubic bezier

  if (commandEnd.type === 'L' || commandEnd.type === 'Q' || commandEnd.type === 'C') {
    segments = segments.concat(splitCurve(commandStart, commandEnd, segmentCount)); // general case - just copy the same point
  } else {
    var copyCommand = _extends({}, commandStart); // convert M to L


    if (copyCommand.type === 'M') {
      copyCommand.type = 'L';
    }

    segments = segments.concat(arrayOfLength(segmentCount - 1).map(function () {
      return copyCommand;
    }));
    segments.push(commandEnd);
  }

  return segments;
}
/**
 * Extends an array of commandsToExtend to the length of the referenceCommands by
 * splitting segments until the number of commands match. Ensures all the actual
 * points of commandsToExtend are in the extended array.
 *
 * @param {Object[]} commandsToExtend The command object array to extend
 * @param {Object[]} referenceCommands The command object array to match in length
 * @param {Function} excludeSegment a function that takes a start command object and
 *   end command object and returns true if the segment should be excluded from splitting.
 * @return {Object[]} The extended commandsToExtend array
 */


function extend(commandsToExtend, referenceCommands, excludeSegment) {
  // compute insertion points:
  // number of segments in the path to extend
  var numSegmentsToExtend = commandsToExtend.length - 1; // number of segments in the reference path.

  var numReferenceSegments = referenceCommands.length - 1; // this value is always between [0, 1].

  var segmentRatio = numSegmentsToExtend / numReferenceSegments; // create a map, mapping segments in referenceCommands to how many points
  // should be added in that segment (should always be >= 1 since we need each
  // point itself).
  // 0 = segment 0-1, 1 = segment 1-2, n-1 = last vertex

  var countPointsPerSegment = arrayOfLength(numReferenceSegments).reduce(function (accum, d, i) {
    var insertIndex = Math.floor(segmentRatio * i); // handle excluding segments

    if (excludeSegment && insertIndex < commandsToExtend.length - 1 && excludeSegment(commandsToExtend[insertIndex], commandsToExtend[insertIndex + 1])) {
      // set the insertIndex to the segment that this point should be added to:
      // round the insertIndex essentially so we split half and half on
      // neighbouring segments. hence the segmentRatio * i < 0.5
      var addToPriorSegment = segmentRatio * i % 1 < 0.5; // only skip segment if we already have 1 point in it (can't entirely remove a segment)

      if (accum[insertIndex]) {
        // TODO - Note this is a naive algorithm that should work for most d3-area use cases
        // but if two adjacent segments are supposed to be skipped, this will not perform as
        // expected. Could be updated to search for nearest segment to place the point in, but
        // will only do that if necessary.
        // add to the prior segment
        if (addToPriorSegment) {
          if (insertIndex > 0) {
            insertIndex -= 1; // not possible to add to previous so adding to next
          } else if (insertIndex < commandsToExtend.length - 1) {
            insertIndex += 1;
          } // add to next segment

        } else if (insertIndex < commandsToExtend.length - 1) {
          insertIndex += 1; // not possible to add to next so adding to previous
        } else if (insertIndex > 0) {
          insertIndex -= 1;
        }
      }
    }

    accum[insertIndex] = (accum[insertIndex] || 0) + 1;
    return accum;
  }, []); // extend each segment to have the correct number of points for a smooth interpolation

  var extended = countPointsPerSegment.reduce(function (extended, segmentCount, i) {
    // if last command, just add `segmentCount` number of times
    if (i === commandsToExtend.length - 1) {
      var lastCommandCopies = arrayOfLength(segmentCount, _extends({}, commandsToExtend[commandsToExtend.length - 1])); // convert M to L

      if (lastCommandCopies[0].type === 'M') {
        lastCommandCopies.forEach(function (d) {
          d.type = 'L';
        });
      }

      return extended.concat(lastCommandCopies);
    } // otherwise, split the segment segmentCount times.


    return extended.concat(splitSegment(commandsToExtend[i], commandsToExtend[i + 1], segmentCount));
  }, []); // add in the very first point since splitSegment only adds in the ones after it

  extended.unshift(commandsToExtend[0]);
  return extended;
}
/**
 * Takes a path `d` string and converts it into an array of command
 * objects. Drops the `Z` character.
 *
 * @param {String|null} d A path `d` string
 */


function makeCommands(d) {
  // split into valid tokens
  var tokens = (d || '').match(commandTokenRegex) || [];
  var commands = [];
  var commandArgs;
  var command; // iterate over each token, checking if we are at a new command
  // by presence in the typeMap

  for (var i = 0; i < tokens.length; ++i) {
    commandArgs = typeMap[tokens[i]]; // new command found:

    if (commandArgs) {
      command = {
        type: tokens[i]
      }; // add each of the expected args for this command:

      for (var a = 0; a < commandArgs.length; ++a) {
        command[commandArgs[a].name] = +tokens[i + a + 1];
      } // need to increment our token index appropriately since
      // we consumed token args


      i += commandArgs.length;
      commands.push(command);
    }
  }

  return commands;
}
/**
 * Interpolate from A to B by extending A and B during interpolation to have
 * the same number of points. This allows for a smooth transition when they
 * have a different number of points.
 *
 * Ignores the `Z` character in paths unless both A and B end with it.
 *
 * @param {String} a The `d` attribute for a path
 * @param {String} b The `d` attribute for a path
 * @param {Function} excludeSegment a function that takes a start command object and
 *   end command object and returns true if the segment should be excluded from splitting.
 * @returns {Function} Interpolation function that maps t ([0, 1]) to a path `d` string.
 */


function interpolatePath(a, b, excludeSegment) {
  var aCommands = makeCommands(a);
  var bCommands = makeCommands(b);

  if (!aCommands.length && !bCommands.length) {
    return function nullInterpolator() {
      return '';
    };
  } // if A is empty, treat it as if it used to contain just the first point
  // of B. This makes it so the line extends out of from that first point.


  if (!aCommands.length) {
    aCommands.push(bCommands[0]); // otherwise if B is empty, treat it as if it contains the first point
    // of A. This makes it so the line retracts into the first point.
  } else if (!bCommands.length) {
    bCommands.push(aCommands[0]);
  } // extend to match equal size


  var numPointsToExtend = Math.abs(bCommands.length - aCommands.length);

  if (numPointsToExtend !== 0) {
    // B has more points than A, so add points to A before interpolating
    if (bCommands.length > aCommands.length) {
      aCommands = extend(aCommands, bCommands, excludeSegment); // else if A has more points than B, add more points to B
    } else if (bCommands.length < aCommands.length) {
      bCommands = extend(bCommands, aCommands, excludeSegment);
    }
  } // commands have same length now.
  // convert commands in A to the same type as those in B


  aCommands = aCommands.map(function (aCommand, i) {
    return convertToSameType(aCommand, bCommands[i]);
  }); // create mutable interpolated command objects

  var interpolatedCommands = aCommands.map(function (aCommand) {
    return _objectSpread({}, aCommand);
  });
  var addZ = (a == null || a[a.length - 1] === 'Z') && (b == null || b[b.length - 1] === 'Z');
  return function pathInterpolator(t) {
    // at 1 return the final value without the extensions used during interpolation
    if (t === 1) {
      return b == null ? '' : b;
    } // interpolate the commands using the mutable interpolated command objs
    // we can skip at t=0 since we copied aCommands to begin


    if (t > 0) {
      for (var i = 0; i < interpolatedCommands.length; ++i) {
        var aCommand = aCommands[i];
        var bCommand = bCommands[i];
        var interpolatedCommand = interpolatedCommands[i];
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = typeMap[interpolatedCommand.type][Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var arg = _step.value;
            interpolatedCommand[arg.name] = arg.interpolate(t, aCommand[arg.name], bCommand[arg.name]);
          }
        } catch (err) {
          _didIteratorError = true;
          _iteratorError = err;
        } finally {
          try {
            if (!_iteratorNormalCompletion && _iterator["return"] != null) {
              _iterator["return"]();
            }
          } finally {
            if (_didIteratorError) {
              throw _iteratorError;
            }
          }
        }
      }
    } // convert to a string (fastest concat: https://jsperf.com/join-concat/150)


    var interpolatedString = '';
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
      for (var _iterator2 = interpolatedCommands[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
        var _interpolatedCommand = _step2.value;
        interpolatedString += commandToString(_interpolatedCommand);
      }
    } catch (err) {
      _didIteratorError2 = true;
      _iteratorError2 = err;
    } finally {
      try {
        if (!_iteratorNormalCompletion2 && _iterator2["return"] != null) {
          _iterator2["return"]();
        }
      } finally {
        if (_didIteratorError2) {
          throw _iteratorError2;
        }
      }
    }

    if (addZ) {
      interpolatedString += 'Z';
    }

    return interpolatedString;
  };
}

exports.interpolatePath = interpolatePath;

Object.defineProperty(exports, '__esModule', { value: true });

}));
