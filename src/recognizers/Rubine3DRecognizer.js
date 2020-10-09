 /* eslint-disable */ 
 /**
 *  Rubine3D recognizer, July 2020
 *  
 * 
 * 
 * 
 * 
 * The Rubine recognizer extended to three dimensions with 13 Features, by projecting the gesture on the three 2D orthogonal planes (XY,YZ,ZX).
 *  No probability calculation for the classification, and no rejection with the Mahalanobis distance.
 * 
 */


const Recognizer = require('../framework/recognizers/Recognizer').Recognizer;
//Name of the recognizer
const name = "Rubine3DRecognizer";
//The timer to measure the execution time
const { performance } = require('perf_hooks');


/**
 *  Point Constructor
 */
class Point {
    constructor(x, y, t) {
        //(x,y,time)
        this.x = x;
        this.y = y;
        this.t = t;
    }
}

/**
 *  List of the 13 features used by the Rubine's recognizer
 */
const RubineFeatures = [
    'initial angle cosine',
    'initial angle sine',
    'bounding box length',
    'bounding box diagonal angle',
    'start to end distance',
    'start to end cosinus angle',
    'start to end sinus angle',
    'total gesture length',
    'total angle traversed',
    'sum of the absolute values of angles traversed',
    'sum of the squared values of angles traversed',
    'maximum (squared) speed',
    'path duration'
];

/**
 * Configuration Parameters
 */
const MINIMAL_NUMBER_OF_POINTS = 3;
//The minimal number of points in a gesture
const DEFAULT_MIN_DISTANCE = 0.005;
//The minimal distance between two points 
const DEFAULT_WEIGHTS = [0.4, 0.3, 0.3];
//The weight affected to each plane (XY,YZ,ZX)

//Encode planes
const PLANE_XY = 0;
const PLANE_YZ = 1;
const PLANE_ZX = 2;

var _this = {};
_this.gestureClasses = [];
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
                F13(this.Points)
            ];
        }
    }
}

/**
 * Rubine3D Recogniser class
 */
class Rubine3DRecognizer extends Recognizer {

    constructor(N, dataset) {
        _this.gestureClasses = [];
        _this.invMatrix = [];
        _this.covMatrix = []; 
        _this.trained = false;
        super();
        this.GesturesXY = new Array();
        this.GesturesYZ = new Array();
        this.GesturesZX = new Array();
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
    addGesture(name, data, dataset) {
        let points = convert(data, dataset);
        if (!this.GesturesXY.hasOwnProperty(name) && !this.GesturesYZ.hasOwnProperty(name) && !this.GesturesZX.hasOwnProperty(name)) {
            this.GesturesXY[name] = [];
            this.GesturesYZ[name] = [];
            this.GesturesZX[name] = [];
            _this.gestureClasses.push(name);
        }
        this.GesturesXY[name].push(new GestureSample(name, points[PLANE_XY]));
        this.GesturesYZ[name].push(new GestureSample(name, points[PLANE_YZ]));
        this.GesturesZX[name].push(new GestureSample(name, points[PLANE_ZX]));
        _this.trained = false;
    }

/**
 *  Determine the gesture class of a candidate gesture
 *  
 */
    recognize(sample ,dataset) {

        let points = convert(sample,dataset);
        // preprocess the sample to represent the candidate gesture
        let t0 = performance.now();
        // start timer
        let bestGestureClass = null;
        let bestScore = -Infinity;
        try {
            var candidateXY = new GestureSample("", points[0]);
            var candidateYZ = new GestureSample("", points[1]);
            var candidateZX = new GestureSample("", points[2]);
        }
        catch{
            var t1 = performance.now();
            return { 'Name': 'No match', 'Time': t1 - t0, 'Score': 0.0 }
        }
        let Res = classify([this.GesturesXY, this.GesturesYZ, this.GesturesZX], [candidateXY, candidateYZ, candidateZX]);
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
                let gestures = [];
                gestures.push(this.GesturesXY[_this.gestureClasses[c]]);
                gestures.push(this.GesturesYZ[_this.gestureClasses[c]]);
                gestures.push(this.GesturesZX[_this.gestureClasses[c]]);
                for (let k = 0; k < 3; k += 1) {
                    setMeanFeatureVectors(_this.gestureClasses[c], gestures[k]);
                    setClassCovarianceMatrix(gestures[k]);
                }
            }
            setCommonCovarianceMatrix([this.GesturesXY, this.GesturesYZ, this.GesturesZX]);
            setInvertedMatrix();
            setWeights([this.GesturesXY, this.GesturesYZ, this.GesturesZX]);
            _this.trained = true; // ready for recognition
        }
    }
}

/**
 * Find the class of the gesture by computing the best score of the candidate against each gesture class
 * 
 * Apply a Heuristic if the result is different for each plane.
 * 
 */
function classify(Template, candidate) {
    let Results = [];
    let Classes = [];
    for (let k = 0; k < 3; k++) {
        let bestGestureClass = null;
        let bestScore = -Infinity;
        // compute the similarity score of the candidate against each gesture class
        for (let c = 0; c < _this.gestureClasses.length; c += 1) {
            let score = Template[k][_this.gestureClasses[c]].initialWeight;
            let weightsVector = Template[k][_this.gestureClasses[c]].weightsVectorCl;
            for (let i = 0; i < weightsVector.length; i += 1)
                score += weightsVector[i] * candidate[k].featureVector[i];
            if (score > bestScore) {
                bestScore = score;
                bestGestureClass = _this.gestureClasses[c];
            }
        }
        Results.push({ bestGestureClass, bestScore });
    }
    //The Heuristic
    if (Results[0].bestGestureClass == Results[1].bestGestureClass && Results[1].bestGestureClass == Results[2].bestGestureClass) {
        return [Results[0].bestGestureClass, Results[0].bestScore];
    }
    else {
        bestScore = -Infinity;
        Classes.push(Results[0].bestGestureClass);
        if (Results[0].bestGestureClass != Results[1].bestGestureClass) {
            Classes.push(Results[1].bestGestureClass);
            if (Results[2].bestGestureClass != Results[1].bestGestureClass && Results[2].bestGestureClass != Results[0].bestGestureClass) {
                Classes.push(Results[2].bestGestureClass);
            }
        } else if (Results[0].bestGestureClass != Results[2].bestGestureClass) {
            Classes.push(Results[2].bestGestureClass);
        }
        for (let c = 0; c < Classes.length; c += 1) {
            let WeightedScore = 0;
            for (let k = 0; k < 3; k++) {
                let score = Template[k][Classes[c]].initialWeight;
                let weightsVector = Template[k][Classes[c]].weightsVectorCl;
                for (let i = 0; i < weightsVector.length; i += 1)
                    score += weightsVector[i] * candidate[k].featureVector[i];
                WeightedScore += score * DEFAULT_WEIGHTS[k];
            }
            if (WeightedScore > bestScore) {
                bestScore = WeightedScore;
                bestGestureClass = Classes[c];
            }
        }

        return [bestGestureClass, bestScore];
    }

}

/**
 * Convert the sample data from the dataset to an arrays containing points on each plane.
 */
function convert(sample, dataset) {
    let points = [[], [], []];
    if (dataset == "SHREC2019") {
      //Code for unistroke mutlipath gestures 
      sample.paths["Palm"].strokes.forEach((point, stroke_id) => {    
        points[PLANE_XY].push(new Point(point.x, point.y, point.t, point.stroke_id));
        points[PLANE_YZ].push(new Point(point.y, point.z, point.t, point.stroke_id));
        points[PLANE_ZX].push(new Point(point.z, point.x, point.t, point.stroke_id));
    });
     //Code for Unistroke unipath gestures
    } else {    
        sample.strokes.forEach((point, stroke_id) => {  
            points[PLANE_XY].push(new Point(point.x, point.y, point.t, point.stroke_id));
            points[PLANE_YZ].push(new Point(point.y, point.z, point.t, point.stroke_id));
            points[PLANE_ZX].push(new Point(point.z, point.x, point.t, point.stroke_id));
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
    return Math.abs(p2.x - p1.x + p2.y - p1.y);
}

/**
 * Rescale the gesture
 */
function scale(points) {
    let newPoints = [];
    let minX = +Infinity, maxX = -Infinity;
    let minY = +Infinity, maxY = -Infinity;
    for (let i = 0; i < points.length; i += 1) {
        minX = Math.min(minX, points[i].x);
        minY = Math.min(minY, points[i].y);
        maxX = Math.max(maxX, points[i].x);
        maxY = Math.max(maxY, points[i].y);
    }
    let sizeFactor = Math.max(maxX - minX, maxY - minY);
    for (var i = 0; i < points.length; i++) {
        newPoints.push(new Point(
            (points[i].x - minX) / sizeFactor,
            (points[i].y - minY) / sizeFactor,
            points[i].t
        ));
    }
    return newPoints;
}




/*********************************************************************************************************
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
 * Computes the common covariance matrix of the set on each plane.
 * 
 */
function setCommonCovarianceMatrix(GestureSet) {
    for (let k = 0; k < 3; k++) {
        let matrix = [];
        for (var i = 0; i < RubineFeatures.length; i++) {
            matrix[i] = [];
            for (let j = 0; j < RubineFeatures.length; j++) {
                let num = 0.0;
                let den = -_this.gestureClasses.length;
                Object.keys(GestureSet[k]).forEach((GestureClass) => {
                    let numExamples = GestureSet[k][GestureClass].length;
                    num += (GestureSet[k][GestureClass].covMatrice)[i][j] / (numExamples - 1);
                    den += numExamples;
                });
                matrix[i][j] = num / den;
            }
        }
        _this.covMatrix[k] = matrix;
    }
}

/**
 * Invert the Covariance Matrices
 */
function setInvertedMatrix() {
    for (let k = 0; k < 3; k++) {
        _this.invMatrix[k] = invert(_this.covMatrix[k]);
            if ( _this.invMatrix[k]==-1){
                console.log("+1");                        
            }
    }
}

/**
 * Compute the weights vectors
 */
function setWeights(GestureSet) {
    for (let k = 0; k < 3; k++) {
        for (let c = 0; c < _this.gestureClasses.length; c += 1) {
            let classMeanVector = GestureSet[k][_this.gestureClasses[c]].MeanFeatureVector;

            // compute the weights for each gesture class
            let weightsVector = [];
            for (let j = 0; j < classMeanVector.length; j += 1) {
                let weight = 0.0;
                for (let i = 0; i < classMeanVector.length; i += 1){                   
                        weight += _this.invMatrix[k][i][j] * classMeanVector[i];                   
                }
                weightsVector[j] = weight;
            }
            GestureSet[k][_this.gestureClasses[c]].weightsVectorCl = weightsVector;
            // compute the initial weight for each gesture class
            let initialWeight = 0.0;
            for (let f = 0; f < classMeanVector.length; f += 1)
                initialWeight += weightsVector[f] * classMeanVector[f];
            GestureSet[k][_this.gestureClasses[c]].initialWeight = -0.5 * initialWeight;
        }
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
    let min = new Point(+Infinity, +Infinity);
    let max = new Point(-Infinity, -Infinity);
    for (let i = 0; i < points.length; i += 1) {
        if (points[i].x < min.x) min.x = points[i].x;
        if (points[i].x > max.x) max.x = points[i].x;
        if (points[i].y < min.y) min.y = points[i].y;
        if (points[i].y > max.y) max.y = points[i].y;
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
    if (startPoint.x == thirdPoint.x && startPoint.y == thirdPoint.y) {
        thirdPoint = points[4];
    }
    let pX = thirdPoint.x - startPoint.x;
    let pY = thirdPoint.y - startPoint.y;
    let tmp = Math.sqrt(pX * pX + pY * pY);

    return pX / tmp;
}

/**
 * Sin alpha of the initial angle
 */
function F2(points) {
    let startPoint = points[0];
    let thirdPoint = points[2];
    if (startPoint.x == thirdPoint.x && startPoint.y == thirdPoint.y) {
        thirdPoint = points[4];
    }
    let pX = thirdPoint.x - startPoint.x;
    let pY = thirdPoint.y - startPoint.y;
    let tmp = Math.sqrt(pX * pX + pY * pY);

    return pY / tmp;
}

/**
 * The length of the bounding box diagonal
 */
function F3(points) {
    let pMinMax = getMinMax(points);
    pX = pMinMax[1].x - pMinMax[0].x;
    pY = pMinMax[1].y - pMinMax[0].y;
    return Math.sqrt(pX * pX + pY * pY);
}

/**
 * The angle of the bounding box diagonal
 */
function F4(points) {
    let pMinMax = getMinMax(points);
    pX = pMinMax[1].x - pMinMax[0].x;
    pY = pMinMax[1].y - pMinMax[0].y;
    return Math.atan2(pY, pX);
}


/**
 * The distance between the first and the last point
 */
function F5(points) {
    let startPoint = points[0];
    let endPoint = points[points.length - 1];
    pX = endPoint.x - startPoint.x;
    pY = endPoint.y - startPoint.y;
    tmp = Math.sqrt(pX * pX + pY * pY);
    return Math.sqrt(pX * pX + pY * pY);;
}

/**
 * The cosine of the angle between the first and the last point
 */
function F6(points) {
    let startPoint = points[0];
    let endPoint = points[points.length - 1];
    pX = endPoint.x - startPoint.x;
    pY = endPoint.y - startPoint.y;
    tmp = Math.sqrt(pX * pX + pY * pY);

    return tmp == 0 ? pX : pX / tmp;
}

/**
 * The sine of the angle between the first and the last point
 */
function F7(points) {
    let startPoint = points[0];
    let endPoint = points[points.length - 1];
    pX = endPoint.x - startPoint.x;
    pY = endPoint.y - startPoint.y;
    tmp = Math.sqrt(pX * pX + pY * pY);

    return tmp == 0 ? pY : pY / tmp;
}


/**
 *  The total gesture length
 */
function F8(points) {
    let total_length = 0;
    for (let i = 0; i < points.length - 1; i++) {
        deltaX = points[i + 1].x - points[i].x;
        deltaY = points[i + 1].y - points[i].y;
        let sum = deltaX * deltaX + deltaY * deltaY;
        total_length += Math.sqrt(sum);
    }
    return total_length;
}


/**
 *  The total angle traversed
 */
function F9(points) {
    let total_angle = 0;
    for (let i = 1; i < points.length; i++) {
        let delta = new Point(
            points[i].x - points[i - 1].x,
            points[i].y - points[i - 1].y,
            points[i].t - points[i - 1].t
        );
        if (i >= 3) {
            let prevDelta = new Point(
                points[i - 1].x - points[i - 2].x,
                points[i - 1].y - points[i - 2].y
            );
            let angle = Math.atan2(
                delta.x * prevDelta.y - prevDelta.x * delta.y,
                delta.x * prevDelta.x - delta.y * prevDelta.y
            );
            total_angle += angle;
        }
    }
    return total_angle;
}

/**
 *  The sum of the absolute angle at each point
 */
function F10(points) {
    let total_abs_angle = 0;
    for (let i = 1; i < points.length; i++) {
        let delta = new Point(
            points[i].x - points[i - 1].x,
            points[i].y - points[i - 1].y,
            points[i].t - points[i - 1].t
        );
        if (i >= 3) {
            let prevDelta = new Point(
                points[i - 1].x - points[i - 2].x,
                points[i - 1].y - points[i - 2].y
            );
            let angle = Math.atan2(
                delta.x * prevDelta.y - prevDelta.x * delta.y,
                delta.x * prevDelta.x - delta.y * prevDelta.y
            );
            total_abs_angle += Math.abs(angle);
        }
    }
    return total_abs_angle;
}

/**
 * The sum of the squared value of the angles traversed
 */
function F11(points) {
    let total_sqr_angle = 0;
    for (let i = 1; i < points.length; i++) {
        let delta = new Point(
            points[i].x - points[i - 1].x,
            points[i].y - points[i - 1].y,
            points[i].t - points[i - 1].t
        );
        if (i >= 3) {
            let prevDelta = new Point(
                points[i - 1].x - points[i - 2].x,
                points[i - 1].y - points[i - 2].y
            );
            let angle = Math.atan2(
                delta.x * prevDelta.y - prevDelta.x * delta.y,
                delta.x * prevDelta.x - delta.y * prevDelta.y
            );
            total_sqr_angle += angle * angle;
        }
    }
    return total_sqr_angle;
}

/**
 * The maximum speed (squared) of the gesture.
 */
function F12(points) {
    let maxSpeed = -Infinity;
    for (let i = 0; i < points.length - 1; i++) {
        deltaX = points[i + 1].x - points[i].x;
        deltaY = points[i + 1].y - points[i].y;
        deltaT = points[i + 1].t - points[i].t;
        if (deltaT == 0) deltaT = 1;
        let sum = deltaX * deltaX + deltaY * deltaY;
        maxSpeed = Math.max(maxSpeed, sum / (deltaT * deltaT));
    }
    return maxSpeed;
}

/** 
* The duration of the gesture.
*/
function F13(points) {
    return points[points.length - 1].t - points[0].t;
}


module.exports = {
    Rubine3DRecognizer
};