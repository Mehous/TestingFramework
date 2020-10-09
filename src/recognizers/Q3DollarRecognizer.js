 /* eslint-disable */ 

/**
 * The $Q^3 Super-Quick Recognizer (JavaScript version)
 * 
 * 
 * a 3D extension of The $Q Super-Quick Recognizer (JavaScript version):
 *
 *  Nathan Magrofuoco
 *  Universite Catholique de Louvain
 *  Louvain-la-Neuve, Belgium
 *  nathan.magrofuoco@uclouvain.be
 *
 * Original $Q authors (C# version):
 *
 *  Radu-Daniel Vatavu, Ph.D.
 *  University Stefan cel Mare of Suceava
 *  Suceava 720229, Romania
 *  radu.vatavu@usm.ro
 *
 *  Lisa Anthony, Ph.D.
 *  Department of CISE
 *  University of Florida
 *  Gainesville, FL, USA 32611
 *  lanthony@cise.ufl.edu
 *
 *  Jacob O. Wobbrock, Ph.D.
 *  The Information School | DUB Group
 *  University of Washington
 *  Seattle, WA, USA 98195-2840
 *  wobbrock@uw.edu
 *
 * The academic publication for the $Q recognizer, and what should be
 * used to cite it, is:
 *
 *    Vatavu, R.-D., Anthony, L. and Wobbrock, J.O. (2018). $Q: A super-quick,
 *    articulation-invariant stroke-gesture recognizer for low-resource devices.
 *    Proceedings of the ACM Conference on Human-Computer Interaction with Mobile
 *    Devices and Services (MobileHCI '18). Barcelona, Spain (September 3-6, 2018).
 *    New York: ACM Press. Article No. 23.
 *    https://dl.acm.org/citation.cfm?id=3229434.3229465
 *
 * This software is distributed under the "New BSD License" agreement:
 *
 * Copyright (c) 2018-2019, Nathan Magrofuoco, Jacob O. Wobbrock, Radu-Daniel Vatavu,
 * and Lisa Anthony. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 *    * Redistributions of source code must retain the above copyright
 *      notice, this list of conditions and the following disclaimer.
 *    * Redistributions in binary form must reproduce the above copyright
 *      notice, this list of conditions and the following disclaimer in the
 *      documentation and/or other materials provided with the distribution.
 *    * Neither the names of the University Stefan cel Mare of Suceava,
 *      University of Washington, nor University of Florida, nor the names of its
 *      contributors may be used to endorse or promote products derived from this
 *      software without specific prior written permission.
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

const Recognizer = require('../framework/recognizers/Recognizer').Recognizer;
const { performance } = require('perf_hooks');
//The timer to measure the execution time
const name = "Q3DollarRecognizer";
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
		this.intX = 0; // for indexing into the LUT
		this.intY = 0; // for indexing into the LUT
		this.intZ = 0; // for indexing into the LUT
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
		this.Points = MakeIntCoords(this.Points); // fills in (intX, intY, intZ) values
		this.LUT = ComputeLUT(this.Points);
	}
}


/**
 * Q3DollarRecognizer variables
 */
NumPoints = 4;
const Origin = new Point(0, 0, 0, 0);
const MaxIntCoord = 1024; // (intX, intY, intZ) range from [0, MaxIntCoord - 1]
const LUTSize = 16; // default size of the lookup table is 16 x 16 x 16
const LUTScaleFactor = MaxIntCoord / LUTSize; // used to scale from (intX, intY, intZ) to LUT


/**
 * Q3DollarRecognizer class
 */
class Q3DollarRecognizer extends Recognizer {
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
  
  recognize(points, dataset) {
    let sample = convert(points, dataset);
    var t0 = performance.now();
    var candidate = new PointCloud("", sample);

    var u = -1;
    var b = +Infinity;
    for (
      var i = 0;
      i < this.PointClouds.length;
      i++ 
    ) {
      var d = CloudMatch(candidate, this.PointClouds[i], b);
      if (d < b) {
		b = d; 
		u = i; 
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


function CloudMatch(candidate, template, minSoFar)
{
	var n = candidate.Points.length;
	var step = Math.floor(Math.pow(n, 0.5));

	var LB1 = ComputeLowerBound(candidate.Points, template.Points, step, template.LUT);
	let LB2 = ComputeLowerBound(template.Points, candidate.Points, step, candidate.LUT);

	for (var i = 0, j = 0; i < n; i += step, j++) {
		if (LB1[j] < minSoFar)
			minSoFar = Math.min(minSoFar, CloudDistance(candidate.Points, template.Points, i, minSoFar));
		if (LB2[j] < minSoFar)
			minSoFar = Math.min(minSoFar, CloudDistance(template.Points, candidate.Points, i, minSoFar));
	}
	return minSoFar;
}


function CloudDistance(pts1, pts2, start, minSoFar)
{
	var n = pts1.length;
	var unmatched = new Array(); // indices for pts2 that are not matched
	for (var j = 0; j < n; j++)
		unmatched[j] = j;
	var i = start;  // start matching with point 'start' from pts1
	var weight = n; // weights decrease from n to 1
	var sum = 0.0;  // sum distance between the two clouds
	do
	{
		var u = -1;
		var b = +Infinity;
		for (var j = 0; j < unmatched.length; j++)
		{
			d = SqrEuclideanDistance(pts1[i], pts2[unmatched[j]]);
			if (d < b) {
				b = d;
				u = j;
			}
		}
		unmatched.splice(u, 1); // remove item at index 'u'
		sum += weight * b;
		if (sum >= minSoFar)
			return sum; // early abandoning
		weight--;
		i = (i + 1) % n;
	} while (i != start);
	return sum;
}



function ComputeLowerBound(pts1, pts2, step, LUT)
{
	var n = pts1.length;
	var LB = new Array(Math.floor(n / step) + 1);
	var SAT = new Array(n);
	LB[0] = 0.0;
	for (var i = 0; i < n; i++)
	{
		var x = Math.round(pts1[i].intX / LUTScaleFactor);
		var y = Math.round(pts1[i].intY / LUTScaleFactor);
		var z = Math.round(pts1[i].intZ / LUTScaleFactor);
		var index = LUT[x][y][z];
		var d = SqrEuclideanDistance(pts1[i], pts2[index]);
		SAT[i] = (i == 0) ? d : SAT[i - 1] + d;
		LB[0] += (n - i) * d;
	}
	for (var i = step, j = 1; i < n; i += step, j++)
		LB[j] = LB[0] + i * SAT[n-1] - n * SAT[i-1];
	return LB;
}

/**
 * Compute the coordinates (intX, intY, intZ) of points
 */
function MakeIntCoords(points)
{
	for (var i = 0; i < points.length; i++) {
		points[i].intX = Math.round((points[i].x + 1.0) / 2.0 * (MaxIntCoord - 1));
		points[i].intY = Math.round((points[i].y + 1.0) / 2.0 * (MaxIntCoord - 1));
		points[i].intZ = Math.round((points[i].z + 1.0) / 2.0 * (MaxIntCoord - 1));
	}
	return points;
}

/**
 * Compute the LookUp Table
 */
function ComputeLUT(points)
{
	var LUT = new Array();
	for (var i = 0; i < LUTSize; i++) {
		LUT[i] = new Array();
		for (var j = 0; j < LUTSize; j++) {
			LUT[i][j] = new Array();
		}
	}

	for (var x = 0; x < LUTSize; x++) {
		for (var y = 0; y < LUTSize; y++) {
			for (var z = 0; z < LUTSize; z++) {
				var u = -1;
				var b = +Infinity;
				for (var i = 0; i < points.length; i++)	{
					var row = Math.round(points[i].intX / LUTScaleFactor);
					var col = Math.round(points[i].intY / LUTScaleFactor);
					var layer = Math.round(points[i].intZ / LUTScaleFactor);
					var d = ((row - x) * (row - x)) + ((col - y) * (col - y)) + ((layer - z) * (layer - z));
					if (d < b) {
						b = d;
						u = i;
					}
				}
				LUT[x][y][z] = u;
			}
    	}
	}
  	return LUT;
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
function Resample(points, n)
{
	var I = PathLength(points) / (n - 1); // interval length
	var D = 0.0;
	var newpoints = new Array(points[0]);
	for (var i = 1; i < points.length; i++)
	{
		if (points[i].id == points[i-1].id)
		{
			var d = EuclideanDistance(points[i-1], points[i]);
			if ((D + d) >= I)
			{
				var qx = points[i-1].x + ((I - D) / d) * (points[i].x - points[i-1].x);
				var qy = points[i-1].y + ((I - D) / d) * (points[i].y - points[i-1].y);
				var qz = points[i-1].z + ((I - D) / d) * (points[i].z - points[i-1].z);
				var q = new Point(qx, qy, qz, points[i].id);
				newpoints[newpoints.length] = q; // append new point 'q'
				points.splice(i, 0, q); // insert 'q' at position i in points s.t. 'q' will be the next i
				D = 0.0;
			}
			else D += d;
		}
	}
	if (newpoints.length == n - 1) // sometimes we fall a rounding-error short of adding the last point, so add it if so
		newpoints[newpoints.length] = new Point(points[points.length - 1].x, points[points.length - 1].y, points[points.length - 1].z, points[points.length - 1].id);
	return newpoints;
}

/**
 * Rescale gesture points
 */
function Scale(points)
{
	var minX = +Infinity, maxX = -Infinity, minY = +Infinity, maxY = -Infinity, minZ = +Infinity, maxZ = -Infinity;
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
function TranslateTo(points, pt) 
{
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
function Centroid(points)
{
	var x = 0.0, y = 0.0, z = 0.0;
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
 * Compute the total length of the gesture: the sum of the distance between points
 */
function PathLength(points) // length traversed by a point path
{
	var d = 0.0;
	for (var i = 1; i < points.length; i++) {
		if (points[i].id == points[i-1].id)
			d += EuclideanDistance(points[i-1], points[i]);
	}
	return d;
}

/**
 *  Compute the squared Euclidean distance between two points pt1 and pt2.
 */
function SqrEuclideanDistance(pt1, pt2)
{
	var dx = pt2.x - pt1.x;
	var dy = pt2.y - pt1.y;
	var dz = pt2.z - pt1.z;
	return (dx * dx + dy * dy + dz * dz);
}

/**
 *  Compute the Euclidean distance between two points pt1 and pt2.
 */
function EuclideanDistance(pt1, pt2)
{
	var s = SqrEuclideanDistance(pt1, pt2);
	return Math.sqrt(s);
}

module.exports = {
    Q3DollarRecognizer
}
