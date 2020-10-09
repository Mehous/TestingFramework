 /* eslint-disable */ 
/**
 *  RubineSheng recognizer, July 2020
 *  
 * 
 * 
 * 
 * 
 * The Rubine recognizer extended to three dimensions with 16 Features .
 *  No probability calculation for the classification, and no rejection with the Mahalanobis distance.
 * 
 */

const Recognizer = require('../framework/recognizers/Recognizer').Recognizer;
//Name of the recognizer
const name = "RubineShengRecognizer";
//The timer to measure the execution time
const { performance } = require('perf_hooks');

/**
 *  Point Constructor
 */
class Point {
    constructor(x, y, z, t) {
      //(x,y,z,time)
        this.x = x;
        this.y = y;
        this.z = z;
        this.t = t;
    }
}

/**
 *  List of the 16 features used by the Rubine's recognizer
 */
const RubineFeatures = [
    'initial angle on x plane',
    'initial angle on y plane',
    'initial angle on z plane',
    'start to end distance',
    'start to end cosinus angle with respect to plan x',
    'start to end cosinus angle with respect to plan y',
    'start to end cosinus angle with respect to plan z',
    'bounding box diagonal length',
    'bounding box proportion of width',
    'bounding box proportion of height',
    'bounding box proportion of depth',
    'total gesture length',
    'total angle traversed',
    'sum of the squared values of angles traversed',
    'maximum distance between two points',
    'the duration of the gesture',
];

/**
 * Configuration Parameters
 */
const MINIMAL_NUMBER_OF_POINTS = 3;
//The minimal number of points in a gesture
const DEFAULT_MIN_DISTANCE = 0.005;
//The minimal distance between two points 


var _this = {};
_this.gestureClasses = [];
_this.invMatrix = [];
//The inverse matrix
_this.covMatrix = []; 
//The covariance matrix
_this.trained = false;
//Boolean to determine if the recognizer was trained

/**
 * Gesture Sample constructor
 */
class GestureSample {
    constructor(name, points) {
        this.Name = name;
        this.Points = scale(points);
        this.Points = filter(this.Points);
        if (this.Points.length < MINIMAL_NUMBER_OF_POINTS) {
            this.featureVector = [];
        }
        else {
            this.featureVector = [
                F1(this.Points),
                F2(this.Points),
                F3(this.Points),
                F4(this.Points),
                F5(this.Points),
                F6(this.Points),
                F7(this.Points),
                F8(this.Points),
                F9(this.Points),
                F10(this.Points),
                F11(this.Points),
                F12(this.Points),
                F13(this.Points),
                F14(this.Points),
                F15(this.Points),
                F16(this.Points)
            ];
        }
    }
}

/**
 * RubineShengRecognizer  class
 */
class RubineShengRecognizer extends Recognizer {

      constructor(N, dataset) {
        _this.gestureClasses = [];
        _this.invMatrix = [];
        _this.covMatrix = []; 
        _this.trained = false;
        super();
        this.Gestures = new Array();
        if (dataset !== undefined) {
            dataset.getGestureClass().forEach((gesture, key, self) => {
                gesture.getSample().forEach(sample => {
                    this.addGesture(gesture.name, sample);
                });
            });
        }
    }

     /**
     * Add a gesture to the training set
     */
    addGesture(name, gesture, dataset) {
        let points = convert(gesture,dataset);
        if (!this.Gestures.hasOwnProperty(name)) {
            this.Gestures[name] = [];
            _this.gestureClasses.push(name);
        }
        this.Gestures[name].push(new GestureSample(name, points));
        _this.trained = false;
    }

/**
 *  Determine the gesture class of a candidate gesture
 *  
 */
    recognize(sample,dataset) {
        //Convert  data to an array of points
        let points = convert(sample,dataset);

        let t0 = performance.now();
        // start timer
        let bestGestureClass = null;
        let bestScore = -Infinity;
        try {
            // preprocess the sample to represent the candidate gesture
            var candidate = new GestureSample("", points);
        }
        catch{
            var t1 = performance.now();
            return { 'Name': 'No match', 'Time': t1 - t0, 'Score': 0.0 }
        }
        let Res = classify(this.Gestures, candidate);
        bestScore = Res[1]; // best (least) distance
        bestGestureClass = Res[0]; // point-cloud index

        var t1 = performance.now();
        // stop timer

        return (bestGestureClass == null) ? { 'Name': 'No match', 'Time': t1 - t0, 'Score': 0.0 } : { 'Name': bestGestureClass, 'Time': t1 - t0, 'Score': bestScore };
    }

    /**
     * Train the recognizer by computing the common covariance matrix and the weights vectors
     */
    Train() {
        if (!_this.trained) {
            for (let c = 0; c < _this.gestureClasses.length; c += 1) {
                const gestures = this.Gestures[_this.gestureClasses[c]];
                setMeanFeatureVectors(_this.gestureClasses[c], gestures);
                setClassCovarianceMatrix(gestures);
            }
            setCommonCovarianceMatrix(this.Gestures);
            setInvertedMatrix();
            setWeights(this.Gestures);
            _this.trained = true; // ready for recognition
        }
    }

}

/**
 * Find the class of the gesture by computing the best score of the candidate against each gesture class
 */
function classify(Template, candidate) {
    let bestGestureClass = null;
    let bestScore = -Infinity;
    for (let c = 0; c < _this.gestureClasses.length; c += 1) {
        let score = Template[_this.gestureClasses[c]].initialWeight;
        let weightsVector = Template[_this.gestureClasses[c]].weightsVectorCl;
        for (let i = 0; i < weightsVector.length; i += 1)
            score += weightsVector[i] * candidate.featureVector[i];
        if (score > bestScore) {
            bestScore = score;
            bestGestureClass = _this.gestureClasses[c];
        }
    }
    return [bestGestureClass, bestScore];
}


/**
 * Convert the sample data from the dataset to an array containing points
 */
function convert(sample, dataset) {
    let points = [];
    if (dataset == "SHREC2019") {
      //Code for unistroke gestures mutlipath
      sample.paths["Palm"].strokes.forEach((point, stroke_id) => {
          points.push(new Point(point.x, point.y, point.z, point.t, point.stroke_id));
        });
    } 
    //Code for Unistroke Unipath
    else {    
      sample.strokes.forEach((point, stroke_id) => {
          points.push(new Point(point.x, point.y, point.z, point.t, point.stroke_id));
        });
    }
    return points;
  }

/*************************************************************************************************
 * Preprocessing functions
 * 
 */


/**
 * Discard all points <= DEFAULT_MIN_DISTANCE away from the previous point
 */
function filter(points) {
    let newPoints = [];     
    for (let i = 1; i < points.length; i += 1)
        if (computeDistance(points[i - 1], points[i]) > DEFAULT_MIN_DISTANCE)
            newPoints.push(points[i]);
    return newPoints;
}

/**
 * The Distance between two points
 */
function computeDistance(p1, p2) {
    return Math.abs(p2.x - p1.x + p2.y - p1.y + p2.z - p1.z);
}

/**
 * Rescale the gesture
 */
function scale(points) {
    let newPoints = [];
    let minX = +Infinity, maxX = -Infinity;
    let minY = +Infinity, maxY = -Infinity;
    let minZ = +Infinity, maxZ = -Infinity;
    for (let i = 0; i < points.length; i += 1) {
        minX = Math.min(minX, points[i].x);
        minY = Math.min(minY, points[i].y);
        minZ = Math.min(minZ, points[i].z);
        maxX = Math.max(maxX, points[i].x);
        maxY = Math.max(maxY, points[i].y);
        maxZ = Math.max(maxZ, points[i].z);
    }
    let sizeFactor = Math.max(maxX - minX, maxY - minY, maxZ - minZ);
    for (var i = 0; i < points.length; i++) {
        newPoints.push(new Point(
            (points[i].x - minX) / sizeFactor,
            (points[i].y - minY) / sizeFactor,
            (points[i].z - minZ) / sizeFactor,
            points[i].t
        ));
    }
    return newPoints;
}



/********************************************************************************************
 * Training Methods
 * /
//-------------------------------------------------------

/**
 * Calculate the mean feature vector of a gesture class
 */
function setMeanFeatureVectors(gestureClass, gestures) {
    let featureVectors = [];
    for (let g = 0; g < gestures.length; g += 1) {
        featureVectors.push(gestures[g].featureVector);
    }
    gestures.MeanFeatureVector = mean(featureVectors);
}

/**
* Computes the covariance matrix for a given gesture class.
*/
function setClassCovarianceMatrix(gestures) {
    let matrix = [];
    let classMeanVector = gestures.MeanFeatureVector;
    for (let i = 0; i < RubineFeatures.length; i++) {
        matrix[i] = [];
        for (let j = 0; j < RubineFeatures.length; j++) {
            let sum = 0.0;
            for (let k = 0; k < gestures.length; k++) {
                const gestureFeatureVector = gestures[k].featureVector;
                sum += (gestureFeatureVector[i] - classMeanVector[i]) * (gestureFeatureVector[j] - classMeanVector[j]);
            }
            matrix[i][j] = sum;
        }
    }
    gestures.covMatrice = matrix;
}

/**
 * Computes the common covariance matrix of the set.
 * 
 */
function setCommonCovarianceMatrix(GestureSet) {
    let matrix = [];
    for (var i = 0; i < RubineFeatures.length; i++) {
        matrix[i] = [];
        for (let j = 0; j < RubineFeatures.length; j++) {
            let num = 0.0;
            let den = -_this.gestureClasses.length;
            Object.keys(GestureSet).forEach((GestureClass) => {
                let numExamples = GestureSet[GestureClass].length;
                num += (GestureSet[GestureClass].covMatrice)[i][j] / (numExamples - 1);
                den += numExamples;
            });
            matrix[i][j] = num / den;
        }
    }
    _this.covMatrix = matrix;
}

/**
 * Invert the Covariance Matrix
 */
function setInvertedMatrix() {
    _this.invMatrix = invert(_this.covMatrix);
}

/**
 * Compute the weights vector
 */
function setWeights(GestureSet) {
    for (let c = 0; c < _this.gestureClasses.length; c += 1) {
        let classMeanVector = GestureSet[_this.gestureClasses[c]].MeanFeatureVector;
        // compute the weights for each gesture class
        let weightsVector = [];
        for (let j = 0; j < classMeanVector.length; j += 1) {
            let weight = 0.0;
            for (let i = 0; i < classMeanVector.length; i += 1)
                weight += _this.invMatrix[i][j] * classMeanVector[i];
            weightsVector[j] = weight;
        }
        GestureSet[_this.gestureClasses[c]].weightsVectorCl = weightsVector;
        // compute the initial weight for each gesture class
        let initialWeight = 0.0;
        for (let f = 0; f < classMeanVector.length; f += 1)
            initialWeight += weightsVector[f] * classMeanVector[f];
        GestureSet[_this.gestureClasses[c]].initialWeight = -0.5 * initialWeight;
    }
}

/****************************************************************************************************
 * Vectors' opertaions Helpers
 * 
 * 
 */

// copied from http://blog.acipo.com/matrix-inversion-in-javascript/
// retrieved the 04.29.2020
function invert(matrix) {
    let I = []; // identity matrix
    let C = []; // copy of the original matrix
    // initialize the identity matrix and the copy of the original matrix
    for (let i = 0; i < matrix.length; i += 1) {
        I[i] = [];
        C[i] = [];
        for (let j = 0; j < matrix.length; j += 1) {
            if (i == j) I[i][j] = 1.0;
            else I[i][j] = 0.0;
            C[i][j] = matrix[i][j];
        }
    }
    // perform elementary row operations
    for (let i = 0; i < matrix.length; i += 1) {
        let e = C[i][i]; // element on the diagonal
        if (e == 0) {
            for (let ii = i + 1; ii < matrix.length; ii += 1) {
                if (C[ii][i] != 0) {
                    for (let j = 0; j < matrix.length; j += 1) {
                        e = C[i][j];
                        C[i][j] = C[ii][j];
                        C[ii][j] = e;
                        e = I[i][j];
                        I[i][j] = I[ii][j];
                        I[ii][j] = e;
                    }
                    break;
                }
            }
            e = C[i][i];
            if (e == 0) return -1; // ERROR: not invertable
        }
        for (let j = 0; j < matrix.length; j += 1) {
            C[i][j] = C[i][j] / e;
            I[i][j] = I[i][j] / e;
        }
        for (let ii = 0; ii < matrix.length; ii += 1) {
            if (ii == i) continue;
            e = C[ii][i];
            for (let j = 0; j < matrix.length; j += 1) {
                C[ii][j] -= e * C[i][j];
                I[ii][j] -= e * I[i][j];
            }
        }
    }
    // now, C should be the identity and I should be the inverse
    return I;
}

/**
 *  The mean vector
 */
function mean(vectors) {
    return scalarDiv(sum(vectors), vectors.length);
}

/**
 * Scalar division 
 */
function scalarDiv(vector, den) {
    let res = [];
    for (let i = 0; i < vector.length; i += 1) res[i] = vector[i] / den;
    return res;
}

/**
 * Sum of vectors
 */
function sum(vectors) {
    if (vectors.length > 0) {
        let result = [];
        for (let i = 0; i < vectors[0].length; i += 1) result[i] = 0.0;
        for (let i = 0; i < vectors.length; i++) {
            result = add(result, vectors[i]);
        }
        return result;
    }
    else {
        return 0;
    }
}

/**
 * Adddition of two vectors
 */
function add(v1, v2) {
    let result = [];
    for (let i = 0; i < v1.length; i++) {
        result[i] = v1[i] + v2[i];
    }
    return result;
}
/**
 * Return the bounding-box of a gesture
 */
function getMinMax(points) {
    let min = new Point(+Infinity, +Infinity, +Infinity);
    let max = new Point(-Infinity, -Infinity, -Infinity);
    for (let i = 0; i < points.length; i += 1) {
        if (points[i].x < min.x) min.x = points[i].x;
        if (points[i].x > max.x) max.x = points[i].x;
        if (points[i].y < min.y) min.y = points[i].y;
        if (points[i].y > max.y) max.y = points[i].y;
        if (points[i].z < min.z) min.z = points[i].z;
        if (points[i].z > max.z) max.z = points[i].z;
    }
    return [min, max];
}


/************************************************************************************
 * Features Methods
 * 
 * 
 */

/**
 * Cos alpha of the initial angle
 */
function F1(points) {
    let startPoint = points[0];
    let thirdPoint = points[2];
    if (startPoint.x == thirdPoint.x && startPoint.y == thirdPoint.y && startPoint.z == thirdPoint.z) {
        thirdPoint = points[4];
    }
    let pX = thirdPoint.x - startPoint.x;
    let pY = thirdPoint.y - startPoint.y;
    let pZ = thirdPoint.z - startPoint.z;
    let tmp = Math.sqrt(pX * pX + pY * pY + pZ * pZ);

    return pX / tmp;
}

/**
 * Sin alpha of the initial angle
 */
function F2(points) {
    let startPoint = points[0];
    let thirdPoint = points[2];
    if (startPoint.x == thirdPoint.x && startPoint.y == thirdPoint.y && startPoint.z == thirdPoint.z) {
        thirdPoint = points[4];
    }
    let pX = thirdPoint.x - startPoint.x;
    let pY = thirdPoint.y - startPoint.y;
    let pZ = thirdPoint.z - startPoint.z;
    let tmp = Math.sqrt(pX * pX + pY * pY + pZ * pZ);

    return pY / tmp;
}

/**
 * Sin alpha of the initial angle
 */
function F3(points) {
    let startPoint = points[0];
    let thirdPoint = points[2];
    if (startPoint.x == thirdPoint.x && startPoint.y == thirdPoint.y && startPoint.z == thirdPoint.z) {
        thirdPoint = points[4];
    }
    let pX = thirdPoint.x - startPoint.x;
    let pY = thirdPoint.y - startPoint.y;
    let pZ = thirdPoint.z - startPoint.z;
    let tmp = Math.sqrt(pX * pX + pY * pY + pZ * pZ);

    return pZ / tmp;
}

/**
 * The distance between the first and the last point
 */
function F4(points) {
    let startPoint = points[0];
    let endPoint = points[points.length - 1];
    pX = endPoint.x - startPoint.x;
    pY = endPoint.y - startPoint.y;
    pZ = endPoint.z - startPoint.z;
    return Math.sqrt(pX * pX + pY * pY + pZ * pZ);;
}

/**
 * The cosine of the angle between the first and the last point
 */
function F5(points) {
    let startPoint = points[0];
    let endPoint = points[points.length - 1];
    pX = endPoint.x - startPoint.x;
    pY = endPoint.y - startPoint.y;
    pZ = endPoint.z - startPoint.z;
    tmp = Math.sqrt(pX * pX + pY * pY + pZ * pZ);

    return tmp == 0 ? pX : pX / tmp;
}

/**
 * The sine of the angle between the first and the last point
 */
function F6(points) {
    let startPoint = points[0];
    let endPoint = points[points.length - 1];
    pX = endPoint.x - startPoint.x;
    pY = endPoint.y - startPoint.y;
    pZ = endPoint.z - startPoint.z;
    tmp = Math.sqrt(pX * pX + pY * pY + pZ * pZ);

    return tmp == 0 ? pY : pY / tmp;
}

/**
 * The sine of the angle between the first and the last point
 */
function F7(points) {
    let startPoint = points[0];
    let endPoint = points[points.length - 1];
    pX = endPoint.x - startPoint.x;
    pY = endPoint.y - startPoint.y;
    pZ = endPoint.z - startPoint.z;
    tmp = Math.sqrt(pX * pX + pY * pY + pZ * pZ);

    return tmp == 0 ? pZ : pZ / tmp;
}

/**
 * The length of the bounding box diagonal
 */
function F8(points) {
    let pMinMax = getMinMax(points);
    pX = pMinMax[1].x - pMinMax[0].x;
    pY = pMinMax[1].y - pMinMax[0].y;
    pZ = pMinMax[1].z - pMinMax[0].z;
    return Math.sqrt(pX * pX + pY * pY + pZ * pZ);
}

/**
 * The bounding box proportion of width
 */
function F9(points) {
    let pMinMax = getMinMax(points);
    pX = pMinMax[1].x - pMinMax[0].x;
    return pX / F8(points);
}

/**
 * The bounding box proportion of height
 */
function F10(points) {
    let pMinMax = getMinMax(points);
    pY = pMinMax[1].y - pMinMax[0].y;
    return pY / F8(points);
}

/**
 * The bounding box proportion of depth
 */
function F11(points) {
    let pMinMax = getMinMax(points);
    pZ = pMinMax[1].z - pMinMax[0].z;
    return pZ / F8(points);
}
/**
 * The total gesture length
 */
function F12(points) {
    let total_length = 0;
    for (let i = 0; i < points.length - 1; i++) {
        deltaX = points[i + 1].x - points[i].x;
        deltaY = points[i + 1].y - points[i].y;
        deltaZ = points[i + 1].z - points[i].z;
        let sum = deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ;
        total_length += Math.sqrt(sum);
    }
    return total_length;
}

/**
 * The totale angle traversed
 */
function F13(points) {
    let total_angle = 0;
    for (let i = 1; i < points.length; i++) {
        let delta = new Point(
            points[i].x - points[i - 1].x,
            points[i].y - points[i - 1].y,
            points[i].z - points[i - 1].z
        );
        if (i >= 3) {
            let prevDelta = new Point(
                points[i - 1].x - points[i - 2].x,
                points[i - 1].y - points[i - 2].y,
                points[i - 1].z - points[i - 2].z
            );
            let angle = Math.acos((delta.x * prevDelta.x + prevDelta.y * delta.y + prevDelta.z * delta.z) /
                Math.sqrt(delta.x * delta.x + delta.y * delta.y + delta.z * delta.z));
            total_angle += angle;
        }
    }
    return total_angle;
}
/**
 * The sum of the squared value of the angle
 */
function F14(points) {
    let total_sqr_angle = 0;
    for (let i = 1; i < points.length; i++) {
        let delta = new Point(
            points[i].x - points[i - 1].x,
            points[i].y - points[i - 1].y,
            points[i].z - points[i - 1].z
        );
        if (i >= 3) {
            let prevDelta = new Point(
                points[i - 1].x - points[i - 2].x,
                points[i - 1].y - points[i - 2].y,
                points[i - 1].z - points[i - 2].z
            );
            let angle = Math.acos((delta.x * prevDelta.x + prevDelta.y * delta.y + prevDelta.z * delta.z) /
                Math.sqrt(delta.x * delta.x + delta.y * delta.y + delta.z * delta.z));

            total_sqr_angle += angle * angle;
        }
    }
    return total_sqr_angle;
}

/**
 *The maximum distance between two points of the gesture.
 */
function F15(points) {
    let maxDist = -Infinity;
    for (let i = 0; i < points.length - 1; i++) {
        deltaX = points[i + 1].x - points[i].x;
        deltaY = points[i + 1].y - points[i].y;
        deltaZ = points[i + 1].z - points[i].z;
        let sum = Math.sqrt(deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ);
        maxDist = Math.max(maxDist, sum);
    }
    return maxDist;
}

/** 
* The duration of the gesture.
*/
function F16(points) {
    return points[points.length - 1].t - points[0].t;
}


module.exports = {
    RubineShengRecognizer
};