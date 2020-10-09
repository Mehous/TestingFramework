 /* eslint-disable */ 
const fs = require('fs');

// Testing framework ==========================================================================

/***************************************************************************************************************/
/*                                                    User-Independent test                                    */
/*                                                                                                              */
/****************************************************************************************************************/


//Function which creates raw results files and display raw/time results on the console
const PrintResults = function (results, s,recognizer,datasetName) {
  let MinT=0;
  var stream = fs.createWriteStream(
    'F:\\Idhem_Msi_GE63\\Documents\\UCL\\Experience\\ISS2020\\Results\\' + recognizer+'_'+datasetName +
      '_' + s + '.txt' );
  stream.once('open', function (fd) {
    for (let r = 0; r < results.length; r++) {
      
      stream.write('#### ' +  RECOGNIZERS[r] + ' #### number of repetition: ' + R +', N: ' + s + '\n' );
      stream.write('#### gesture set #### ' + JSON.stringify(Array.from(dataset.getGestureClass().keys())) +'\n');
      if (
        recognizer.name == "Rubine3DRecognizer" ||
        recognizer.name == "RubineShengRecognizer"
      ) {
        MinT = 2;
      } else {
        MinT = 1;
      }
      for (let i = 0; i < results[r][0].length && i < results[r][1].length; i++) {
        stream.write('Recognition accuracy with ' + (i + MinT) + ' training templates per gesture: ' +
         (results[r][0][i] * 100).toFixed(2) +' (' + results[r][1][i].toFixed(2) +'ms)' + '\n' );
        stream.write('Confusion matrice: ' + JSON.stringify(results[r][2][i]) + '\n');
        stream.write('Raw_Data: ' + JSON.stringify(results[r][4][i]) + '\n');
        stream.write('Raw_Time: ' + JSON.stringify(results[r][5][i]) + '\n');
        stream.write('--------' + '\n');        
      }
     
      process.stdout.write('\n');
      process.stdout.write('Rate ');
      results[r][0].forEach((e) => process.stdout.write(`${(e * 100).toFixed(2)},`)
      );
      process.stdout.write('\n');
      process.stdout.write('Time ');
      results[r][1].forEach((e) => process.stdout.write(`${e.toFixed(4)},`));
      process.stdout.write('\n');
      stream.write('--------' + '\n');
      stream.write('Execution Time by class: :' + '\n');
      for ( let i = 0;i < results[r][0].length && i < results[r][1].length; i++ ) {
        stream.write(JSON.stringify(results[r][3][i]) + '\n');
      }
    }
    stream.write('--------' + '\n');
    stream.end();
  });
};

const StartUserIndepTesting = function (dataset, s, Recognizer) {
  const recognition_rates = [];
  const execution_time = [];
  const confusion_matrices = [];
  const cl_execution_time = [];
  const Test_RawData = [];
  const Test_RawTime = [];
  let MinT = 0;
  // Rubine Should start with 2 templates
  if (
    Recognizer.name == "Rubine3DRecognizer" ||
    Recognizer.name == "RubineShengRecognizer"
  ) {
    MinT = 2;
  } else {
    MinT = 1;
  }
  for (let tg = MinT; tg < Math.min(dataset.getMinTemplate(), MAXT); tg += 1) {
    // for each T
    let current_recognition_score = 0;
    let current_execution_time = 0.0;
    const class_execution_time = [];
    dataset.getGestureClass().forEach((gesture, key, self) => {
      class_execution_time[gesture.index] = 0;
    });
    const current_confusion_matrice = new Array(dataset.G)
      .fill(0)
      .map(() => new Array(dataset.G).fill(0));
    const template_Test_Raw = [];
    const template_Time_Raw = [];

    for (let r = 0; r < R; r += 1) {
      // repeat R time
      let Recognized_Gesture = 0;
      let execution_time = 0;

      const recognizer = new Recognizer(s);
      let candidates;
      if (dataset.name == "SHREC2019") {
        candidates = SelectCandidates2(dataset);
      } else {
        candidates = SelectCandidates(dataset);
      }

      const training_templates = [];
      candidates.forEach((val) => {
        training_templates.push([val]);
      });
      for (let t = 0; t < tg; t += 1) {
        // add tg strokeData per gestureClass
        let index = 0;
        dataset.getGestureClass().forEach((gesture, key, self) => {
          let training = -1;
          while (
            training == -1 ||
            training_templates[index].includes(training) ||
            gesture.getSample()[training].subject ==
              gesture.getSample()[training_templates[index][0]].subject
          )
            training = GetRandomNumber(0, gesture.getSample().length);
          training_templates[index].push(training);
          recognizer.addGesture(
            gesture.name,
            gesture.getSample()[training],
            dataset.name
          );
          index++;
        });
      }

      // Train Rubine recognizer (calculate Matrices and wieghts vectors)
      if (
        Recognizer.name == "Rubine3DRecognizer" ||
        Recognizer.name == "RubineShengRecognizer"
      ) {
        try {
          recognizer.Train(); //code that causes an error of non invertible covariance matrix occurence rate ~0.00001
        } catch (e) {
          continue; //Ignore this instance of the test
        }
      }
      // Recognition after tg training templates
      let c = 0;
      dataset.getGestureClass().forEach((gesture, key, self) => {
        const toBeTested = gesture.getSample()[candidates[c]];
        const result = recognizer.recognize(toBeTested, dataset.name);
        if (dataset.getGestureClass().has(result.Name)) {
          const result_index = dataset.getGestureClass().get(result.Name).index;
          current_confusion_matrice[gesture.index][result_index] += 1;
        }
        Recognized_Gesture += result.Name === gesture.name ? 1 : 0;
        execution_time += result.Time;
        current_recognition_score += result.Name === gesture.name ? 1 : 0;
        current_execution_time += result.Time;
        class_execution_time[gesture.index] += result.Time;
        c++;
      });
      template_Test_Raw.push(Recognized_Gesture);
      template_Time_Raw.push(execution_time);
    }
    recognition_rates.push(current_recognition_score);
    execution_time.push(current_execution_time);
    confusion_matrices.push(current_confusion_matrice);
    cl_execution_time.push(class_execution_time);
    Test_RawData.push(template_Test_Raw);
    Test_RawTime.push(template_Time_Raw);
  }
  for (let i = 0; i < recognition_rates.length; i++) {
    recognition_rates[i] = recognition_rates[i] / (R * dataset.G);
    execution_time[i] = execution_time[i] / (R * dataset.G);
    Object.keys(cl_execution_time[i]).forEach((row) => {
      cl_execution_time[i][row] = cl_execution_time[i][row] / 100;
    });
  }
  return [
    [
      recognition_rates,
      execution_time,
      confusion_matrices,
      cl_execution_time,
      Test_RawData,
      Test_RawTime,
    ],
  ];
};

/*******************************************************************************************************************/
 /*                                                   UserDependent Test                                           */
 /*                                                                                                                */
 /******************************************************************************************************************/

let PrintResults_UserDep = function (results, s,recognizer,datasetName) {
  let MinT=0;
  var stream = fs.createWriteStream('F:\\Idhem_Msi_GE63\\Documents\\UCL\\Experience\\ISS2020\\Results\\' +
    +'Dep_' +recognizer+'_'+datasetName +'_' + s +'.txt' );
  stream.once('open', function (fd) {
    if (
      recognizer.name == "Rubine3DRecognizer" ||
      recognizer.name == "RubineShengRecognizer"
    ) {
      MinT = 2;
    } else {
      MinT = 1;
    }
    for (let r = 0; r < results.length; r++) {
      stream.write( '#### ' + RECOGNIZERS[r] +' #### number of repetition: ' +R +', N: ' +s +'\n');
      stream.write('#### gesture set #### ' + JSON.stringify( Array.from(dataset[Object.keys(dataset)[0]].getGestureClass().keys())) +
          '\n');
        
      for ( let i = 0;i < results[r][5].length && i < results[r][6].length; i++) {
        stream.write('/********************************************************/' + '\n');
        stream.write('Recognition accuracy with ' +(i + MinT) +' training templates per gesture: ' +
        (results[r][5][i] * 100).toFixed(2) +' (' +results[r][6][i].toFixed(2) + 'ms)' +'\n');
        stream.write('Confusion matrice: \n');
        for (let l = 0; l < results[r][4][i].length; l++) {
          stream.write(JSON.stringify(results[r][4][i][l]) + '\n');
        }
        stream.write('--------' + '\n');
        stream.write('Execution Time by class: :' + '\n');
        stream.write(JSON.stringify(results[r][3][i]) + '\n');
        for (k = 0; k < Object.keys(dataset).length; k++) {
          stream.write('--------' + '\n');
          stream.write('For user: ' + Object.keys(dataset)[k] + '\n');
          stream.write(
            'Recognition accuracy: ' +
              (results[r][0][i][k] * 100).toFixed(2) +
              ' (' +
              results[r][1][i][k].toFixed(3) +
              'ms)' +
              '\n'
          );
          stream.write(
            'Confusion matrice: ' + JSON.stringify(results[r][2][i][k]) + '\n'
          );
          stream.write(
            'Raw_Data: ' + JSON.stringify(results[r][7][i][k]) + '\n'
          );
          stream.write(
            'Raw_Time: ' + JSON.stringify(results[r][8][i][k]) + '\n'
          );
        }
      }
      //    results[r][3].forEach(e => process.stdout.write(`${e},`));
      process.stdout.write('\n');
      process.stdout.write('Rate ');
      results[r][5].forEach((e) =>
        process.stdout.write(`${(e * 100).toFixed(2)},`)
      );
      process.stdout.write('\n');
      process.stdout.write('Time ');
      results[r][6].forEach((e) => process.stdout.write(`${e.toFixed(4)},`));
      process.stdout.write('\n');
      stream.write('--------' + '\n');
      stream.end();
    }
  });
};

let StartUserDepTesting = function (dataset, s, Recognizer) {
  const recognition_rates = [];
  const execution_time = [];
  const confusion_matrices = [];
  const cl_execution_time = [];
  const Global_confusion_matrices = [];
  const Global_Rates = [];
  const Global_execution_times = [];
  let MinimTempNumb = 0;
  const Test_RawData = [];
  const Test_RawTime = [];
  Object.keys(dataset).forEach((user) => {
    MinimTempNumb = dataset[user].getMinTemplate();
  });

   // Rubine Should start with 2 templates
   if (
    Recognizer.name == "Rubine3DRecognizer" ||
    Recognizer.name == "RubineShengRecognizer"
  ) {
    MinT = 2;
  } else {
    MinT = 1;
  }
  for (let tg = MinT; tg < Math.min(MinimTempNumb, MAXT + 1); tg = tg + 1) {
    // for each T
    const recognition_rates_User = [];
    const execution_time_User = [];
    const confusion_matrices_User = [];
    let Global_Rate = 0.0;
    let Global_execution_time = 0.0;
    const Global_confusion_matrix = [];
    const class_execution_time = [];
    const user_rawdata_set = [];
    const user_rawtime_set = [];


    dataset[[Object.keys(dataset)[0]]]
      .getGestureClass()
      .forEach((gesture, key, self) => {
        class_execution_time[gesture.index] = 0;
      });

    for (let i = 0; i < dataset[Object.keys(dataset)[0]].G; i++) {
      Global_confusion_matrix[i] = [];
      for (let j = 0; j < dataset[Object.keys(dataset)[0]].G; j++) {
        Global_confusion_matrix[i][j] = 0;
      }
    }

    Object.keys(dataset).forEach((user) => {
      let current_recognition_score = 0;
      let current_execution_time = 0.0;

      const current_confusion_matrice = new Array(dataset[user].G)
        .fill(0)
        .map(() => new Array(dataset[user].G).fill(0));
      const template_Test_Raw = [];
      const Time_Test_Raw = [];
      for (let r = 0; r < R; r++) {
        // repeat R time
        let Recognized_Gesture = 0;
        // Don't add the dataset, otherwise the candidate gesture will be trained
        const recognizer = new Recognizer(s);

        const candidates = SelectCandidates(dataset[user]);
        const training_templates = [];
        candidates.forEach((val) => {
          training_templates.push([val]);
        });
        for (let t = 0; t < tg; t++) {
          // add tg strokeData per gestureClass
          let index = 0;
          dataset[user].getGestureClass().forEach((gesture, key, self) => {
            let training = -1;
            while (
              training == -1 ||
              training_templates[index].includes(training)
            )
              training = GetRandomNumber(0, gesture.getSample().length);
            training_templates[index].push(training);
            recognizer.addGesture(gesture.name, gesture.getSample()[training], dataset.name);
            index++;
          });
        }

        // Train Rubine recognizer (calculate Matrices and wieghts vectors)
      if (
        Recognizer.name == "Rubine3DRecognizer" ||
        Recognizer.name == "RubineShengRecognizer"
      ) {
        try {
          recognizer.Train(); //code that causes an error of non invertible covariance matrix occurence rate ~0.00001
        } catch (e) {
          continue; //Ignore this instance of the test
        }
      }
        // Recognition after tg training templates
        let c = 0;
        dataset[user].getGestureClass().forEach((gesture, key, self) => {
          const toBeTested = gesture.getSample()[candidates[c]];
          const result = recognizer.recognize(toBeTested, dataset.name);
          if (dataset[user].getGestureClass().has(result.Name)) {
            const result_index = dataset[user].getGestureClass().get(result.Name).index;
            current_confusion_matrice[gesture.index][result_index] += 1;
            Global_confusion_matrix[gesture.index][result_index] += 1;
          }
          Recognized_Gesture += result.Name === gesture.name ? 1 : 0;
          current_recognition_score += result.Name === gesture.name ? 1 : 0;
          Global_Rate += result.Name === gesture.name ? 1 : 0;
          current_execution_time += result.Time;
          Global_execution_time += result.Time;
          class_execution_time[gesture.index] += result.Time;
          c++;
        });
        template_Test_Raw.push(Recognized_Gesture);
        Time_Test_Raw.push(current_execution_time);
      }
      user_rawdata_set.push(template_Test_Raw);
      user_rawtime_set.push(Time_Test_Raw);
      recognition_rates_User.push(current_recognition_score);
      execution_time_User.push(current_execution_time);
      confusion_matrices_User.push(current_confusion_matrice);
    });

    for (let i = 0; i < class_execution_time.length; i++) {
      class_execution_time[i] = class_execution_time[i] / (R * Object.keys(dataset).length);
    }
    for (let i = 0; i < recognition_rates_User.length; i++) {
      recognition_rates_User[i] = recognition_rates_User[i] / (R * dataset[Object.keys(dataset)[0]].G);
      execution_time_User[i] = execution_time_User[i] / (R * dataset[Object.keys(dataset)[0]].G);
    }
    Global_Rate = Global_Rate / (R * Object.keys(dataset).length * dataset[Object.keys(dataset)[0]].G);
    Global_execution_time = (Global_execution_time * 1.0) / (R * Object.keys(dataset).length * dataset[Object.keys(dataset)[0]].G * 1.0);
    recognition_rates.push(recognition_rates_User);
    execution_time.push(execution_time_User);
    confusion_matrices.push(confusion_matrices_User);
    cl_execution_time.push(class_execution_time);
    Global_Rates.push(Global_Rate);
    Global_execution_times.push(Global_execution_time);
    Global_confusion_matrices.push(Global_confusion_matrix);
    Test_RawData.push(user_rawdata_set);
    Test_RawTime.push(user_rawtime_set);
  }

  return [[
      recognition_rates,
      execution_time,
      confusion_matrices,
      cl_execution_time,
      Global_confusion_matrices,
      Global_Rates,
      Global_execution_times,
      Test_RawData,
      Test_RawTime,
    ],
  ];
};

/**********************************************************************************************************/
 /*                                   Select gesture candidates                                           */
 /*********************************************************************************************************/
let SelectCandidates2 = function (dataset) {
  const candidates = [];
  dataset.getGestureClass().forEach((value, key, self) => {
    let num = -1;
    do {
      num = GetRandomNumber(0, value.getSample().length);
    } while (value.getSample()[num].subject == 1);
    candidates.push(num);
  });
  return candidates;
};

let SelectCandidates = function (dataset) {
  const candidates = [];
  dataset.getGestureClass().forEach((value, key, self) => {
    candidates.push(GetRandomNumber(0, value.getSample().length));
  });
  return candidates;
};

/**
 * Generate a random number between min and max
 * 
 */
let GetRandomNumber = function (min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
};

/***************************************************************************************************************/
/*                                            Test Function                                                    */
/***************************************************************************************************************/
var RECOGNIZERS = [];
let dataset;
let MAXT;
let R;

exports.Start = function (Config) {
  R = Config.R;
  Config.Recognizer.forEach((recognizer) => {
    RECOGNIZERS = [recognizer.name];
    Config.Datasets.forEach((data_set) => {
      dataset = Config.datasetConverter[data_set.Name][Config.Scenario].loadDataset(data_set.Name, data_set.Folder);
      if (Config.Scenario == 0) {
        MAXT = data_set.MaxT;
      } else {
        MAXT = data_set.MaxTDep;
      }
      for (let s = 4; s < 17; s = s * 2) {
        if (Config.Scenario == 0) {
          let result = StartUserIndepTesting(dataset, s, recognizer);
          PrintResults(result, s, recognizer.name, dataset.name);
        } else {
          let result = StartUserDepTesting(dataset, s, recognizer);
          PrintResults_UserDep(result, s, recognizer.name, data_set.Name);
        }
        console.log(recognizer.name + "_" + data_set.Name + "_" + s);
      }
      process.stdout.write(`\n`);
    });
  });
};
