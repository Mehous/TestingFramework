/**
 * Load the data from files and create a dataset 
 * 
 */

const path = require('path');
const fs = require('fs');

const GestureSet = require('../framework/gestures/GestureSet').GestureSet;
const GestureClass = require('../framework/gestures/GestureClass').GestureClass;

function loadDataset(name, directory) {
    let gestureSet = {};
    let dirPath = path.join(__dirname, directory);
   
    fs.readdirSync(dirPath).forEach((Domain) => {
        if(Domain==name){
        let DomainDirPath= path.join(dirPath, Domain);
    fs.readdirSync(DomainDirPath).forEach((user) => {
        let gestureIndex = 0;
        let userDirPath= path.join(DomainDirPath, user);
        fs.readdirSync(userDirPath).forEach((gesture) => {
            let rawGesturePath = path.join(userDirPath, gesture);
            let strokeData = JSON.parse(fs.readFileSync(rawGesturePath));

            gesture = gesture.split(".")[0].split("-");
            let gestureName = gesture[0].split("#")[0];
            if (Object.keys(gestureSet).includes(user)) {
                if (gestureSet[user].getGestureClass().has(gestureName)) {
                    gestureSet[user].getGestureClass().get(gestureName).addSample(strokeData);
                }
                else {
                    let gestureClass = new GestureClass(gestureName, gestureIndex);
                    gestureIndex += 1;
                    gestureClass.addSample(strokeData);
                    gestureSet[user].addGestureClass(gestureClass);
                }
            }
            else {
                let newgestureSet = new GestureSet(user);                  
                gestureSet[user]=newgestureSet;
                if (gestureSet[user].getGestureClass().has(gestureName)) {
                    gestureSet[user].getGestureClass().get(gestureName).addSample(strokeData);
                }
                else {
                    let gestureClass = new GestureClass(gestureName, gestureIndex);
                    gestureIndex += 1;
                    gestureClass.addSample(strokeData);
                    gestureSet[user].addGestureClass(gestureClass);
                }
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