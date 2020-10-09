class GestureSet {

    constructor(name) {
        this.name = name;
        this.gestures = new Map();
        this.G =0;
    }

    addGestureClass(gestureClass){
        this.gestures.set(gestureClass.name,gestureClass);
        this.G +=1;
    }

    getGestureClass(){
        return this.gestures;
    }

    getMinTemplate(){
        let TperG = Infinity;

        for (var gestureClass of this.gestures.values()) {
            TperG = Math.min(TperG, gestureClass.TperG);
        }
        return TperG;
    }

}

module.exports = {
    GestureSet
};