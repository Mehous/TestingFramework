/* eslint-disable */

/**
 * The $P^3 Recognizer 
 * 
 * a 3D extension of The $P Point-Cloud Recognizer (JavaScript version)
 *
 *  Radu-Daniel Vatavu, Ph.D.
 *  University Stefan cel Mare of Suceava
 *  Suceava 720229, Romania
 *  vatavu@eed.usv.ro
 *
 *  Lisa Anthony, Ph.D.
 *  UMBC
 *  Information Systems Department
 *  1000 Hilltop Circle
 *  Baltimore, MD 21250
 *  lanthony@umbc.edu
 *
 *  Jacob O. Wobbrock, Ph.D.
 *  The Information School
 *  University of Washington
 *  Seattle, WA 98195-2840
 *  wobbrock@uw.edu
 *
 * The academic publication for the $P recognizer, and what should be
 * used to cite it, is:
 *
 *     Vatavu, R.-D., Anthony, L. and Wobbrock, J.O. (2012).
 *     Gestures as point clouds: A $P recognizer for user interface
 *     prototypes. Proceedings of the ACM Int'l Conference on
 *     Multimodal Interfaces (ICMI '12). Santa Monica, California
 *     (October 22-26, 2012). New York: ACM Press, pp. 273-280.
 *     https://dl.acm.org/citation.cfm?id=2388732
 *
 * This software is distributed under the "New BSD License" agreement:
 *
 * Copyright (C) 2012, Radu-Daniel Vatavu, Lisa Anthony, and
 * Jacob O. Wobbrock. All rights reserved. Last updated July 14, 2018.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *    * Redistributions of source code must retain the above copyright
 *      notice, this list of conditions and the following disclaimer.
 *    * Redistributions in binary form must reproduce the above copyright
 *      notice, this list of conditions and the following disclaimer in the
 *      documentation and/or other materials provided with the distribution.
 *    * Neither the names of the University Stefan cel Mare of Suceava,
 *	University of Washington, nor UMBC, nor the names of its contributors
 *	may be used to endorse or promote products derived from this software
 *	without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL Radu-Daniel Vatavu OR Lisa Anthony
 * OR Jacob O. Wobbrock BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT
 * OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS
 * INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT,
 * STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY
 * OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF
 * SUCH DAMAGE.
**/

const Recognizer = require("../framework/recognizers/Recognizer").Recognizer;
const { performance } = require("perf_hooks");
//The timer to measure the execution time
const name = "P3DollarRecognizer";
//Name of the recognizer


/**
 * Point class
 */
class Point {
  constructor(x, y, z, id) {
    // (x, y, z) coordinates
    this.x = x;
    this.y = y;
    this.z = z;
    this.id = id;
  }
}

/**
 * PointCloud class
 */
class PointCloud {
  constructor(name, points) {
    this.Name = name;
    this.Points = Resample(points, NumPoints);
    this.Points = Scale(this.Points);
    this.Points = TranslateTo(this.Points, Origin);
  }
}

//
// P3DollarRecognizer constants
//
var NumPoints=4;
const Origin = new Point(0, 0, 0, 0);

/**
 * P3DollarRecognizer class
 */
class P3DollarRecognizer extends Recognizer {
  constructor(N) {
    super();
    NumPoints = N;
    this.PointClouds = new Array();
  }

   /**
     * Add a template to the training set
     */
  addGesture(name, sample, dataset) {
    let points = convert(sample, dataset);
    this.PointClouds.push(new PointCloud(name, points));
    var num = 0;
    for (var i = 0; i < this.PointClouds.length; i++) {
      if (this.PointClouds[i].Name == name) num++;
    }
    return num;
  }

 /**
   *  Determine the  class of the candidate gesture
   *  by cloud-matching against the stored training templates.
   */
  recognize(sample, dataset) {
    let points = convert(sample, dataset);
    var t0 = performance.now();
    var candidate = new PointCloud("", points);

    var u = -1;
    var b = +Infinity;
    for (
      var i = 0;
      i < this.PointClouds.length;
      i++ // for each point-cloud template
    ) {
      var d = GreedyCloudMatch(candidate.Points, this.PointClouds[i]);
      if (d < b) {
        b = d; // best (least) distance
        u = i; // point-cloud index
      }
    }
    var t1 = performance.now();
    return u == -1
      ? { Name: "No match", Time: t1 - t0 }
      : { Name: this.PointClouds[u].Name, Time: t1 - t0 };
  }
}

/********************************************************************
 *  Private helper functions 
 *  
 */

function GreedyCloudMatch(points, P) {
  var e = 0.5;
  var step = Math.floor(Math.pow(points.length, 1.0 - e));
  var min = +Infinity;
  for (var i = 0; i < points.length; i += step) {
    var d1 = CloudDistance(points, P.Points, i);
    var d2 = CloudDistance(P.Points, points, i);
    min = Math.min(min, Math.min(d1, d2)); // min3
  }
  return min;
}

/**
 *  Match  two gesture Pointsclouds  (pts1 and pts2 ) .
 *  Compute the dissimilarity score between two sets of points.
 */
function CloudDistance(pts1, pts2, start) {
  var matched = new Array(pts1.length); // pts1.length == pts2.length
  for (var k = 0; k < pts1.length; k++) matched[k] = false;
  var sum = 0;
  var i = start;
  do {
    var index = -1;
    var min = +Infinity;
    for (var j = 0; j < matched.length; j++) {
      if (!matched[j]) {
        var d = Distance(pts1[i], pts2[j]);
        if (d < min) {
          min = d;
          index = j;
        }
      }
    }
    matched[index] = true;
    var weight = 1 - ((i - start + pts1.length) % pts1.length) / pts1.length;
    sum += weight * min;
    i = (i + 1) % pts1.length;
  } while (i != start);
  return sum;
}


/**
 * Convert the sample data from the dataset to objects containing the gestures
 */
function convert(sample, dataset) {
	let points = [];
	//Code for Unistroke Unipath
	if (dataset == "SHREC2019") {
	  //Code for unistroke gestures mutlipath
	  sample.paths["Palm"].strokes.forEach((point, stroke_id) => {
		  points.push(new Point(point.x, point.y, point.z, point.stroke_id));
		});
	} else {    
	  sample.strokes.forEach((point, stroke_id) => {
		  points.push(new Point(point.x, point.y, point.z, point.stroke_id));
		});
	}
	return points;
  }


/******************************************************************************************
 * Preprocessing
 * */


/**
 * Resample the number of points to n points
 */
function Resample(points, n) {
  var I = PathLength(points) / (n - 1); // interval length
  var D = 0.0;
  var newpoints = new Array(points[0]);
  for (var i = 1; i < points.length; i++) {
    if (points[i].id == points[i - 1].id) {
      var d = Distance(points[i - 1], points[i]);
      if (D + d >= I) {
        var qx =
          points[i - 1].x + ((I - D) / d) * (points[i].x - points[i - 1].x);
        var qy =
          points[i - 1].y + ((I - D) / d) * (points[i].y - points[i - 1].y);
        var qz =
          points[i - 1].z + ((I - D) / d) * (points[i].z - points[i - 1].z);
        var q = new Point(qx, qy, qz, points[i].id);
        newpoints[newpoints.length] = q; // append new point 'q'
        points.splice(i, 0, q); // insert 'q' at position i in points s.t. 'q' will be the next i
        D = 0.0;
      } else D += d;
    }
  }
  if (newpoints.length == n - 1)
    // sometimes we fall a rounding-error short of adding the last point, so add it if so
    newpoints[newpoints.length] = new Point(
      points[points.length - 1].x,
      points[points.length - 1].y,
      points[points.length - 1].z,
      points[points.length - 1].id
    );
  return newpoints;
}

/**
 * Rescale gesture points
 */
function Scale(points) {
  var minX = +Infinity,
    maxX = -Infinity,
    minY = +Infinity,
    maxY = -Infinity,
    minZ = +Infinity,
    maxZ = -Infinity;
  for (var i = 0; i < points.length; i++) {
    minX = Math.min(minX, points[i].x);
    minY = Math.min(minY, points[i].y);
    minZ = Math.min(minZ, points[i].z);
    maxX = Math.max(maxX, points[i].x);
    maxY = Math.max(maxY, points[i].y);
    maxZ = Math.max(maxZ, points[i].z);
  }
  var size = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
  var newpoints = new Array();
  for (var i = 0; i < points.length; i++) {
    var qx = (points[i].x - minX) / size;
    var qy = (points[i].y - minY) / size;
    var qz = (points[i].z - minZ) / size;
    newpoints[newpoints.length] = new Point(qx, qy, qz, points[i].id);
  }
  return newpoints;
}

/**
 * Translate all points towards a reference point
 */
function TranslateTo(points, pt) {
  var c = Centroid(points);
  var newpoints = new Array();
  for (var i = 0; i < points.length; i++) {
    var qx = points[i].x + pt.x - c.x;
    var qy = points[i].y + pt.y - c.y;
    var qz = points[i].z + pt.z - c.z;
    newpoints[newpoints.length] = new Point(qx, qy, qz, points[i].id);
  }
  return newpoints;
}


/****************************************************************************************
 * Helper functions
 */
 
/**
 *  Compute the global centroid of all  points.
 */
function Centroid(points) {
  var x = 0.0,
    y = 0.0,
    z = 0.0;
  for (var i = 0; i < points.length; i++) {
    x += points[i].x;
    y += points[i].y;
    z += points[i].z;
  }
  x /= points.length;
  y /= points.length;
  z /= points.length;
  return new Point(x, y, z, 0);
}

/**
 * Compute the total length of the gesture: the sum of the distance between points.
 */
function PathLength(points) {
  var d = 0.0;
  for (var i = 1; i < points.length; i++) {
    if (points[i].id == points[i - 1].id)
      d += Distance(points[i - 1], points[i]);
  }
  return d;
}

/**
 *  Compute the Euclidean distance between two points pt1 and pt2.
 */
function Distance(pt1, pt2) {
    var dx = pt2.x - pt1.x;
    var dy = pt2.y - pt1.y;
    var dz = pt2.z - pt1.z;
	return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

module.exports = {
  P3DollarRecognizer,
};
