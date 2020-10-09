 /* eslint-disable */ 
const { Start } = require("./benchmark.js");

// Testing parameters =======================================================================================
// Recognizer
const configuration = {};

//Select the scenario (0 User-independent/1 User-dependent)
const scenario=0;

//The list of the recognizers to test
const Recognizer = [
//require("./recognizers/P3DollarRecognizer").P3DollarRecognizer,
  require("./recognizers/Q3DollarRecognizer").Q3DollarRecognizer,
 // require("./recognizers/P3DollarPlusRecognizer").P3DollarPlusRecognizer,
 // require("./recognizers/FDollarRecognizer").FDollarRecognizer,
//require("./recognizers/FreeHandUniRecognizer").FreeHandUniRecognizer,
// require("./recognizers/Rubine3DRecognizer").Rubine3DRecognizer,
//  require("./recognizers/RubineShengRecognizer").RubineShengRecognizer  
];


/*The list of the Datasets and the maximum number of templates (Training templates + the candidate gesture)
 for the user-independent (MaxT) and user-dependent (MaxTDep) scenarios*/
const datasets = [
  { Folder: "SHREC2019", Name: "SHREC2019", MaxT: 17 },
  { Folder: "3DTCGS", Name: "TCGS", MaxT: 12},
  { Folder: "3DMadLabSD", Name: "Domain1", MaxT: 17, MaxTDep:9 },
 /* { Folder: "3DMadLabSD", Name: "Domain1", MaxT: 17, MaxTDep:9 },
  { Folder: "3DMadLabSD", Name: "Domain1", MaxT: 17, MaxTDep:9 },
  { Folder: "3DMadLabSD", Name: "Domain4", MaxT: 17, MaxTDep:9 }*/
];

//Dataset converter for every dataset and scenario
const DSetConverter = {
  SHREC2019:[require('./datasets/UnifiedConverter')],
  TCGS:[require('./datasets/UnifiedConverter')],
  Domain1:[require('./datasets/UnifiedConverterSketch'),
  require('./datasets/UnifiedConverterSketchUserDep')],
/*  Domain2:[require('./datasets/UnifiedConverterSketch'),//
  require('./datasets/UnifiedConverterSketchUserDep')],
  Domain3:[require('./datasets/UnifiedConverterSketch'),//
  require('./datasets/UnifiedConverterSketchUserDep')],
  Domain4:[require('./datasets/UnifiedConverterSketch'),//
  require('./datasets/UnifiedConverterSketchUserDep')]*/
};

// Other parameters
let R = 100; //Repetitions

//The configuration
configuration.Scenario = scenario;
configuration.Recognizer = Recognizer;
configuration.Datasets = datasets;
configuration.datasetConverter = DSetConverter;
configuration.R = R;

//Launch the Test
Start(configuration);
