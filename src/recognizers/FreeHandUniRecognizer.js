/*eslint-disable*/


/**
 * The Free-Hand unistroke Recognizer (JavaScript version)
 *  Our free-hand recognizer extends the $P gesture recognizer to 3-D gestures  
 *  for unipath single stroke gesture.
 * 
 * It is derived from the FreeHand recognizer pseudocode which extends the 2D gesture recognizer $P++ 
 * 
 * http://www.eed.usv.ro/mintviz/projects/GIVISIMP/data/Pseudocode2.pdf
 */

const Recognizer = require('../framework/recognizers/Recognizer').Recognizer;
const { performance } = require('perf_hooks');
//The timer to measure the execution time
const name = "FreeHandUniRecognizer";
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
 * PointCloud constructor
 */
class PointCloud {
    constructor(name, points) {
        this.Name = name;
        this.Points = Resample(points, NumPoints);
        this.Points = GestureRescale(this.Points);
        this.Points = TranslateToOrigin(this.Points, NumPoints);
    }
}

/**
 * FreeHandUniRecognizer Variables
 */
NumPoints = 4;

/**
 * FreeHandUniRecognizer constructor
 */
class FreeHandUniRecognizer extends Recognizer {
  constructor(N, dataset) {
    super();
    NumPoints = N;
    this.PointClouds = new Array();
    if (dataset !== undefined) {
      dataset.getGestureClass().forEach((gesture, key, self) => {
        gesture.getSample().forEach((sample) => {
          this.addGesture(gesture.name, sample);
        });
      });
    }
  }

  /**
   * Add a template to the training set
   */
  addGesture(name, data, dataset) {
    let points = convert(data, dataset);
    this.PointClouds[this.PointClouds.length] = new PointCloud(name, points);
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
  recognize(data, dataset) {
    //Convert  data to an array of points
    let points = convert(data, dataset);
    //Start timer
    let t0 = performance.now();

    var u = -1;
    var Dissimilarity = Infinity;

    //Preprocess the points to represent the gesture
    var candidate = new PointCloud("", points);

    // for each point-cloud template Match against point-cloud candidate
    //and vice versa
    for (var i = 0; i < this.PointClouds.length; i++) {
      var d = Math.min(
        CloudDistance(candidate.Points, this.PointClouds[i].Points, NumPoints),
        CloudDistance(this.PointClouds[i].Points, candidate.Points, NumPoints)
      );

      //if the dissimilarity is less than the best dissimilarity, then update the info
      if (d < Dissimilarity) {
        Dissimilarity = d; // best (least) dissimilarity
        u = i; // point-cloud index
      }
    }
    //End timer
    var t1 = performance.now();
    return u == -1
      ? { Name: "No match", Time: t1 - t0, Score: 0.0 }
      : {
          Name: this.PointClouds[u].Name,
          Time: t1 - t0,
          Score: Dissimilarity > 1.0 ? 1.0 / Dissimilarity : 1.0,
        };
  }
}

/**
 *  Match  two gesture Pointsclouds  (pointsCloud1 and pointsCloud2 ) .
 */
function CloudDistance(pointsCloud1, pointsCloud2, npt) {
    let matched = new Array(npt);
    let sum = 0;
    //Initialize the Flag array to False which indicates
    // that any point from gesture1 has been matched with a point from gesture2
    for (let i = 0; i < npt; i++)
        matched[i] = false;
    // match gesture points from pointsCloud1 with points from pointsCloud2; 1-to-many matchings allowed, more flexible
    for (let i = 0; i < npt; i++) {
        let mininmumDistance = Infinity;
        let index = -1;
        for (let j = 0; j < npt; j++) {
            let distance = EuclideanDistance(pointsCloud1[i], pointsCloud2[j]);
            if (distance < mininmumDistance) {
                mininmumDistance = distance;
                index = j;
            }
        }
        matched[index] = true;
        //No weights assigned to points for the distance calculation
        sum += mininmumDistance;
    }
    // match remaining gesture points pointsCloud2 with points from pointsCloud1; 1-to-many matchings allowed
    for (let j = 0; j < matched.length; j++) {
        if (!matched[j]) {
            let minimumDistance = Infinity;
            for (let i = 0; i < npt; i++) {
                let distance = EuclideanDistance(pointsCloud1[i], pointsCloud2[j]);
                if (distance < minimumDistance)
                    minimumDistance = distance;
            }
            sum += minimumDistance;
        }
    }
    return sum;
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

/******************************************************************************************
 * Preprocessing
 * */

/**
 * Resample the number of points to n points
 */
function Resample(points, n) {
    let Interval = PathLength(points) / (n - 1);
    let Distance = 0;
    let newpoints = new Array(points[0]);
    //if the distance between two consecutive points is greater than the interval resample the points
    for (let i = 1; i < points.length; i++) {
        let PointsEuclidDist = EuclideanDistance(points[i - 1], points[i]);
        if ((Distance + PointsEuclidDist) >= Interval) {
            let x = points[i - 1].x + ((Interval - Distance) / PointsEuclidDist) * (points[i].x - points[i - 1].x);
            let y = points[i - 1].y + ((Interval - Distance) / PointsEuclidDist) * (points[i].y - points[i - 1].y);
            let z = points[i - 1].z + ((Interval - Distance) / PointsEuclidDist) * (points[i].z - points[i - 1].z);
            let NPoint = new Point(x, y, z, points[i].id);
            newpoints.push(NPoint);
            points.splice(i, 0, NPoint); // insert 'NPoint' at position i in points s.t. 'NPoint' will be the next i
            Distance = 0.0;
        }
        else Distance += PointsEuclidDist;
    }
    // sometimes we fall a rounding-error short of adding the last point, so add it if so
    if (newpoints.length == n - 1)
        newpoints[newpoints.length] = new Point(points[points.length - 1].x, points[points.length - 1].y,
            points[points.length - 1].z, points[points.length - 1].id);
    return newpoints;
}
 
/**
 * Rescale gesture points
 */
function GestureRescale(points) {
    let newpoints = [];
    let x_min = Infinity, y_min = Infinity, z_min = Infinity,
        x_max = -Infinity, y_max = -Infinity, z_max = -Infinity;
    for (let i = 0; i < points.length; i++) {
        x_min = Math.min(x_min, points[i].x);
        y_min = Math.min(y_min, points[i].y);
        z_min = Math.min(z_min, points[i].z);
        x_max = Math.max(x_max, points[i].x);
        y_max = Math.max(y_max, points[i].y);
        z_max = Math.max(z_max, points[i].z);
    }
    let scale = Math.max((x_max - x_min), (y_max - y_min), (z_max - z_min));
    for (let i = 0; i < points.length; i++) {
        let x = (points[i].x - x_min) / scale;
        let y = (points[i].y - y_min) / scale;
        let z = (points[i].z - z_min) / scale;
        newpoints[i] = new Point(x, y, z, points[i].id);
    }
    return newpoints;
}

/**
 * Translate all points to the origin
 */
function TranslateToOrigin(points, n) {
    let centroid = [0, 0, 0];
    for (let i = 0; i < points.length; i++) {
        centroid[0] = centroid[0] + points[i].x;
        centroid[1] = centroid[1] + points[i].y;
        centroid[2] = centroid[2] + points[i].z;
    }
    centroid[0] = centroid[0] / n;
    centroid[1] = centroid[1] / n;
    centroid[2] = centroid[2] / n;
    let newpoints = [];
    for (let i = 0; i < points.length; i++) {
        let x = points[i].x - centroid[0];
        let y = points[i].y - centroid[1];
        let z = points[i].z - centroid[2];
        newpoints[i] = new Point(x, y, z, points[i].id);
    }
    return newpoints;
}



/****************************************************************************************
 * Helper functions
 */

/**
 * Compute the total length of the gesture: the sum of the distance between points
*/
 function PathLength(points) {
    let length = 0.0;
    for (let i = 1; i < points.length - 1; i += 1) {
      length += EuclideanDistance(points[i - 1], points[i]);
    }
    return length;
  }

/**
 * Compute the Euclidean distance between two points pt1 and pt2.
 */
function EuclideanDistance(pt1, pt2) {
    var dx = pt2.x - pt1.x;
    var dy = pt2.y - pt1.y;
    var dz = pt2.z - pt1.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
module.exports = {
    FreeHandUniRecognizer
}