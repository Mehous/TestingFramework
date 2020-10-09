 /* eslint-disable */ 
/**
 * Load the data from files and create a dataset 
 * 
 */


const path = require('path');
const fs = require('fs');
const GestureSet = require('../framework/gestures/GestureSet').GestureSet;
const GestureClass = require('../framework/gestures/GestureClass').GestureClass;

function loadDataset(name, directory) {
    let gestureSet = new GestureSet(name);
    let dirPath = path.join(__dirname, directory);
    let gestureIndex = 0;
    fs.readdirSync(dirPath).forEach((Domain) => {
        if(Domain==name){
        let DomainDirPath= path.join(dirPath, Domain);
    fs.readdirSync(DomainDirPath).forEach((user) => {
        let userDirPath= path.join(DomainDirPath, user);
        fs.readdirSync(userDirPath).forEach((gesture) => {
            let rawGesturePath = path.join(userDirPath, gesture);
            let strokeData = JSON.parse(fs.readFileSync(rawGesturePath));

            gesture = gesture.split(".")[0].split("-");
            let gestureName = gesture[0].split("#")[0];
            if(gestureSet.getGestureClass().has(gestureName)){
                gestureSet.getGestureClass().get(gestureName).addSample(strokeData);
            }
            else{
                let gestureClass = new GestureClass(gestureName, gestureIndex);
                gestureIndex+=1;
                gestureClass.addSample(strokeData);
                gestureSet.addGestureClass(gestureClass);
            }
        });
    });
}
});
    
    return gestureSet;
}

module.exports = {
    loadDataset
};