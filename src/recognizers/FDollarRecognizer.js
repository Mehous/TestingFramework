/*eslint-disable*/



/**
 *  $Flexible recognizer (JavaScript version)
 *    
 *   Extends the $𝑃^3 with $𝑃+^3's flexible cloud matching.
 *      
 */

const Recognizer = require('../framework/recognizers/Recognizer').Recognizer;
const { performance } = require('perf_hooks');
//The timer to measure the execution time
const name = "FDollarRecognizer";
//Name of the recognizer



/**
 * Point class
 */
class Point {
  constructor(x, y, z) {
    // (x, y, z) coordinates
    this.x = x;
    this.y = y;
    this.z = z;
  }
}

/**
 * FDollarRecognizer Variables
 */
numberOfPoints = 4;

/**
 * PointCloud constructor
 */
class PointCloud {
  constructor(name, points) {
      this.Name = name;
      this.Points = resample(points);
      this.Points = scale(this.Points);
      this.Points = translate(this.Points,  new Point(0, 0, 0));
  }
}


/**
 *  FDollarRecognizer constructor.
 */
class FDollarRecognizer extends Recognizer {

  constructor(N_Points, dataset) {
    super();
    numberOfPoints = N_Points;
    this.trainingTemplates = new Array();
    if (dataset !== undefined) {
      dataset.getGestureClass().forEach((gesture, key, self) => {
        gesture.getSample().forEach(sample => {
          this.addGesture(gesture.name, sample);
        }
        );
      });
    }
  }

    /**
     * Add a template to the training set
     */
  addGesture(name, data, dataset) {
    let points = convert(data, dataset);
    let template = new PointCloud(name,points);
    this.trainingTemplates.push(template);
    var num = 0;
    for (var i = 0; i < this.trainingTemplates.length; i++) {
      if (this.trainingTemplates[i].Name == name)
        num++;
    }
    return num;
  }


 /**
   *  Determine the  class of the candidate gesture
   *  by cloud-matching against the stored training templates.
   */
  recognize(data,dataset) {
    //Convert  data to an array of points
    let points = convert(data,dataset);
    // start timer
    let t0 = performance.now();

    let minDissimilarity = +Infinity;
    let bestTemplate = -1;

    // preprocess the points to represent the candidate gesture
    let candidate = new PointCloud("",points);

    // cloud-matching against all stored training templates
    for (let t = 0; t < this.trainingTemplates.length; t += 1) {
      let dissimilarity = cloudMatching(
        candidate.Points, this.trainingTemplates[t].Points, minDissimilarity
      );

      // if less dissimilar: update info
      if (dissimilarity < minDissimilarity) {
        minDissimilarity = dissimilarity;
        bestTemplate = t;
      }
    }
    // stop timer
    let t1 = performance.now();
    return (bestTemplate == -1) ? { 'Name': 'No match', 'Time': t1 - t0, 'Score': 0.0 } : { 'Name': this.trainingTemplates[bestTemplate].Name, 'Time': t1 - t0, 'Score': minDissimilarity };
  }
 
}



/**
 * Convert the sample data from the dataset to an array containing points
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

  



/**
 *  Compute the dissimilarity score between two arrays of points via the
 *   cloud matching procedure in both directions.
 */
function cloudMatching(pointsA, pointsB, minSoFar) {
  return Math.min(
    cloudDistance(pointsA, pointsB, minSoFar),
    cloudDistance(pointsB, pointsA, minSoFar)
  );
}


/**
 *  Compute the dissimilarity score between two arrays of points via
 *  the flexible cloud matching procedure.
 */
function cloudDistance(pointsA, pointsB, minSoFar) {
  let dissimilarity = 0;

  // all points from Array1 are *not* matched for now
  let matchedShapes = [];
  for (let j = 0; j < this.numberOfPoints; j += 1) {
    matchedShapes[j] = false;
  }

  // match each point from gestureA with the closest point from gestureB
  for (let i = 0; i < this.numberOfPoints; i += 1) {
    let minD = +Infinity;
    let indexShape = -1;
    for (let j = 0; j < this.numberOfPoints; j += 1) {
      let d = betweenPointsEuclideanDistance(pointsA[i], pointsB[j]);
      if (d < minD) {
        minD = d;
        indexShape = j;
      }
    }
    dissimilarity += minD;
    matchedShapes[indexShape] = true;
    if (dissimilarity > minSoFar) return dissimilarity; // early abandoning
  }
  // match each point from Array2 that has not been matched yet with the
  // closest point from Array1 
  for (let j = 0; j < this.numberOfPoints; j += 1) {
    if (!matchedShapes[j]) {
      let minD = +Infinity;
      for (let i = 0; i < this.numberOfPoints; i += 1) {
        let d = betweenPointsEuclideanDistance(pointsA[i], pointsB[j]);
        if (d < minD) minD = d;
      }
      dissimilarity += minD;
      matchedShapes[j] = true;
      if (dissimilarity > minSoFar) return dissimilarity; // early abandoning
    }
  }
  return dissimilarity;
}


/******************************************************************************************
 * Preprocessing
 * */


/**
 * Resample the number of points to n points
 */
function resample(points) {

  // the interval between two resampled points depends of the number of points
  // and the total length of each array points 
  intervals = pathLength(points) / (numberOfPoints - 1);
  let resampledpoints = new Array(points[0])
  // resample the point when it is too far away from the previous
  dist = 0.0;
  for (let i = 1; i < points.length; i += 1) {
    let dist2 = betweenPointsEuclideanDistance(points[i - 1], points[i]);
    if ((dist + dist2) >= intervals) {
      let p = new Point(
        points[i - 1].x + ((intervals - dist) / dist2) * (points[i].x - points[i - 1].x),
        points[i - 1].y + ((intervals - dist) / dist2) * (points[i].y - points[i - 1].y),
        points[i - 1].z + ((intervals - dist) / dist2) * (points[i].z - points[i - 1].z)
      );
      resampledpoints.push(p);
      points.splice(i, 0, p);
      dist = 0.0;
    }
    else dist += dist2;
  }
  // it may fall a rounding-error short of adding the last point
  if (resampledpoints.length < numberOfPoints) {
    resampledpoints.push(points[points.length - 1]);
  }
  return resampledpoints;
}

/**
 * Rescale gesture points
 */
function scale(points) {
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
    newpoints[newpoints.length] = new Point(qx, qy, qz);
  }
  return newpoints;
}

/**
 *  Translate all  points towards the reference.
 *
 *  @return the translated  points.
 */
function translate(points, reference) {
  let newpoints = [];
  let centroid = Centroid(points);

  for (let i = 0; i < this.numberOfPoints; i += 1) {
    newpoints[i] = new Point(
      points[i].x + reference.x - centroid.x,
      points[i].y + reference.y - centroid.y,
      points[i].z + reference.z - centroid.z
    );

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
  let count = 0;
  let dX = 0.0, dY = 0.0, dZ = 0.0;
  for (let i = 0; i < points.length; i += 1) {
    dX += points[i].x;
    dY += points[i].y;
    dZ += points[i].z;
    count += 1;
  }
  return new Point(dX / count, dY / count, dZ / count);
}

/**
 * Compute the total length of the gesture: the sum of the distance between points
 */
function pathLength(points) {
  let length = 0.0;
  for (let i = 1; i < points.length - 1; i += 1) {
    length += betweenPointsEuclideanDistance(points[i - 1], points[i]);
  }
  return length;
}
 
/**
 * Compute the Euclidean distance between two points pt1 and pt2.
 */
function betweenPointsEuclideanDistance(pt1, pt2) {
  let dX = pt2.x - pt1.x;
  let dY = pt2.y - pt1.y;
  let dZ = pt2.z - pt1.z;
  return Math.sqrt(dX * dX + dY * dY + dZ * dZ);
}

module.exports = {
  Point,
  FDollarRecognizer
};